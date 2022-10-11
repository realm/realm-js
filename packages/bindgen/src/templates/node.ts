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
import { strict as assert } from "assert";

import { TemplateContext } from "../context";
import { CppVar, CppFunc, CppFuncProps, CppCtor, CppMethod, CppClass, CppDecls } from "../cpp";
import { bindModel, BoundSpec, Class, InstanceMethod, StaticMethod, Property, Type, Primitive } from "../bound-model";

import "../js-passes";

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

class CppNodeFunc extends CppFunc {
  constructor(private addon: NodeAddon, name: string, props?: CppFuncProps) {
    super(name, "Napi::Value", [node_callback_info], props);
  }

  definition() {
    return super.definition(`
            ${envFromCbInfo}
            const auto callBlock = ${this.addon.get()}->startCall();
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
  classes: string[] = [];
  injectables = ["Float", "UUID", "ObjectId", "Decimal128"];

  constructor() {
    super("RealmAddon");
    this.withCrtpBase("Napi::Addon");

    this.members.push(new CppVar("std::deque<std::string>", "m_string_bufs"));
    this.addMethod(
      new CppMethod("wrapString", "const std::string&", [new CppVar("std::string", "str")], {
        attributes: "inline",
        body: `return m_string_bufs.emplace_back(std::move(str));`,
      }),
    );
    this.addMethod(
      new CppMethod("startCall", "auto", [], {
        attributes: "inline",
        body: `return ContainerResizer(m_string_bufs);`,
      }),
    );
  }

  generateMembers() {
    this.injectables.forEach((t) =>
      this.members.push(new CppVar("Napi::FunctionReference", NodeAddon.memberNameFor(t))),
    );
    this.classes.forEach((t) =>
      this.members.push(new CppVar("Napi::FunctionReference", NodeAddon.memberNameForExtractor(t))),
    );
    this.addMethod(
      new CppMethod("injectInjectables", "void", [node_callback_info], {
        body: `
          auto ctors = info[0].As<Napi::Object>();
          ${this.injectables
            .map((t) => `${NodeAddon.memberNameFor(t)} = Napi::Persistent(ctors.Get("${t}").As<Napi::Function>());`)
            .join("\n")}
          ${this.classes
            .map(
              (cls) =>
                `${NodeAddon.memberNameForExtractor(cls)} =
                  Napi::Persistent(${NodeAddon.memberNameFor(cls)}.Value().Get("_extract").As<Napi::Function>());`,
            )
            .join("\n")}
        `,
      }),
    );

    this.addMethod(
      new CppCtor(this.name, [new CppVar("Napi::Env", env), new CppVar("Napi::Object", "exports")], {
        body: `
            ${this.inits.join("\n")}

            DefineAddon(exports, {
                ${Object.entries(this.exports)
                  .map(([name, val]) => `InstanceValue("${name}", ${val}.Value(), napi_enumerable),`)
                  .join("\n")}
                InstanceMethod<&${this.name}::injectInjectables>("injectInjectables"),
            });
            `,
      }),
    );
  }

  addFunc(name: string, props?: CppFuncProps) {
    const func = new CppNodeFunc(this, name, props);
    const mem = NodeAddon.memberNameForFuncId(name);

    this.members.push(new CppVar("Napi::FunctionReference", mem));
    this.inits.push(`${mem} = Persistent(Napi::Function::New<${func.name}>(${env}, "${name}"));`);
    this.exports[name] = mem;
    return func;
  }

  addClass(cls: Class) {
    this.injectables.push(cls.jsName);
    this.classes.push(cls.jsName);
  }

  static memberNameForFuncId(id: string) {
    return `m_func_${id}`;
  }
  static memberNameForExtractor(cls: string | { jsName: string }) {
    if (typeof cls != "string") cls = cls.jsName;
    return `m_cls_${cls}_extractor`;
  }
  static memberNameFor(cls: string | { jsName: string }) {
    if (typeof cls != "string") cls = cls.jsName;
    return `m_cls_${cls}_ctor`;
  }

  accessCtor(cls: string | { jsName: string }) {
    return `${this.get()}->${NodeAddon.memberNameFor(cls)}`;
  }

  accessExtractor(cls: string | { jsName: string }) {
    return `${this.get()}->${NodeAddon.memberNameForExtractor(cls)}`;
  }

  get() {
    return `${env}.GetInstanceData<${this.name}>()`;
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
    case "KeyType":
    case "Opaque":
      return type.name;
    case "Const":
      return `${toCpp(type.type)} const`;
    case "Ref":
      return `${toCpp(type.type)}&`;
    case "RRef":
      return `${toCpp(type.type)}&&`;
    case "Template":
      assert.notEqual(type.name, "AsyncResult", "Should never see AsyncResult here");

      // Nullable is just a marker, not actually a part of the C++ interface.
      if (type.name == "Nullable") return toCpp(type.args[0]);

      const templateMap: Record<string, string> = {
        AsyncCallback: "util::UniqueFunction",
      };
      const cppTemplate = templateMap[type.name] ?? type.name;
      let args;
      if (["util::UniqueFunction", "std::function"].includes(cppTemplate)) {
        // Functions can't normally be toCpp'd because lambda types are unutterable.
        // But if a wrapper type is used, we can do this.
        const func = type.args[0];
        assert.equal(func.kind, "Func" as const);
        args = `${toCpp(func.ret)}(${func.args.map((arg) => toCpp(arg.type)).join(", ")})`;
      } else {
        args = type.args.map(toCpp).join(", ");
      }
      return `${cppTemplate}<${args}>`;

    case "Struct":
    case "Enum":
    case "Class":
      return type.cppName;

    case "Primitive":
      const primitiveMap: Record<string, string> = {
        count_t: "size_t",
        EncryptionKey: "std::vector<char>",
        AppError: "app::AppError",
      };
      return primitiveMap[type.name] ?? type.name;

    case "Func":
      // We currently just produce a lambda which has an unutterable type.
      // We could make a UniqueFunction for the type, but we may want to
      // use other types instead, such as std::function in some cases.
      // This will be more important when implementing interfaces.
      assert.fail(`Cannot convert function types to Cpp type names: ${type}`);
      break;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

function convertPrimToNode(addon: NodeAddon, type: string, expr: string): string {
  switch (type) {
    case "void":
      return `((void)(${expr}), ${env}.Undefined())`;

    case "bool":
      return `Napi::Boolean::New(${env}, ${expr})`;

    case "float":
      return `${addon.accessCtor("Float")}.New({${convertPrimToNode(addon, "double", expr)}})`;

    case "double":
    case "int32_t":
      return `Napi::Number::New(${env}, ${expr})`;

    case "count_t":
      // NOTE: using int64_t cast here to get -1.0 for size_t(-1), aka npos.
      return `Napi::Number::New(${env}, int64_t(${expr}))`;

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

    case "EncryptionKey":
    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (const auto& bd) -> Napi::Value {
                auto arr = Napi::ArrayBuffer::New(${env}, bd.size());
                memcpy(arr.Data(), bd.data(), bd.size());
                return arr;
            }(${expr}))`;
    case "Mixed":
      return `NODE_FROM_Mixed(${env}, ${expr})`;

    case "ObjectId":
    case "UUID":
    case "Decimal128":
      return `${addon.accessCtor(type)}.New({${convertPrimToNode(addon, "std::string", `${expr}.to_string()`)}})`;

    case "AppError":
      // This matches old JS SDK. The C++ type will be changing as part of the unify error handleing project.
      return `([&] (const app::AppError& err) {
                auto jsErr =  Napi::Error::New(${env}, err.message).Value();
                jsErr.Set("code", double(err.error_code.value()));
                return jsErr;
              }(${expr}))`;
    case "std::exception_ptr":
      return `toNodeException(${env}, ${expr})`;
    case "std::error_code":
      return `toNodeErrorCode(${env}, ${expr})`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}
function convertPrimFromNode(addon: NodeAddon, type: string, expr: string): string {
  // TODO consider using coercion using ToString, ToNumber, ToBoolean.
  switch (type) {
    case "void":
      return `((void)(${expr}))`;

    case "bool":
      return `(${expr}).As<Napi::Boolean>().Value()`;

    case "double":
      return `(${expr}).As<Napi::Number>().DoubleValue()`;
    case "float":
      return `(${expr}).As<Napi::Object>().Get("value").As<Napi::Number>().FloatValue()`;

    case "int32_t":
      return `(${expr}).As<Napi::Number>().Int32Value()`;

    case "count_t":
      // NOTE: using Int64 here is important to correctly handle -1.0 aka npos.
      return `size_t((${expr}).As<Napi::Number>().Int64Value())`;

    case "int64_t":
      return `extractInt64FromNode(${expr})`;
    case "uint64_t":
      return `extractUint64FromNode(${expr})`;

    case "std::string":
      return `(${expr}).As<Napi::String>().Utf8Value()`;

    case "StringData":
    case "std::string_view":
      // TODO look into not wrapping if directly converting into an argument.
      return `${addon.get()}->wrapString(${convertPrimFromNode(addon, "std::string", expr)})`;

    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (const Napi::Value& v) -> ${type} {
                auto buf = v.As<Napi::ArrayBuffer>();
                return BinaryData(static_cast<const char*>(buf.Data()), buf.ByteLength());
            })(${expr})`;

    case "EncryptionKey":
      return `([&] (const Napi::Value& v) -> std::vector<char> {
                auto buf = v.As<Napi::ArrayBuffer>();
                const auto data = static_cast<const char*>(buf.Data());
                const auto size = buf.ByteLength();
                if (size == 0) return {};
                return std::vector<char>(data, data + size);
            })(${expr})`;

    case "Mixed":
      return `NODE_TO_Mixed(${env}, ${expr})`;

    case "UUID":
    case "Decimal128":
      return `${type}(${convertPrimFromNode(addon, "std::string", `${expr}.ToString()`)})`;

    // TODO add a StringData overload to the ObjectId ctor in core so this can merge with above.
    case "ObjectId":
      return `${type}(${convertPrimFromNode(addon, "std::string", `${expr}.ToString()`)}.c_str())`;

    case "AppError":
      assert.fail("Cannot convert AppError to C++, only from C++.");
  }
  assert.fail(`unexpected primitive type '${type}'`);
}

function convertToNode(addon: NodeAddon, type: Type, expr: string): string {
  const c = convertToNode.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimToNode(addon, type.name, expr);
    case "Pointer":
      return `[&](auto* ptr){ return ptr ? ${c(type.type, "*ptr")}: ${env}.Null(); } (${expr})`;

    case "Opaque":
      return `Napi::External<${type.name}>::New(${env}, &${expr})`;

    case "Const":
    case "Ref":
    case "RRef": // Note: not explicitly taking advantage of moveability yet. TODO?
      return c(type.type, expr);

    case "KeyType":
      return c(type.type, `(${expr}).value`);

    case "Template":
      // Most templates only take a single argument so do this here.
      const inner = type.args[0];
      switch (type.name) {
        case "std::shared_ptr":
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_FROM_SHARED_${inner.name}(${env}, ${expr})`;
          return c(inner, `*${expr}`);
        case "Nullable":
          return `[&] (auto&& val) { return !val ? ${env}.Null() : ${c(inner, "FWD(val)")}; }(${expr})`;
        case "util::Optional":
          return `[&] (auto&& opt) { return !opt ? ${env}.Undefined() : ${c(inner, "*FWD(opt)")}; }(${expr})`;
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
        case "std::pair":
        case "std::tuple":
          return `
            [&] (auto&& tup) {
                auto out = Napi::Array::New(${env}, ${type.args.length});
                ${type.args.map((arg, i) => `out[${i}u] = ${c(arg, `std::get<${i}>(FWD(tup))`)};`).join("\n")}
                return out;
            }(${expr})`;
        case "std::map":
        case "std::unordered_map":
          // Note: currently assuming that key is natively supported by js object setter (string or number).
          return `
            [&] (auto&& map) {
                auto out = Napi::Object::New(${env});
                for (auto&& [k, v] : map) {
                    out.Set(k, ${c(type.args[1], "v")});
                }
                return out;
            }(${expr})`;
        case "AsyncCallback":
        case "util::UniqueFunction":
        case "std::function":
          assert.equal(inner.kind, "Func");
          return c(inner, `FWD(${expr})`);
        case "AsyncResult":
          assert.fail("Should never see AsyncResult here");
      }
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      assert(!type.sharedPtrWrapped, `should not directly convert from ${type.name} without shared_ptr wrapper`);
      return `NODE_FROM_CLASS_${type.name}(${env}, ${expr})`;

    case "Struct":
      return `${type.toNode().name}(${env}, ${expr})`;

    case "Func":
      // TODO: see if we want to try to propagate a function name in rather than always making them anonymous.
      return `
            [&] (auto&& cb) -> Napi::Value {
                if constexpr(std::is_constructible_v<bool, decltype(cb)>) {
                    REALM_ASSERT(bool(cb) && "Must mark nullable callbacks with Nullable<> in spec");
                }
                return Napi::Function::New(${env}, [cb = FWD(cb)] (const Napi::CallbackInfo& info) {
                    auto ${env} = info.Env();
                    const auto callBlock = ${addon.get()}->startCall();
                    ${tryWrap(`
                        return ${c(
                          type.ret,
                          `cb(
                            ${type.args.map((arg, i) => convertFromNode(addon, arg.type, `info[${i}]`)).join(", ")}
                        )`,
                        )};
                    `)}
                });
            }(${expr})`;

    case "Enum":
      return `[&]{
                static_assert(sizeof(${type.cppName}) <= sizeof(int32_t), "we only support enums up to 32 bits");
                return Napi::Number::New(${env}, int(${expr}));
            }()`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}
function convertFromNode(addon: NodeAddon, type: Type, expr: string): string {
  const c = convertFromNode.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimFromNode(addon, type.name, expr);
    case "Pointer":
      return `&(${c(type.type, expr)})`;
    case "Opaque":
      return `*((${expr}).As<Napi::External<${type.name}>>().Data())`;

    case "KeyType":
      return `${type.name}(${c(type.type, expr)})`;

    case "Const":
    case "Ref":
      return c(type.type, expr);

    case "RRef": {
      // For now, copying. TODO Consider moving instead, although we may want a marker in JS code.
      // Also, for now, only doing this if the child is a class, since A) that is where we need it,
      // and B) other things may use lambdas which cause compile failures with our `auto(expr)`
      // emulation until C++20.
      const inner = c(type.type, expr);
      return type.type.kind == "Class" ? `REALM_DECAY_COPY(${inner})` : inner;
    }

    case "Template":
      // Most templates only take a single argument so do this here.
      const inner = type.args[0];

      switch (type.name) {
        case "std::shared_ptr":
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_TO_SHARED_${inner.name}(${expr})`;
          return `std::make_shared<${toCpp(inner)}>(${c(inner, expr)})`;
        case "Nullable":
          return `[&] (Napi::Value val) { return val.IsNull() ? ${toCpp(inner)}() : ${c(inner, "val")}; }(${expr})`;
        case "util::Optional":
          return `[&] (Napi::Value val) { return val.IsUndefined() ? ${toCpp(type)}() : ${c(inner, "val")}; }(${expr})`;
        case "std::vector":
          return `[&] (const Napi::Array vec) {
                auto out = std::vector<${toCpp(inner)}>();

                const uint32_t length = vec.Length();
                out.reserve(length);
                for (uint32_t i = 0; i < length; i++) {
                    out.push_back(${c(inner, "vec[i]")});
                }
                return out;
            }((${expr}).As<Napi::Array>())`;
        case "std::tuple":
        case "std::pair":
          const suffix = type.name.split(":")[2];
          const nArgs = type.args.length;
          return `[&] (const Napi::Array& arr) {
              if (arr.Length() != ${nArgs}u)
                throw Napi::TypeError::New(${env}, "Need an array with exactly ${nArgs} elements");
              return std::make_${suffix}(${type.args.map((arg, i) => c(arg, `arr[${i}u]`))});
          }((${expr}).As<Napi::Array>())`;
        case "std::map":
          // For know, can only convert string-keyed maps to C++.
          // We could also support numbers pretty easily. Anything else will be problematic.
          // Consider list-of-pairs for keys that aren't strings or numbers.
          assert.deepEqual(type.args[0], new Primitive("std::string"));
          return `[&] (const Napi::Object obj) {
                auto out = ${toCpp(type)}();
                const auto names = obj.GetPropertyNames();
                const auto length = names.Length();
                for (uint32_t i = 0; i < length; i++) {
                    out.insert({
                        names[i].As<Napi::String>().Utf8Value(),
                        ${c(type.args[1], "obj.Get(names[i])")}
                    });
                }
                return out;
            }((${expr}).As<Napi::Object>())`;
        case "AsyncCallback":
        case "util::UniqueFunction":
        case "std::function":
          return `${toCpp(type)}(${c(inner, expr)})`;
      }
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      if (type.sharedPtrWrapped) return `*NODE_TO_SHARED_${type.name}(${expr})`;
      return `NODE_TO_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `${type.fromNode().name}(${expr})`;

    case "Func":
      // TODO see if we ever need to do any conversion from Napi::Error exceptions to something else.
      // TODO need to consider different kinds of functions:
      // - functions called inline (or otherwise called from within a JS context)
      // - async functions called from JS thread (need to use MakeCallback() rather than call) (current impl)
      // - async functions called from other thread that don't need to wait for JS to return
      // - async functions called from other thread that must wait for JS to return (anything with non-void return)
      //     - This has a risk of deadlock if not done correctly.
      // Note: putting the FunctionReference in a shared_ptr because some of these need to be put into a std::function
      // which requires copyability, but FunctionReferences are move-only.
      const lambda = `
              [_cb = std::make_shared<Napi::FunctionReference>(Napi::Persistent(${expr}.As<Napi::Function>()))]
                (${type.args.map(({ name, type }) => `${toCpp(type)} ${name}`).join(", ")}) -> ${toCpp(type.ret)} {
                    auto ${env} = _cb->Env();
                    Napi::HandleScope hs(${env});
                    try {
                        return ${c(
                          type.ret,
                          `_cb->MakeCallback(
                              ${env}.Global(),
                              {${type.args
                                .map(({ name, type }) => convertToNode(addon, type, `FWD(${name})`))
                                .join(", ")}
                        })`,
                        )};
                    } catch (Napi::Error& _e) {
                        // Populate the cache of the message now to ensure it is safe for any C++ code to call what().
                        (void)_e.what();
                        throw;
                    }
                }`;
      if (!type.isOffThread) return lambda;

      // For now assuming that all void-returning functions are "notifications" and don't need to block until done.
      // Non-void returning functions *must* block so they have something to return.
      const shouldBlock = !type.ret.isVoid();
      return shouldBlock ? `schedulerWrapBlockingFunction(${lambda})` : `util::EventLoopDispatcher(${lambda})`;

    case "Enum":
      return `${type.cppName}((${expr}).As<Napi::Number>().DoubleValue())`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

declare module "../bound-model" {
  interface Struct {
    toNode: () => CppFunc;
    fromNode: () => CppFunc;
  }
  interface Method {
    readonly nodeDescriptorType: string;
  }
}

function constCast<T>(obj: T) {
  return obj as { -readonly [k in keyof T]: T[k] };
}

constCast(InstanceMethod.prototype).nodeDescriptorType = "InstanceMethod";
constCast(StaticMethod.prototype).nodeDescriptorType = "StaticMethod";
constCast(Property.prototype).nodeDescriptorType = "InstanceAccessor";

class NodeCppDecls extends CppDecls {
  inits: string[] = [];
  addon = pushRet(this.classes, new NodeAddon());
  constructor(spec: BoundSpec) {
    super();

    for (const struct of spec.records) {
      // Lazily create the to/from conversions only as needed. This is important because some structs
      // can only be converted in one direction.
      let toNode: CppFunc | undefined;
      let fromNode: CppFunc | undefined;

      struct.toNode = () => {
        if (!toNode) {
          toNode = new CppFunc(
            `STRUCT_TO_NODE_${struct.name}`,
            "Napi::Value",
            [new CppVar("Napi::Env", env), new CppVar(struct.cppName, "in")],
            {
              body: `
                    auto out = Napi::Object::New(${env});
                    ${struct.fields
                      .map(
                        (field) =>
                          `out.Set("${field.jsName}", ${convertToNode(this.addon, field.type, `in.${field.name}`)});`,
                      )
                      .join("\n")}
                    return out;
                `,
            },
          );
          this.free_funcs.push(toNode);
        }
        return toNode;
      };

      struct.fromNode = () => {
        if (!fromNode) {
          fromNode = new CppFunc(
            `STRUCT_FROM_NODE_${struct.name}`,
            struct.cppName,
            [new CppVar("Napi::Value", "val")],
            {
              body: `
                auto ${env} = val.Env();
                if (!val.IsObject())
                    throw Napi::TypeError::New(${env}, "expected an object");
                auto obj = val.As<Napi::Object>();
                auto out = ${struct.cppName}();
                ${struct.fields
                  .map(
                    (field) => `{
                        auto field = obj.Get("${field.jsName}");
                        if (!field.IsUndefined()) {
                            // Make functions on structs behave like bound methods.
                            if (field.IsFunction())
                                field = bindFunc(field.As<Napi::Function>(), obj);
                            out.${field.name} = ${convertFromNode(this.addon, field.type, "field")};
                        } else if constexpr (${field.required ? "true" : "false"}) {
                            throw Napi::TypeError::New(${env}, "${struct.name}::${field.jsName} is required");
                        }
                    }`,
                  )
                  .join("\n")}
                return out;
            `,
            },
          );
          this.free_funcs.push(fromNode);
        }
        return fromNode;
      };
    }

    for (const cls of spec.classes) {
      // TODO need to do extra work to enable JS implementation of interfaces

      assert(
        !cls.sharedPtrWrapped || (!cls.base && cls.subclasses.length == 0),
        `We don't support mixing sharedPtrWrapped and class hierarchies. ${cls.name} requires this.`,
      );

      this.addon.addClass(cls);

      // TODO look into using enabled_shared_from for all shared thingies so we can just store T*.
      const baseType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.rootBase().cppName;
      const derivedType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.cppName;
      const ptr = (expr: string) => `${expr}.As<Napi::External<${baseType}>>().Data()`;
      const casted = (expr: string) => (cls.base ? `static_cast<${derivedType}*>(${ptr(expr)})` : ptr(expr));
      const self = `(${cls.needsDeref ? "**" : "*"}${casted("info[0]")})`;

      const selfCheck = (isStatic: boolean) =>
        isStatic ? "" : `if (!info[0].IsExternal()) throw Napi::TypeError::New(${env}, "need 1 external argument");`;

      for (const method of cls.methods) {
        const argOffset = method.isStatic ? 0 : 1; // `this` takes arg 0 if not static
        const args = method.sig.args.map((a, i) => convertFromNode(this.addon, a.type, `info[${i + argOffset}]`));

        this.free_funcs.push(
          this.addon.addFunc(method.id, {
            body: `
              if (info.Length() != ${args.length + argOffset})
                  throw Napi::TypeError::New(${env}, "expected ${args.length} arguments");
              ${selfCheck(method.isStatic)}
              return ${convertToNode(this.addon, method.sig.ret, method.call({ self }, ...args))};
            `,
          }),
        );
      }

      if (cls.iterable) {
        this.free_funcs.push(
          this.addon.addFunc(cls.iteratorMethodId(), {
            body: `
              if (info.Length() != 1)
                  throw Napi::TypeError::New(${env}, "expected 0 arguments");
              ${selfCheck(false)}

              auto& self = ${self};
              auto jsIt = Napi::Object::New(${env});
              jsIt.Set("_keepAlive", info.This());
              jsIt.Set("next", Napi::Function::New(${env},
                  [it = self.begin(), end = self.end()] (const Napi::CallbackInfo& info) mutable {
                      const auto ${env} = info.Env();

                      auto ret = Napi::Object::New(${env});
                      if (it == end) {
                          ret.Set("done", Napi::Boolean::New(${env}, true));
                      } else {
                          ret.Set("value", ${convertToNode(this.addon, cls.iterable, "*it")});
                          ++it;
                      }
                      return ret;
                  }));

              return jsIt;
            `,
          }),
        );
      }

      const refType = cls.sharedPtrWrapped ? `const ${derivedType}&` : `${derivedType}&`;
      const kind = cls.sharedPtrWrapped ? "SHARED" : "CLASS";

      // TODO in napi 8 we can use type_tags to validate that the object REALLY is from us.
      this.free_funcs.push(
        new CppFunc(`NODE_TO_${kind}_${cls.name}`, refType, [new CppVar("Napi::Value", "val")], {
          attributes: "[[maybe_unused]]",
          body: `
            auto ${env} = val.Env();
            auto obj = val.ToObject();
            auto external = ${this.addon.accessExtractor(cls)}.Call({obj});
            return *${casted(`external`)};
          `,
        }),
      );

      if (!cls.abstract) {
        this.free_funcs.push(
          new CppFunc(
            `NODE_FROM_${kind}_${cls.name}`,
            "Napi::Value",
            [new CppVar("Napi::Env", env), new CppVar(derivedType, "val")],
            {
              attributes: "[[maybe_unused]]",
              // Note: the External::New constructor taking a finalizer does an extra heap allocation for the finalizer.
              // We can look into bypassing that if it is a problem.
              body: `
                return ${this.addon.accessCtor(cls)}.New({Napi::External<${baseType}>::New(
                  ${env},
                  new auto(std::move(val)),
                  [] (Napi::Env, ${baseType}* ptr) {
                    delete static_cast<${derivedType}*>(ptr);
                  }
                )});
              `,
            },
          ),
        );
      }
    }

    this.free_funcs.push(
      new CppFunc("NODE_FROM_Mixed", "Napi::Value", [new CppVar("Napi::Env", env), new CppVar("Mixed", "val")], {
        body: `
          if (val.is_null())
              return ${env}.Null();
          switch (val.get_type()) {
          ${spec.mixedInfo.getters
            .map(
              (g) => `
                case DataType::Type::${g.dataType}:
                  return ${convertToNode(this.addon, g.type, `val.${g.getter}()`)};
              `,
            )
            .join("\n")}
          // The remaining cases are never stored in a Mixed.
          ${spec.mixedInfo.unusedDataTypes.map((t) => `case DataType::Type::${t}: break;`).join("\n")}
          }
          REALM_UNREACHABLE();
        `,
      }),
      new CppFunc("NODE_TO_Mixed", "Mixed", [new CppVar("Napi::Env", env), new CppVar("Napi::Value", "val")], {
        body: `
          switch(val.Type()) {
          case napi_null:
              return Mixed();
          case napi_string:
              return ${convertFromNode(this.addon, spec.types["StringData"], "val")};
          case napi_number:
              return ${convertFromNode(this.addon, spec.types["double"], "val")};
          case napi_bigint:
              return ${convertFromNode(this.addon, spec.types["int64_t"], "val")};
          case napi_boolean:
              return ${convertFromNode(this.addon, spec.types["bool"], "val")};
          case napi_object: {
              const auto obj = val.As<Napi::Object>();
              const auto addon = ${this.addon.get()};
              if (val.IsArrayBuffer()) {
                return ${convertFromNode(this.addon, spec.types["BinaryData"], "val")};
              } ${
                // This list should be sorted in in roughly the expected frequency since earlier entries will be faster.
                [
                  ["Obj", "Obj"],
                  ["Timestamp", "Timestamp"],
                  ["float", "Float"],
                  ["ObjLink", "ObjLink"],
                  ["ObjectId", "ObjectId"],
                  ["Decimal128", "Decimal128"],
                  ["UUID", "UUID"],
                ]
                  .map(
                    ([typeName, jsName]) =>
                      `else if (obj.InstanceOf(addon->${NodeAddon.memberNameFor(jsName)}.Value())) {
                          return ${convertFromNode(this.addon, spec.types[typeName], "val")};
                      }`,
                  )
                  .join(" ")
              }

              // TODO should we check for "boxed" values like 'new Number(1)'?

              const auto ctorName = obj.Get("constructor").As<Napi::Object>().Get("name").As<Napi::String>().Utf8Value();
              throw Napi::TypeError::New(${env}, "Unable to convert an object with ctor '" + ctorName + "' to a Mixed");
          }
          // NOTE: must not treat undefined as null here, because that makes Optional<Mixed> ambiguous.
          ${["undefined", "symbol", "function", "external"]
            .map((t) => `case napi_${t}: throw Napi::TypeError::New(${env}, "Can't convert ${t} to Mixed");`)
            .join("\n")}
          }
          REALM_UNREACHABLE();
        `,
      }),
    );

    this.addon.generateMembers();
  }

  outputDefsTo(out: (...parts: string[]) => void) {
    super.outputDefsTo(out);
    out(`\nNODE_API_NAMED_ADDON(realm_cpp, ${this.addon.name})`);
  }
}

export function generate({ spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("node_init.cpp", "clang-format");

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of spec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <napi.h>
      #include <realm_js_helpers.h>

      namespace realm::js::node {
      namespace {
    `);

  new NodeCppDecls(bindModel(spec)).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::node
    `);
}
