////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////
import { camelCase, pascalCase } from "change-case";
import { strict as assert } from "assert";

import { TemplateContext } from "../context";
import {
  CppVar,
  CppFunc,
  CppFuncProps,
  CppMemInit,
  CppCtor,
  CppMethod,
  CppClass,
  CppDecls,
  CppCtorProps,
} from "../cpp";
import { bindModel, BoundSpec, Type } from "../bound-model";

// Code assumes this is a unique name that is always in scope to refer to the Napi::Env.
// Callbacks need to ensure this is in scope. Functions taking Env arguments must use this name.
const env = "napi_env_var_ForBindGen";

const node_callback_info = new CppVar("const Napi::CallbackInfo&", "info");
const envFromCbInfo = `auto ${env} = info.Env();\n`;

function tryWrap(body: string) {
  return `try {
                ${body}
            } catch (const std::exception& ex) {
                throwNodeException(${env}, ex);
            }
        `;
}

class CppNodeMethod extends CppMethod {
  constructor(name: string, props?: CppFuncProps) {
    super(name, "Napi::Value", [node_callback_info], props);
  }

  definition() {
    return super.definition(`
            ${envFromCbInfo}
            ${tryWrap(this.body)}
        `);
  }
}

class CppNodeCtor extends CppCtor {
  constructor(name: string, props?: CppCtorProps) {
    super(name, [node_callback_info], props);
  }

  definition() {
    // Note: if we ever want need to try to catch failing member inits, need to
    // change CppCtor to support function-try blocks.
    return super.definition(`
            ${envFromCbInfo}
            ${tryWrap(this.body)}
        `);
  }
}

function pushRet<T, U extends T>(arr: T[], elem: U) {
  arr.push(elem);
  return elem;
}

class NodeAddon extends CppClass {
  inits: string[] = [];
  exports: Record<string, string> = {};

  constructor() {
    super("RealmAddon");
    this.withCrtpBase("Napi::Addon");
  }

  generateMembers() {
    this.addMethod(
      new CppCtor(this.name, [new CppVar("Napi::Env", env), new CppVar("Napi::Object", "exports")], {
        body: `
            ${this.inits.join("\n")}

            DefineAddon(exports, {
                ${Object.entries(this.exports)
                  .map(([name, val]) => `InstanceValue(${name}, ${val}.Value(), napi_enumerable),`)
                  .join("\n")}
            });
            `,
      }),
    );
  }

  addClass(cls: NodeObjectWrap) {
    const mem = this.memberNameFor(cls);
    this.members.push(new CppVar("Napi::FunctionReference", mem));
    this.inits.push(`${mem} = Persistent(${cls.name}::makeCtor(${env}));`);
    this.exports[`${cls.name}::jsName`] = mem;
  }

  memberNameFor(cls: CppClass) {
    return `m_cls_${cls.name}_ctor`;
  }

  accessCtor(cls: CppClass) {
    return `${env}.GetInstanceData<${this.name}>()->${this.memberNameFor(cls)}`;
  }
}

class NodeObjectWrap extends CppClass {
  ctor: CppCtor;
  constructor(public jsName: string) {
    super(`Node_${jsName}`);
    this.withCrtpBase("Napi::ObjectWrap");

    this.ctor = this.addMethod(
      new CppNodeCtor(this.name, {
        mem_inits: [new CppMemInit(this.bases[0], "info")],
      }),
    );

    this.members.push(new CppVar("constexpr const char*", "jsName", { value: `"${jsName}"`, static: true }));
  }
}

/**
 * Converts a Type object to its spelling in C++, eg to be used to declare an argument or template parameter.
 *
 * TODO, consider moving this to live on the Type classes themselves.
 */
