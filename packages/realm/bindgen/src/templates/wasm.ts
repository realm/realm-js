////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { TemplateContext } from "@realm/bindgen/context";
import { CppVar, CppFunc, CppFuncProps, CppMethod, CppClass, CppDecls } from "@realm/bindgen/cpp";
import {
  BoundSpec,
  Class,
  InstanceMethod,
  StaticMethod,
  Property,
  Type,
  Primitive,
  Pointer,
  Template,
} from "@realm/bindgen/bound-model";

import { doJsPasses } from "../js-passes";
import { clangFormat } from "@realm/bindgen/formatter";

const emscripten_call_args = new CppVar("const emscripten::val", "args");

function tryWrap(body: string) {
  return `try {
                ${body}
            } catch (const std::exception& ex) {
                toEmscriptenException(ex).throw_();
            }
        `;
}

class CppEmscriptenFunc extends CppFunc {
  constructor(
    private addon: BrowserAddon,
    name: string,
    numberOfArgs: number,
    props?: CppFuncProps,
  ) {
    const vars = new Array<CppVar>(numberOfArgs);
    for (let i = 0; i < numberOfArgs; i++) {
      vars[i] = new CppVar("const emscripten::val", `arg${i}`);
    }
    super(name, "emscripten::val", vars, props);
  }

  definition() {
    return super.definition(`
            const auto callBlock = ${this.addon.get()}->startCall();
            ${tryWrap(this.body)}
        `);
  }
}

function pushRet<T, U extends T>(arr: T[], elem: U) {
  arr.push(elem);
  return elem;
}

class BrowserAddon extends CppClass {
  exports: Record<string, string> = {};
  classes: string[] = [];
  injectables = ["Float", "UUID", "ObjectId", "Decimal128", "EJSON_parse", "EJSON_stringify"];

  constructor() {
    super("RealmAddon");
    this.members.push(new CppVar("std::unique_ptr<RealmAddon>", "self", { static: true }));
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
    this.injectables.forEach((t) => this.members.push(new CppVar("emscripten::val", BrowserAddon.memberNameFor(t))));
    this.classes.forEach((t) =>
      this.members.push(new CppVar("emscripten::val", BrowserAddon.memberNameForExtractor(t))),
    );
    this.addMethod(
      new CppMethod("injectInjectables", "void", [emscripten_call_args], {
        body: `          
          ${this.injectables.map((t) => `${BrowserAddon.memberNameFor(t)} = args["${t}"];`).join("\n")}
          ${this.classes
            .map(
              (cls) =>
                `${BrowserAddon.memberNameForExtractor(cls)} =
                  ${BrowserAddon.memberNameFor(cls)}["_extract"];`,
            )
            .join("\n")}
        `,
      }),
    );
  }

  addFunc(name: string, numberOfArgs: number, props?: CppFuncProps) {
    return new CppEmscriptenFunc(this, name, numberOfArgs, props);
  }

  addClass(cls: Class) {
    this.injectables.push(cls.jsName);
    this.classes.push(cls.jsName);
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
    return `${this.get()}->${BrowserAddon.memberNameFor(cls)}`;
  }

  accessExtractor(cls: string | { jsName: string }) {
    return `${this.get()}->${BrowserAddon.memberNameForExtractor(cls)}`;
  }

  get() {
    return `${this.name}::self`;
  }
}