function toCpp(type: Type): string {
  switch (type.kind) {
    case "Pointer":
      return `${toCpp(type.type)}*`;
    case "Opaque":
      return type.name;
    case "Const":
      return `${toCpp(type.type)} const`;
    case "Ref":
      return `${toCpp(type.type)}&`;
    case "Template":
      return `${type.name}<${type.args.map(toCpp).join(", ")}>`;

    case "Primitive":
    case "Enum":
    case "Class":
    case "Struct":
      return type.name;

    case "Func":
      // We currently just produce a lambda which has an unutterable type.
      // We could make a UniqueFunction for the type, but we may want to
      // use other types instead, such as std::function in some cases.
      // This will be more important when implementing interfaces.
      assert.fail("Cannot convert function types to Cpp type names");
      break;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

function convertPrimToNode(type: string, expr: string): string {
  switch (type) {
    case "void":
      return `((void)(${expr}), ${env}.Undefined())`;

    case "bool":
      return `Napi::Boolean::New(${env}, ${expr})`;

    case "double":
    case "float":
    case "int":
    case "int32_t":
      return `Napi::Number::New(${env}, ${expr})`;

    case "int64_t":
    case "uint64_t":
      return `Napi::BigInt::New(${env}, ${expr})`;

    case "std::string_view":
    case "std::string":
      return `([&] (auto&& sd) {
                return Napi::String::New(${env}, sd.data(), sd.size());
            }(${expr}))`;

    case "StringData":
      return `([&] (StringData sd) {
                return Napi::String::New(${env}, sd.data(), sd.size());
            }(${expr}))`;

    case "OwnedBinaryData":
      return convertPrimToNode("BinaryData", `${expr}.get()`);

    case "BinaryData":
      return `([&] (BinaryData bd) -> Napi::Value {
                auto arr = Napi::ArrayBuffer::New(${env}, bd.size());
                memcpy(arr.Data(), bd.data(), bd.size());
                return arr;
            }(${expr}))`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}
function convertPrimFromNode(type: string, expr: string) {
  // TODO consider using coercion using ToString, ToNumber, ToBoolean.
  switch (type) {
    case "void":
      return `((void)(${expr}))`;

    case "bool":
      return `(${expr}).As<Napi::Boolean>().Value()`;

    case "double":
      return `(${expr}).As<Napi::Number>().DoubleValue()`;
    case "float":
      return `(${expr}).As<Napi::Number>().FloatValue()`;

    case "int":
    case "int32_t":
      return `(${expr}).As<Napi::Number>().Int32Value()`;

    case "int64_t":
      return `extractInt64FromNode(${expr})`;
    case "uint64_t":
      return `extractUint64FromNode(${expr})`;

    case "StringData":
    case "std::string_view":
    case "std::string":
      return `(${expr}).As<Napi::String>().Utf8Value()`;

    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (const Napi::Value& v) -> ${type} {
                auto buf = v.As<Napi::ArrayBuffer>();
                return BinaryData(static_cast<const char*>(buf.Data()), buf.ByteLength());
            })(${expr})`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}

function convertToNode(type: Type, expr: string): string {
  const c = convertToNode; // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimToNode(type.name, expr);
    case "Pointer":
      return `[&](auto* ptr){ return ptr ? ${c(type.type, "*ptr")}: ${env}.Null(); } (${expr})`;

    case "Opaque":
      return `Napi::External<${type.name}>::New(${env}, &${expr})`;

    case "Const":
    case "Ref":
      return c(type.type, expr);

    case "Template":
      // For now, all templates we care about only take a single argument, so doing this here is simpler.
      assert.equal(type.args.length, 1);
      const inner = type.args[0];

      switch (type.name) {
        case "std::shared_ptr":
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_FROM_SHARED_${inner.name}(${env}, ${expr})`;
          return c(inner, `*${expr}`);
        case "util::Optional":
          return `[&] (auto&& opt) { return !opt ? ${env}.Null() : ${c(inner, "*opt")}; }(${expr})`;
        case "std::vector":
          // TODO try different ways to create the array to see what is fastest.
          // eg, try calling push() with and without passing size argument to New().
          return `[&] (auto&& vec) {
                        auto out = Napi::Array::New(${env}, vec.size());
                        uint32_t i = 0;
                        for (auto&& e : vec) {
                            out[i++] = ${c(inner, "e")};
                        }
                        return out;
                    }(${expr})`;
      }
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      assert(!type.sharedPtrWrapped, `should not directly convert from ${type.name} without shared_ptr wrapper`);
      return `NODE_FROM_CLASS_${type.name}(${env}, ${expr})`;

    case "Struct":
      return `NODE_FROM_STRUCT_${type.name}(${env}, ${expr})`;

    case "Func":
      // TODO: see if we want to try to propagate a function name in rather than always making them anonymous.
      return `
            [&] (auto&& cb) -> Napi::Value {
                if constexpr(std::is_constructible_v<bool, decltype(cb)>) {
                    if (!bool(cb)) {
                        return ${env}.Null();
                    }
                }
                return Napi::Function::New(${env}, [cb] (const Napi::CallbackInfo& info) {
                    auto ${env} = info.Env();
                    ${tryWrap(`
                        return ${convertToNode(
                          type.ret,
                          `cb(
                            ${type.args.map((arg, i) => convertFromNode(arg.type, `info[${i}]`)).join(", ")}
                        )`,
                        )};
                    `)}
                });
            }(${expr})`;

    case "Enum":
      return `[&]{
                static_assert(sizeof(${type.name}) <= sizeof(int32_t), "we only support enums up to 32 bits");
                return Napi::Number::New(${env}, int(${expr}));
            }()`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}
function convertFromNode(type: Type, expr: string): string {
  const c = convertFromNode; // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimFromNode(type.name, expr);
    case "Pointer":
      return `[&] (Napi::Value v) { return (v.IsNull() || v.IsUndefined()) ? nullptr : &${c(
        type.type,
        "v",
      )}; }(${expr})`;
    case "Opaque":
      return `*((${expr}).As<Napi::External<${type.name}>>().Data())`;

    case "Const":
    case "Ref":
      return c(type.type, expr);

    case "Template":
      // For now, all templates we care about only take a single argument, so doing this here is simpler.
      assert.equal(type.args.length, 1);
      const inner = type.args[0];

      switch (type.name) {
        case "std::shared_ptr":
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_TO_SHARED_${inner.name}(${expr})`;
          return c(inner, `*${expr}`);
        case "util::Optional":
          return `[&] (Napi::Value val) {
                        using Opt = util::Optional<${toCpp(inner)}>;
                        return (val.IsNull() || val.IsUndefined()) ? Opt() : Opt(${c(inner, "val")});
                    }(${expr})`;
        case "std::vector":
          return `[&] (Napi::Array vec) {
                auto out = std::vector<${toCpp(inner)}>();

                const uint32_t length = vec.Length();
                out.reserve(length);
                for (uint32_t i = 0; i < length; i++) {
                    out.push_back(${c(inner, "vec[i]")});
                }
                return out;
            }((${expr}).As<Napi::Array>())`;
      }
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      if (type.sharedPtrWrapped) return `*NODE_TO_SHARED_${type.name}(${expr})`;
      return `NODE_TO_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `NODE_TO_STRUCT_${type.name}(${expr})`;

    case "Func":
      // TODO see if we ever need to do any conversion from Napi::Error exceptions to something else.
      // TODO need to handle null/undefined here. A bit tricky since we don't know the real type in the YAML.
      // TODO need to consider different kinds of functions:
      // - functions called inline (or otherwise called from within a JS context (currently implemented)
      // - async functions called from JS thread (need to use MakeCallback() rather than call)
      // - async functions called from other thread that don't need to wait for JS to return
      // - async functions called from other thread that must wait for JS to return (anything with non-void return)
      //     - This has a risk of deadlock if not done correctly.
      // Note: putting the FunctionReference in a shared_ptr because some of these need to be put into a std::function
      // which requires copyability, but FunctionReferences are move-only.
      return `
                [cb = std::make_shared<Napi::FunctionReference>(Napi::Persistent(${expr}.As<Napi::Function>()))]
                (${type.args.map(({ name, type }) => `${toCpp(type)} ${name}`).join(", ")}) -> ${toCpp(type.ret)} {
                    auto ${env} = cb->Env();
                    Napi::HandleScope hs(${env});
                    try {
                        return ${convertFromNode(
                          type.ret,
                          `cb->Call({
                            ${type.args.map(({ name, type }) => convertToNode(type, name)).join(", ")}
                        })`,
                        )};
                    } catch (Napi::Error& e) {
                        // Populate the cache of the message now to ensure it is safe for any C++ code to call what().
                        (void)e.what();
                        throw;
                    }
                }`;

    case "Enum":
      return `${type.name}((${expr}).As<Napi::Number>().DoubleValue())`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

class NodeCppDecls extends CppDecls {
  inits: string[] = [];
  addon = pushRet(this.classes, new NodeAddon());
  constructor(spec: BoundSpec) {
    super();

    for (const struct of spec.records) {
      const fieldsFrom = [];
      const fieldsTo = [];
      for (const field of struct.fields) {
        const jsFieldName = camelCase(field.name);
        const cppFieldName = field.name;
        fieldsFrom.push(`out.Set("${jsFieldName}", ${convertToNode(field.type, `in.${cppFieldName}`)});`);
        // TODO: consider doing lazy conversion of some types to JS, only if the field is accessed.
        fieldsTo.push(`{
                    auto field = obj.Get("${jsFieldName}");
                    if (!field.IsUndefined()) {
                        out.${cppFieldName} = ${convertFromNode(field.type, "field")};
                    } else if constexpr (${field.required ? "true" : "false"}) {
                        throw Napi::TypeError::New(${env}, "${struct.name}::${jsFieldName} is required");
                    }
                }`);
      }

      this.free_funcs.push(
        new CppFunc(
          `NODE_FROM_STRUCT_${struct.name}`,
          "Napi::Value",
          [new CppVar("Napi::Env", env), new CppVar(struct.name, "in")],
          {
            body: `
                auto out = Napi::Object::New(${env});
                ${fieldsFrom.join("")}
                return out;
            `,
          },
        ),
      );
      this.free_funcs.push(
        new CppFunc(`NODE_TO_STRUCT_${struct.name}`, struct.name, [new CppVar("Napi::Value", "val")], {
          body: `
              auto ${env} = val.Env();
              if (!val.IsObject())
                  throw Napi::TypeError::New(${env}, "expected an object");
              auto obj = val.As<Napi::Object>();
              auto out = ${struct.name}();
              ${fieldsTo.join("")}
              return out;
          `,
        }),
      );
    }
    for (const specClass of spec.classes) {
      // TODO need to do extra work to enable JS implementation of interfaces
      const jsName = pascalCase(specClass.name);
      const cppClassName = specClass.name;
      const cls = pushRet(this.classes, new NodeObjectWrap(jsName));

      let descriptors: string[] = [];

      const self = specClass.needsDeref ? "(*m_val)" : "(m_val)";

      descriptors = [];

      if (cppClassName == "Mixed") {
        cls.members.push(new CppVar("std::string", "m_buffer"));
      }

      for (const method of specClass.methods) {
        const jsName = camelCase(method.unique_name);
        const cppMeth = cls.addMethod(new CppNodeMethod(jsName, { static: method.isStatic }));
        descriptors.push(`${method.isStatic ? "Static" : "Instance"}Method<&${cppMeth.qualName()}>("${jsName}")`);

        const callPrefix = method.isConstructor
          ? cppClassName
          : method.isStatic
          ? `${cppClassName}::${method.name}`
          : `${self}.${method.name}`;
        const args = method.sig.args.map((a, i) => convertFromNode(a.type, `info[${i}]`));

        cppMeth.body += `
                    if (info.Length() != ${args.length})
                        throw Napi::TypeError::New(${env}, "expected ${args.length} arguments");
        `;

        if (cppClassName == "Mixed") {
          // TODO make this less of a special case.
          if (method.unique_name == "from_string") {
            assert.equal(args.length, 1);
            cppMeth.body += `
                auto ret = ${convertToNode(method.sig.ret, "Mixed()")};
                auto self = Unwrap(ret.ToObject());
                self->m_buffer = ${args};
                self->m_val = Mixed(self->m_buffer);
                return ret;
              `;
          } else if (method.unique_name == "from_binary") {
            assert.equal(args.length, 1);
            cppMeth.body += `
                auto ret = ${convertToNode(method.sig.ret, `Mixed(${args})`)};
                ret.ToObject().Set("_keepAlive", info[0]);
                return ret;
              `;
          }
        } else {
          cppMeth.body += `return ${convertToNode(method.sig.ret, `${callPrefix}(${args})`)};`;
        }
      }

      if (specClass.iterable) {
        const cppMeth = cls.addMethod(new CppNodeMethod("Symbol_iterator"));
        descriptors.push(`InstanceMethod<&${cppMeth.qualName()}>(Napi::Symbol::WellKnown(${env}, "iterator"))`);
        cppMeth.body += `
            if (info.Length() != 0)
                throw Napi::TypeError::New(${env}, "expected 0 arguments");

            auto jsIt = Napi::Object::New(${env});
            jsIt.Set("_keepAlive", info.This());
            jsIt.Set("next", Napi::Function::New(napi_env_var_ForBindGen,
                [it = ${self}.begin(), end = ${self}.end()] (const Napi::CallbackInfo& info) mutable {
                    const auto ${env} = info.Env();

                    auto ret = Napi::Object::New(${env});
                    if (it == end) {
                        ret.Set("done", Napi::Boolean::New(${env}, true));
                    } else {
                        ret.Set("value", ${convertToNode(specClass.iterable, "*it")});
                        ++it;
                    }
                    return ret;
                }));

            return jsIt;
        `;
      }

      for (const [cppPropName, type] of Object.entries(specClass.properties)) {
        const jsName = camelCase(cppPropName);
        const cppMeth = cls.addMethod(new CppNodeMethod(jsName));
        cppMeth.body += `return ${convertToNode(type, `${self}.${cppPropName}()`)};`;
        descriptors.push(`InstanceAccessor<&${cppMeth.qualName()}>("${jsName}")`);
      }

      cls.ctor.body += `
            if (info.Length() != 1 || !info[0].IsExternal())
                throw Napi::TypeError::New(${env}, "need 1 external argument");
        `;

      if (specClass.sharedPtrWrapped) {
        const ptr = `std::shared_ptr<${cppClassName}>`;
        cls.members.push(new CppVar(ptr, "m_val"));
        cls.ctor.body += `m_val = std::move(*info[0].As<Napi::External<${ptr}>>().Data());`;
        this.free_funcs.push(
          new CppFunc(`NODE_TO_SHARED_${cppClassName}`, `const ${ptr}&`, [new CppVar("Napi::Value", "val")], {
            body: `return ${cls.name}::Unwrap(val.ToObject())->m_val;`,
          }),
        );
        this.free_funcs.push(
          new CppFunc(
            `NODE_FROM_SHARED_${cppClassName}`,
            "Napi::Value",
            [new CppVar("Napi::Env", env), new CppVar(ptr, "ptr")],
            { body: `return ${this.addon.accessCtor(cls)}.New({Napi::External<${ptr}>::New(${env}, &ptr)});` },
          ),
        );
      } else {
        cls.members.push(new CppVar(cppClassName, "m_val"));
        cls.ctor.body += `m_val = std::move(*info[0].As<Napi::External<${cppClassName}>>().Data());`;

        this.free_funcs.push(
          new CppFunc(`NODE_TO_CLASS_${cppClassName}`, `${cppClassName}&`, [new CppVar("Napi::Value", "val")], {
            attributes: "[[maybe_unused]]",
            body: `return ${cls.name}::Unwrap(val.ToObject())->m_val;`,
          }),
        );
        this.free_funcs.push(
          new CppFunc(
            `NODE_FROM_CLASS_${cppClassName}`,
            "Napi::Value",
            [new CppVar("Napi::Env", env), new CppVar(cppClassName, "val")],
            {
              attributes: "[[maybe_unused]]",
              body: `return ${this.addon.accessCtor(cls)}.New({Napi::External<${cppClassName}>::New(${env}, &val)});`,
            },
          ),
        );
      }

      cls.addMethod(
        new CppMethod("makeCtor", "Napi::Function", [new CppVar("Napi::Env", env)], {
          static: true,
          body: `return DefineClass(${env}, "${jsName}", { ${descriptors.map((d) => d + ",").join("\n")} });`,
        }),
      );

      this.addon.addClass(cls);
    }

    this.addon.generateMembers();
  }

  outputDefsTo(out: (...parts: string[]) => void) {
    super.outputDefsTo(out);
    out(`\nNODE_API_NAMED_ADDON(realm_cpp, ${this.addon.name})`);
  }
}

export function generateNode({ spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("node_init.cpp", "clang-format");

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of spec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <napi.h>

      namespace realm::js::node {
      namespace {

      // TODO hacks, because we don't yet support defining types with qualified names
      using Scheduler = util::Scheduler;


      // TODO move to header or realm-core
      struct Helpers {
          static TableRef get_table(const SharedRealm& realm, StringData name) {
              return realm->read_group().get_table(name);
          }
          static TableRef get_table(const SharedRealm& realm, TableKey key) {
              return realm->read_group().get_table(key);
          }
      };

      ////////////////////////////////////////////////////////////

      // These helpers are used by the generated code.
      // TODO Consider moving them to a header.

      // TODO consider allowing Number (double) with (u)int64_t.
      int64_t extractInt64FromNode(const Napi::Value& input) {
          bool lossless;
          auto output = input.As<Napi::BigInt>().Int64Value(&lossless);
          if (!lossless)
              throw Napi::RangeError::New(input.Env(), "Value doesn't fit in int64_t");
          return output;
      }
      uint64_t extractUint64FromNode(const Napi::Value& input) {
          bool lossless;
          auto output = input.As<Napi::BigInt>().Uint64Value(&lossless);
          if (!lossless)
              throw Napi::RangeError::New(input.Env(), "Value doesn't fit in uint64_t");
          return output;
      }

      [[noreturn]] REALM_NOINLINE void throwNodeException(Napi::Env& ${env}, const std::exception& e) {
          if (dynamic_cast<const Napi::Error*>(&e))
              throw; // Just allow exception propagation to continue
          // TODO consider throwing more specific errors in some cases.
          // TODO consider using ThrowAsJavaScriptException instead here.
          throw Napi::Error::New(${env}, e.what());
      }

      ////////////////////////////////////////////////////////////
    `);

  new NodeCppDecls(bindModel(spec)).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::node
    `);
}