function convertPrimToEmscripten(addon: BrowserAddon, type: string, expr: string): string {
  switch (type) {
    case "void":
      return `((void)(${expr}), emscripten::val::undefined())`;

    case "bool":
      return `emscripten::val(bool(${expr}))`;

    case "float":
      return `${addon.accessCtor("Float")}.new_(${convertPrimToEmscripten(addon, "double", expr)})`;

    case "double":
    case "int32_t":
      return `emscripten::val(${expr})`;

    case "count_t":
      return `emscripten::val(std::make_signed_t<int>(${expr}))`;

    case "int64_t":
    case "uint64_t":
      return `emscripten::val(${expr})`;

    case "std::chrono::milliseconds":
      return `emscripten::val(std::chrono::milliseconds(${expr}).count())`;

    case "StringData":
    case "std::string_view":
    case "std::string":
      return `([&] (auto&& sd) {
                if(sd.size() == 0) {
                    return emscripten::val("");    
                } else {
                  return emscripten::val(std::string(sd.data(), sd.size()));
                }                 
            }(${expr}))`;

    case "EncryptionKey": //TODO throw Error("EncryptionKey is not supported. Encryption is not supported in WASM");
      return "emscripten::val()";
    case "OwnedBinaryData":
    case "BinaryData":
      // construct a typed view around the C++ data. the underlying array buffer is the Emscripten heap
      // call slice to create a copy and return the new underlying buffer
      return `([&] (const auto& bd) -> emscripten::val {
                emscripten::val typed_array(emscripten::typed_memory_view(bd.size(), bd.data()));
                return typed_array.call<emscripten::val>("slice")["buffer"];
            }(${expr}))`;

    case "Mixed":
      return `EMVAL_FROM_Mixed(${expr})`;
    case "QueryArg":
      // We _could_ support this, but no reason to.
      throw Error("QueryArg should only be used for conversion to C++");

    case "ObjectId":
    case "UUID":
    case "Decimal128":
      return `${addon.accessCtor(type)}.new_(${convertPrimToEmscripten(addon, "std::string", `${expr}.to_string()`)})`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return `${addon.accessCtor("EJSON_parse")}(${convertPrimToEmscripten(addon, "std::string", expr)})`;

    case "bson::BsonArray":
    case "bson::BsonDocument":
      return convertPrimToEmscripten(addon, "EJsonObj", `bson::Bson(${expr}).to_string()`);

    case "AppError":
      // This matches old JS SDK. The C++ type will be changing as part of the unify error handleing project.
      return `([&] (const app::AppError& err) {
                auto jsErr = emscripten::val::global("Error")(emscripten::val(err.what()));
                jsErr.set("code", double(err.code()));
                return jsErr;
              }(${expr}))`;
    case "std::exception_ptr":
      return `toEmscriptenException(${expr})`;
    case "std::error_code":
      return `toEmscriptenErrorCode(${expr})`;
    case "Status":
      return `([&] (const Status& status) {
                if (status.is_ok()) {
                  return emscripten::val::undefined();
                } else {
                  return emscripten::val(status.reason().c_str());
                }                
              }(${expr}))`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}
function convertPrimFromEmscripten(addon: BrowserAddon, type: string, expr: string): string {
  switch (type) {
    case "void":
      return `((void)(${expr}))`;

    case "bool":
      return `(${expr}).as<bool>()`;

    case "double":
      return `(${expr}).as<double>()`;
    case "float":
      return `(${expr}["value"]).as<float>()`;

    case "int32_t":
      return `(${expr}).as<int>()`;

    case "count_t":
      // NOTE: using Int64 here is important to correctly handle -1.0 aka npos.
      // FIXME should use int64_t
      return `size_t((${expr}).as<int>())`;

    case "int64_t":
      return `${expr}.as<int64_t>()`;
    case "uint64_t":
      return `${expr}.as<uint64_t>()`;

    case "std::chrono::milliseconds":
      return `std::chrono::milliseconds(${expr}.as<uint64_t>())`;

    case "std::string":
      return `${addon.get()}->wrapString((${expr}).as<std::string>())`;

    case "StringData":
    case "std::string_view":
      return `${convertPrimFromEmscripten(addon, "std::string", expr)}`;

    case "BinaryData":
      return `BinaryData(${addon.get()}->wrapString(toBinaryData(${expr})))`;
    case "OwnedBinaryData":
      return `toOwnedBinaryData(${expr})`;

    case "EncryptionKey": //TODO assert.fail("Encryption is not supported in WASM.");
      return "std::vector<char>()";
    case "Mixed":
      return `EMVAL_TO_Mixed(${expr})`;
    case "QueryArg": {
      const mixed = new Primitive("Mixed");
      return `
        ([&] (const emscripten::val& v) -> ${new Primitive(type).toCpp()} {
            if (v.isArray()) {
                return ${convertFromEmscripten(addon, new Template("std::vector", [mixed]), "v")};
            } else {
                return ${convertFromEmscripten(addon, mixed, "v")};
            }
        })(${expr})`;
    }

    case "UUID":
    case "Decimal128":
    case "ObjectId":
      return `${type}((${expr}.call<std::string>("toString").c_str()))`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return convertPrimFromEmscripten(addon, "std::string", `${addon.accessCtor("EJSON_stringify")}(${expr})`);

    case "bson::BsonArray":
    case "bson::BsonDocument":
      return `${type}(bson::parse(${convertPrimFromEmscripten(addon, "EJsonObj", expr)}))`;

    case "AppError":
      assert.fail("Cannot convert AppError to C++, only from C++.");
  }
  assert.fail(`unexpected primitive type '${type}'`);
}

function convertToEmscripten(addon: BrowserAddon, type: Type, expr: string): string {
  const c = convertToEmscripten.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimToEmscripten(addon, type.name, expr);
    case "Pointer":
      return `[&] (const auto& ptr){
          if constexpr(requires{ bool(ptr); }) { // support claiming that always-valid iterators are pointers.
              REALM_ASSERT(bool(ptr) && "Must mark nullable pointers with Nullable<> in spec");
          }
          return ${c(type.type, "*ptr")};
      } (${expr})`;

    case "Opaque":
      return `emscripten::val(reinterpret_cast<std::uintptr_t>(&(${expr})))`;

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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `EMVAL_FROM_SHARED_${inner.name}(${expr})`;
          return c(new Pointer(inner), expr);
        case "Nullable": {
          return `[&] (auto&& val) { return !val ? emscripten::val::null() : ${c(inner, "FWD(val)")}; }(${expr})`;
        }
        case "std::optional":
          return `[&] (auto&& opt) { return !opt ? emscripten::val::undefined() : ${c(inner, "*FWD(opt)")}; }(${expr})`;
        case "std::vector":
          return `[&] (auto&& vec) {
              auto out = emscripten::val::array();
              for (auto&& e : vec) {
                  out.call<void>("push", ${c(inner, "e")});
              }
              return out;
          }(${expr})`;
        case "std::pair":
        case "std::tuple":
          return `
            [&] (auto&& tup) {
                auto out = emscripten::val::array(); // of size ${type.args.length}
                ${type.args
                  .map((arg, i) => `out.call<void>("push", ${c(arg, `std::get<${i}>(FWD(tup))`)});`)
                  .join("\n")}
                return out;
            }(${expr})`;
        case "std::map":
        case "std::unordered_map":
          // Note: currently assuming that key is natively supported by js object setter (string or number).
          return `
            [&] (auto&& map) {
                auto out = emscripten::val::object();
                for (auto&& [k, v] : map) {
                    out.set(k, ${c(type.args[1], "v")});
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
      return assert.fail(`unknown template ${type.name}`);

    case "Class":
      assert(!type.sharedPtrWrapped, `should not directly convert from ${type.name} without shared_ptr wrapper`);
      return `EMVAL_FROM_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `${type.toEmscripten().name}(${expr})`;

    case "Func":
      // TODO: see if we want to try to propagate a function name in rather than always making them anonymous.
      return `
          [&] (auto&& cb) -> emscripten::val {
              if constexpr(std::is_constructible_v<bool, decltype(cb)>) {
                  REALM_ASSERT(bool(cb) && "Must mark nullable callbacks with Nullable<> in spec");
              }
                  const auto callBlock = ${addon.get()}->startCall();
                  ${tryWrap(`
                      return ${c(
                        type.ret,
                        `cb(${type.args
                          .map((arg, i) => convertFromEmscripten(addon, arg.type, `arg${i}`))
                          .join(", ")})`,
                      )};
                  `)}
          }(${expr})`;

    case "Enum":
      return `emscripten::val(int(${expr}))`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}
function convertFromEmscripten(addon: BrowserAddon, type: Type, expr: string): string {
  const c = convertFromEmscripten.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimFromEmscripten(addon, type.name, expr);
    case "Pointer":
      return `&(${c(type.type, expr)})`;
    case "Opaque":
      return `(*(reinterpret_cast<${type.name}*>(${expr}.as<std::uintptr_t>())))`;

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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `EMVAL_TO_SHARED_${inner.name}(${expr})`;
          return `std::make_shared<${inner.toCpp()}>(${c(inner, expr)})`;
        case "Nullable":
          return `[&] (emscripten::val val) { return val.isNull() ? ${inner.toCpp()}() : ${c(
            inner,
            "val",
          )}; }(${expr})`;
        case "std::optional":
          return `[&] (emscripten::val val) {
              return val.isUndefined() ? ${type.toCpp()}() : ${c(inner, "val")};
          }(${expr})`;
        case "std::vector":
          return `[&] (const emscripten::val vec) {
                assert(vec.isArray());
                auto out = std::vector<${inner.toCpp()}>();

                const uint32_t length = vec["length"].as<uint32_t>();
                out.reserve(length);
                for (uint32_t i = 0; i < length; i++) {
                    out.push_back(${c(inner, "vec[i]")});
                }
                return out;
            }(${expr})`;
        case "std::tuple":
        case "std::pair":
          const suffix = type.name.split(":")[2];
          const nArgs = type.args.length;
          return `[&] (const emscripten::val& arr) {
              if (arr["length"].as<int>() != ${nArgs}u)
                emscripten::val("Need an array with exactly ${nArgs} elements").throw_();
              return std::make_${suffix}(${type.args.map((arg, i) => c(arg, `arr[${i}u]`))});
          }(${expr})`;
        case "std::map":
        case "std::unordered_map":
          // For now, can only convert string-keyed maps to C++.
          // We could also support numbers pretty easily. Anything else will be problematic.
          // Consider list-of-pairs for keys that aren't strings or numbers.
          assert.deepEqual(type.args[0], new Primitive("std::string"));
          return `[&] (const emscripten::val obj) {
                auto out = ${type.toCpp()}();
                auto entries = emscripten::val::global("Object")["entries"](obj);
                const auto length = entries["length"].as<uint32_t>();
                for (uint32_t i = 0; i < length; i++) {                  
                    out.insert({
                      entries[i][0].as<std::string>(),
                        ${c(type.args[1], "entries[i][1]")}
                    });
                }
                return out;
            }(${expr})`;
        case "AsyncCallback":
        case "util::UniqueFunction":
        case "std::function":
          return `${type.toCpp()}(${c(inner, expr)})`;
      }
      return assert.fail(`unknown template ${type.name}`);

    case "Class":
      if (type.sharedPtrWrapped) return `*EMVAL_TO_SHARED_${type.name}(${expr})`;
      return `EMVAL_TO_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `${type.fromEmscripten().name}(${expr})`;

    case "Func":
      const lambda = `
      [
        _cb =  FWD(${expr})
      ]
      (${type.args
        .map(({ name, type }) => `${type.toCpp()} ${type.isTemplate("IgnoreArgument") ? "" : name}`)
        .join(", ")}
      ) -> ${type.ret.toCpp()}
      {
          return ${c(
            type.ret,
            `_cb(
                ${type
                  .argsSkippingIgnored()
                  .map(({ name, type }) => convertToEmscripten(addon, type, `FWD(${name})`))
                  .join(", ")})`,
          )};
      }`;
      return lambda;
    // if (!type.isOffThread) return lambda;

    // For now assuming that all void-returning functions are "notifications" and don't need to block until done.
    // Non-void returning functions *must* block so they have something to return.
    // const shouldBlock = !type.ret.isVoid();
    // return shouldBlock ? `schedulerWrapBlockingFunction(${lambda})` : `util::EventLoopDispatcher(${lambda})`;

    case "Enum":
      return `${type.cppName}((${expr}).as<int>())`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

declare module "@realm/bindgen/bound-model" {
  interface Struct {
    toEmscripten: () => CppFunc;
    fromEmscripten: () => CppFunc;
  }
  interface Method {
    readonly emscriptenDescriptorType: string;
  }
}

function constCast<T>(obj: T) {
  return obj as { -readonly [k in keyof T]: T[k] };
}

constCast(InstanceMethod.prototype).emscriptenDescriptorType = "InstanceMethod";
constCast(StaticMethod.prototype).emscriptenDescriptorType = "StaticMethod";
constCast(Property.prototype).emscriptenDescriptorType = "InstanceAccessor";

class BrowserCppDecls extends CppDecls {
  addon = pushRet(this.classes, new BrowserAddon());
  boundSpec: BoundSpec;
  methodFunctions: string[] = [];

  constructor(spec: BoundSpec) {
    super();
    this.boundSpec = spec;

    for (const enm of spec.enums) {
      this.static_asserts.push(`sizeof(${enm.cppName}) <= sizeof(int32_t), "we only support enums up to 32 bits"`);
      for (const { name, value } of enm.enumerators) {
        this.static_asserts.push(`${enm.cppName}(int(${value})) == ${enm.cppName}::${name}`);
      }
    }

    for (const struct of spec.records) {
      // Lazily create the to/from conversions only as needed. This is important because some structs
      // can only be converted in one direction.
      let toEmscripten: CppFunc | undefined;
      let fromEmscripten: CppFunc | undefined;

      struct.toEmscripten = () => {
        if (!toEmscripten) {
          toEmscripten = new CppFunc(
            `STRUCT_TO_EMVAL_${struct.name}`,
            "emscripten::val",
            [new CppVar(`const ${struct.cppName}&`, "in")],
            {
              body: `
                    auto out = emscripten::val::object();
                    ${struct.fields
                      .filter((field) => !field.type.isFunction() && field.isOptedInTo)
                      .map(
                        (field) =>
                          `out.set("${field.jsName}", ${convertToEmscripten(
                            this.addon,
                            field.type,
                            `in.${field.cppName}`,
                          )});`,
                      )
                      .join("\n")}
                    return out;
                `,
            },
          );
          this.free_funcs.push(toEmscripten);
        }
        return toEmscripten;
      };

      struct.fromEmscripten = () => {
        if (!fromEmscripten) {
          for (const field of struct.fields) {
            if (field.cppName && field.cppName.endsWith(")")) {
              // If this fires, we should consider a way to mark these fields as only being for one-way conversion.
              throw new Error(
                `Attempting JS->C++ conversion of ${struct.name}::${field.name} which looks like it may be a method`,
              );
            }
          }
          fromEmscripten = new CppFunc(
            `STRUCT_FROM_EMVAL_${struct.name}`,
            struct.cppName,
            [new CppVar("emscripten::val", "val")],
            {
              body: `
                auto out = ${struct.cppName}();
                ${struct.fields
                  .filter((field) => field.isOptedInTo)
                  .map(
                    (field) => `{
                        auto field = val["${field.jsName}"];
                        if (!field.isUndefined()) {
                            // Make functions on structs behave like bound methods.
                            if (field.instanceof(emscripten::val::global("Function")))
                                field = field.call<emscripten::val>("bind", val);
                            out.${field.cppName} = ${convertFromEmscripten(this.addon, field.type, "field")};
                        } else if constexpr (${field.required ? "true" : "false"}) {
                            emscripten::val("${struct.jsName}::${field.jsName} is required").throw_();
                        }
                    }`,
                  )
                  .join("\n")}
                return out;
            `,
            },
          );
          this.free_funcs.push(fromEmscripten);
        }
        return fromEmscripten;
      };
    }

    for (const cls of spec.classes) {
      assert(
        !cls.sharedPtrWrapped || (!cls.base && cls.subclasses.length == 0),
        `We don't support mixing sharedPtrWrapped and class hierarchies. ${cls.name} requires this.`,
      );

      this.addon.addClass(cls);

      const baseType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.rootBase().cppName;
      const derivedType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.cppName;
      const ptr = (expr: string) => `reinterpret_cast<${baseType}*>(${expr}.as<std::uintptr_t>())`;
      const casted = (expr: string) => (cls.base ? `static_cast<${derivedType}*>(${ptr(expr)})` : ptr(expr));
      const self = `(${cls.needsDeref ? "**" : "*"}${casted("arg0")})`;

      const selfCheck = (isStatic: boolean) => {
        return isStatic ? "" : "";
      };

      for (const method of cls.methods) {
        if (!method.isOptedInTo) continue;

        const argOffset = method.isStatic ? 0 : 1; // `this` takes arg 0 if not static
        const args = method.sig.args.map((a, i) => convertFromEmscripten(this.addon, a.type, `arg${i + argOffset}`));
        // console.log(`GENERATING method = ${method.id} length = ${method.sig.args.length + argOffset}\n`);
        this.free_funcs.push(
          this.addon.addFunc(method.id, method.sig.args.length + argOffset, {
            body: `
              ${selfCheck(method.isStatic)}
              return ${convertToEmscripten(this.addon, method.sig.ret, method.call({ self }, ...args))};
            `,
          }),
        );
        this.methodFunctions.push(method.id);
      }

      if (cls.iterable) {
        this.free_funcs.push(
          this.addon.addFunc(cls.iteratorMethodId(), 1, {
            body: `
              emscripten::val jsIt = emscripten::val::object();
              auto& self = ${self};

              std::function<emscripten::val()> incrementIterators = [begin = std::make_move_iterator(self.begin()), end = std::make_move_iterator(self.end())]() mutable {
                emscripten::val iteratorResult = emscripten::val::object();
                 if (begin == end) {
                    iteratorResult.set("done", true);
                }
                else {
                    iteratorResult.set("value", ${convertToEmscripten(this.addon, cls.iterable, "*begin")});
                    ++begin;
                }
                return iteratorResult;
            };

              // Allocate memory for the lambda on the heap
              auto* lambdaPtr = new decltype(incrementIterators)(incrementIterators);
              // Get the address of the lambda
              std::uintptr_t lambdaAddress = reinterpret_cast<std::uintptr_t>(lambdaPtr);

              int jsInternalIteratorCall = EM_ASM_INT({
                var myFunction = function() {
                    return Module["_internal_iterator"]($0);
                };
                return Emval.toHandle(myFunction);
            }, lambdaAddress);
              jsIt.set("next", emscripten::val::take_ownership((emscripten::EM_VAL)(jsInternalIteratorCall)));
              return jsIt;
            `,
          }),
        );
        this.methodFunctions.push(cls.iteratorMethodId());
      }

      const refType = cls.sharedPtrWrapped ? `const ${derivedType}&` : `${derivedType}&`;
      const kind = cls.sharedPtrWrapped ? "SHARED" : "CLASS";
      this.free_funcs.push(
        new CppFunc(`EMVAL_TO_${kind}_${cls.name}`, refType, [new CppVar("emscripten::val", "val")], {
          attributes: "[[maybe_unused]]",
          body: `
            emscripten::val external = ${this.addon.accessExtractor(cls)}(val);
            const auto ptr = ${casted(`external`)};
            ${
              cls.sharedPtrWrapped
                ? `if (!*ptr) emscripten::val("Attempting to use an instanace of ${cls.name} holding a null shared_ptr. Did you call $resetSharedPtr on it already?").throw_();`
                : ""
            }
            return *ptr;
          `,
        }),
      );

      const nullCheck = cls.sharedPtrWrapped
        ? 'REALM_ASSERT(bool(val) && "Must mark nullable pointers with Nullable<> in spec");'
        : "";

      if (!cls.abstract) {
        this.free_funcs.push(
          new CppFunc(`EMVAL_FROM_${kind}_${cls.name}`, "emscripten::val", [new CppVar(derivedType, "val")], {
            attributes: "[[maybe_unused]]",
            body: `
                ${nullCheck}
                return ${this.addon.accessCtor(
                  cls,
                )}.new_(emscripten::val(reinterpret_cast<std::uintptr_t>(new auto(std::move(val)))));
              `,
          }),
          new CppFunc(`${cls.name}_deleter`, "void", [new CppVar("emscripten::val", "pointer")], {
            body:
              kind === "SHARED"
                ? `delete reinterpret_cast<std::shared_ptr<${cls.cppName}>*>(pointer.as<std::uintptr_t>());`
                : `delete reinterpret_cast<${cls.cppName}*>(pointer.as<std::uintptr_t>());`,
          }),
        );
        this.methodFunctions.push(`${cls.name}_deleter`);
      }
    }

    // Adding internal iterator function
    this.free_funcs.push(
      new CppFunc("_internal_iterator", "emscripten::val", [new CppVar("std::uintptr_t", "lambdaAddress")], {
        body: `
        std::function<emscripten::val()>* func = reinterpret_cast<std::function<emscripten::val()>*>(lambdaAddress);
        emscripten::val val = (*func)();

        // Deallocate the lambda from the heap if it's the last element
        if (!val["done"].isUndefined()) {
            delete func;
        }
        return val;
        `,
      }),
    );

    this.free_funcs.push(
      new CppFunc("EMVAL_FROM_Mixed", "emscripten::val", [new CppVar("Mixed", "val")], {
        body: `
          if (val.is_null())
              return emscripten::val::null();
          switch (val.get_type()) {
          ${spec.mixedInfo.getters
            .map(
              (g) => `
                case DataType::Type::${g.dataType}:
                  return ${convertToEmscripten(this.addon, g.type, `val.${g.getter}()`)};
              `,
            )
            .join("\n")}
          // The remaining cases are never stored in a Mixed.
          ${spec.mixedInfo.unusedDataTypes.map((t) => `case DataType::Type::${t}: break;`).join("\n")}
          }
          REALM_UNREACHABLE();
        `,
      }),
      new CppFunc("EMVAL_TO_Mixed", "Mixed", [new CppVar("emscripten::val", "val")], {
        body: `
          auto type = val.typeOf().as<std::string>();
          if (type == "string") {
            return ${convertFromEmscripten(this.addon, spec.types["StringData"], "val")};

          } else if (type == "boolean") {
            return ${convertFromEmscripten(this.addon, spec.types["bool"], "val")};

          } else if (type == "number") {
            return val.as<double>();           

          } else if (type == "bigint") {
             return val.as<int64_t>(); 
              
          } else if (type == "object") {
              if(val.isNull()) {
                return Mixed();
              }
              if (val.instanceof(emscripten::val::global("ArrayBuffer"))) {
                return ${convertFromEmscripten(this.addon, spec.types["BinaryData"], "val")};
              }
              else if (val.instanceof(emscripten::val::global("DataView"))) {
                return ${convertFromEmscripten(this.addon, spec.types["BinaryData"], 'val["buffer"]')};
              }
              ${
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
                      `else if (val.instanceof(${this.addon.accessCtor(jsName)})) {
                          return ${convertFromEmscripten(this.addon, spec.types[typeName], "val")};
                      }`,
                  )
                  .join(" ")
              }

              const auto ctorName =
              val["constructor"]["name"].as<std::string>();
    
              emscripten::val::global("Error")(util::format("Unable to convert an object with ctor '%1' to a Mixed", ctorName)).throw_();
          } else {
            // NOTE: must not treat undefined as null here, because that makes Optional<Mixed> ambiguous.
            emscripten::val::global("Error")(util::format("Can't convert %1 to Mixed", type)).throw_();
          }

          REALM_UNREACHABLE();              
        `,
      }),
    );

    this.addon.generateMembers();
  }

  outputDefsTo(out: (...parts: string[]) => void) {
    super.outputDefsTo(out);
    out(`
    void wasm_init()
    {
      if (!RealmAddon::self) {
          RealmAddon::self = std::make_unique<RealmAddon>();    
      }
    }
    void injectExternalTypes(emscripten::val val)
    {
        RealmAddon::self->injectInjectables(val);
    }
    `);

    // export method functions via embind
    out(`\nEMSCRIPTEN_BINDINGS(realm_c_api) {`);
    out("\nusing emscripten::function;");
    this.methodFunctions.map((fun: string) => {
      out(`\nfunction("${fun}", &${fun});`);
    });

    // this.boundSpec.classes.forEach((c) => {
    //   out(`\nfunction("${c.jsName}_deleter", &${c.jsName}_deleter);`);
    // });

    out(`\nfunction("_internal_iterator", &_internal_iterator);`);
    out(`\nfunction("wasmInit", &wasm_init);`);
    out(`\nfunction("injectInjectables", &injectExternalTypes);`);

    out("\n}");
  }
}

export function generate({ rawSpec, spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("wasm_init.cpp", clangFormat);

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of rawSpec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <emscripten/bind.h>
      #include <realm_helpers.h>
      #include <realm_js_wasm_helpers.h>

      namespace realm::js::wasm {
      namespace {
    `);

  new BrowserCppDecls(doJsPasses(spec)).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::wasm
    `);
}
