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

import { TemplateContext } from "../context";
import { CppVar, CppFunc, CppFuncProps, CppMethod, CppClass, CppDecls } from "../cpp";
import {
  bindModel,
  BoundSpec,
  Class,
  InstanceMethod,
  StaticMethod,
  Property,
  Type,
  Primitive,
  Pointer,
  Template,
} from "../bound-model";

import { doJsPasses } from "../js-passes";

const emscripten_call_args = new CppVar("const emscripten::val", "args");

function tryWrap(body: string) {
  return `try {
                ${body}
            } catch (const std::exception& ex) {
                emscripten::val(ex.what()).throw_();
            }
        `;
}

class CppNodeFunc extends CppFunc {
  constructor(private addon: BrowserAddon, name: string, numberOfArgs: number, props?: CppFuncProps) {
    // TODO generate signature with exact number of args (numberOfArgs)
    const vars = new Array<CppVar>(numberOfArgs);
    for (let i = 0; i < numberOfArgs; i++) {
      vars[i] = new CppVar("const emscripten::val", `arg${i}`);
    }
    super(name, "emscripten::val", vars, props);
  }

  definition() {
    return super.definition(`
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
    return new CppNodeFunc(this, name, numberOfArgs, props);
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
      // NOTE: using int64_t cast here to get -1.0 for size_t(-1), aka npos.
      return `emscripten::val(int64_t(${expr}))`;

    case "int64_t":
    case "uint64_t":
      return `emscripten::val(${expr})`;

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
      return `([&] (const auto& bd) -> emscripten::val {
                return emscripten::val(emscripten::typed_memory_view(bd.size(), bd.data()));
            }(${expr}))`;

    case "Mixed":
      return `NODE_FROM_Mixed(${expr})`;
    case "QueryArg":
      // We _could_ support this, but no reason to.
      throw Error("QueryArg should only be used for conversion to C++");

    case "ObjectId":
    case "UUID":
    case "Decimal128":
      //TODO FIXME return `${type}((${expr}.as<std::string>().c_str()))`;
      return `${addon.accessCtor(type)}.new_(${convertPrimToEmscripten(addon, "std::string", `${expr}.to_string()`)})`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return `${addon.accessCtor("EJSON_parse")}.new_(${convertPrimToEmscripten(addon, "std::string", expr)})`;

    case "bson::BsonArray":
    case "bson::BsonDocument":
      return convertPrimToEmscripten(addon, "EJsonObj", `bson::Bson(${expr}).to_string()`);

    case "AppError":
      // This matches old JS SDK. The C++ type will be changing as part of the unify error handleing project.
      return `([&] (const app::AppError& err) {
                // TODO call the extern method to report an error
                // auto jsErr =  Napi::Error::New(, err.message).Value();
                // jsErr.Set("code", double(err.error_code.value()));
                // return jsErr;
                return emscripten::val(err.message);
              }(${expr}))`;
    case "std::exception_ptr":
      return `toEmscriptenException(${expr})`;
    case "std::error_code": //TODO same?
      return `toEmscriptenErrorCode(${expr})`;
    case "Status":
      return `([&] (const Status& status) {
                REALM_ASSERT(!status.is_ok()); // should only get here with errors
                // return Napi::Error::New(status.reason()).Value();
                return emscripten::val(status.reason().c_str());
              }(${expr}))`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}
function convertPrimFromEmscripten(addon: BrowserAddon, type: string, expr: string): string {
  // TODO consider using coercion using ToString, ToNumber, ToBoolean.
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

    case "std::string":
      //TODO is this optimal? retruning a std::string used inside a `List<String>` sometimes yield garbage content(already reclaimed?)
      return `(${expr}).as<std::string>().c_str()`;

    case "StringData":
    case "std::string_view":
      // TODO look into not wrapping if directly converting into an argument.
      //return `${addon.get()}->wrapString(${convertPrimFromEmscripten(addon, "std::string", expr)})`;
      return `${convertPrimFromEmscripten(addon, "std::string", expr)}`;

    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (const emscripten::val& v) -> ${type} {
                auto buf = v.as<std::string>();
                return BinaryData(buf.c_str(), buf.length());
            })(${expr})`;

    case "EncryptionKey": //TODO assert.fail("Encryption is not supported in WASM.");
      return "std::vector<char>()";
    case "Mixed":
      return `NODE_TO_Mixed(${expr})`;
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
      return `${type}((${expr}.as<std::string>().c_str()))`;

    // TODO add a StringData overload to the ObjectId ctor in core so this can merge with above.
    case "ObjectId":
      return `${type}((${expr}.as<std::string>().c_str()))`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return convertPrimFromEmscripten(addon, "std::string", `${addon.accessCtor("EJSON_stringify")}.new_(${expr})`);

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
      // TODO copy JSI impl
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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_FROM_SHARED_${inner.name}(${expr})`;
          return c(new Pointer(inner), expr);
        case "Nullable":
          return `[&] (auto&& val) { if(!val) return emscripten::val::null(); else ${c(inner, "FWD(val)")}; }(${expr})`;
        case "util::Optional":
          return `[&] (auto&& opt) { return !opt ? emscripten::val::undefined() : ${c(inner, "*FWD(opt)")}; }(${expr})`;
        case "std::vector":
          // TODO try different ways to create the array to see what is fastest.
          // eg, try calling push() with and without passing size argument to New().
          // TODO try val::vecFromJSArray
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
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      assert(!type.sharedPtrWrapped, `should not directly convert from ${type.name} without shared_ptr wrapper`);
      return `NODE_FROM_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `${type.toNode().name}(${expr})`;

    case "Func":
    // TODO: see if we want to try to propagate a function name in rather than always making them anonymous.
      return `
          [&] (auto&& cb) -> emscripten::val {
              if constexpr(std::is_constructible_v<bool, decltype(cb)>) {
                  REALM_ASSERT(bool(cb) && "Must mark nullable callbacks with Nullable<> in spec");
              }
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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `NODE_TO_SHARED_${inner.name}(${expr})`;
          return `std::make_shared<${inner.toCpp()}>(${c(inner, expr)})`;
        case "Nullable":
          return `[&] (emscripten::val val) { return val.isNull() ? ${inner.toCpp()}() : ${c(
            inner,
            "val",
          )}; }(${expr})`;
        case "util::Optional":
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
              // TODO assert arr.isArray()
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
                auto entries = emscripten::val::global("Object")["entries"].call<emscripten::val>("call", obj);
                const auto length = entries["length"].as<int>();
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
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      if (type.sharedPtrWrapped) return `*NODE_TO_SHARED_${type.name}(${expr})`;
      return `NODE_TO_CLASS_${type.name}(${expr})`;

    case "Struct":
      return `${type.fromNode().name}(${expr})`;

    case "Func":
      //assert.fail(`TODO unsuported`);
    // TODO see if we ever need to do any conversion from Napi::Error exceptions to something else.
    // TODO see if the ThreadConfinementChecker is ever too expensive in release builds.
    // Note: putting the FunctionReference in a shared_ptr because some of these need to be put into a std::function
    // which requires copyability, but FunctionReferences are move-only.
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

class BrowserCppDecls extends CppDecls {
  addon = pushRet(this.classes, new BrowserAddon());
  boundSpec: BoundSpec;

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
      let toNode: CppFunc | undefined;
      let fromNode: CppFunc | undefined;

      struct.toNode = () => {
        if (!toNode) {
          toNode = new CppFunc(
            `STRUCT_TO_NODE_${struct.name}`,
            "emscripten::val",
            [new CppVar(`const ${struct.cppName}&`, "in")],
            {
              body: `
                    auto out = emscripten::val::object();
                    ${struct.fields
                      .filter((field) => !field.type.isFunction())
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
          this.free_funcs.push(toNode);
        }
        return toNode;
      };

      struct.fromNode = () => {
        if (!fromNode) {
          for (const field of struct.fields) {
            if (field.cppName && field.cppName.endsWith(")")) {
              // If this fires, we should consider a way to mark these fields as only being for one-way conversion.
              throw new Error(
                `Attempting JS->C++ conversion of ${struct.name}::${field.name} which looks like it may be a method`,
              );
            }
          }
          fromNode = new CppFunc(
            `STRUCT_FROM_NODE_${struct.name}`,
            struct.cppName,
            [new CppVar("emscripten::val", "val")],
            {
              body: `
                // TODO assert val is an object 
                auto out = ${struct.cppName}();
                ${struct.fields
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
      const ptr = (expr: string) => `reinterpret_cast<${baseType}*>(${expr}.as<std::uintptr_t>())`;
      const casted = (expr: string) => (cls.base ? `static_cast<${derivedType}*>(${ptr(expr)})` : ptr(expr));
      const self = `(${cls.needsDeref ? "**" : "*"}${casted("arg0")})`;

      const selfCheck = (isStatic: boolean) => {
        return "";
      };

      for (const method of cls.methods) {
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
      }

      const refType = cls.sharedPtrWrapped ? `const ${derivedType}&` : `${derivedType}&`;
      const kind = cls.sharedPtrWrapped ? "SHARED" : "CLASS";

      // TODO in napi 8 we can use type_tags to validate that the object REALLY is from us.
      this.free_funcs.push(
        new CppFunc(`NODE_TO_${kind}_${cls.name}`, refType, [new CppVar("emscripten::val", "val")], {
          attributes: "[[maybe_unused]]",
          body: `
            // TODO check val is object translate below as well
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
          new CppFunc(`NODE_FROM_${kind}_${cls.name}`, "emscripten::val", [new CppVar(derivedType, "val")], {
            attributes: "[[maybe_unused]]",
            // Note: the External::New constructor taking a finalizer does an extra heap allocation for the finalizer.
            // We can look into bypassing that if it is a problem.
            body: `
                ${nullCheck}
                return emscripten::val(${this.addon.accessCtor(
                  cls,
                )}.new_(emscripten::val(reinterpret_cast<std::uintptr_t>(new auto(std::move(val))))));
              `,
          }),
        );
      }
    }
    // FIXME double return 0 when using emscripten::val.get_double(), we fall back to get_float()
    assert(
      spec.mixedInfo.getters.find((get) => {
        if (get.dataType === "Double") {
          get.getter = "get_float";
          return true;
        }
        return false;
      }) != undefined,
    );
    this.free_funcs.push(
      new CppFunc("NODE_FROM_Mixed", "emscripten::val", [new CppVar("Mixed", "val")], {
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
      new CppFunc("NODE_TO_Mixed", "Mixed", [new CppVar("emscripten::val", "val")], {
        body: `
          const char* type = val.typeOf().as<std::string>().c_str();
          if (strcmp("string", type) == 0) {
            return strdup(${convertFromEmscripten(this.addon, spec.types["StringData"], "val")});

          } else if (strcmp("boolean", type) == 0) {
            return ${convertFromEmscripten(this.addon, spec.types["bool"], "val")};

          } else if (strcmp("number", type) == 0) {
              // TODO double, int64_t and uint64_t are not passed correctly from JS -> C++ 
              if (emscripten::val::global("Number")["isInteger"](val).as<bool>()) {
                return ${convertFromEmscripten(this.addon, spec.types["int32_t"], "val")};
              } else {
                return val.as<float>();
              }            

          } else if (strcmp("bigint", type) == 0) {
             return val.as<int64_t>(); 
              
          } else if (strcmp("object", type) == 0) {
              if(val.isNull()) {
                return Mixed();
              }
              if (val.instanceof(emscripten::val::global("ArrayBuffer"))) {
                return ${convertFromEmscripten(this.addon, spec.types["BinaryData"], "val")};
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

              // TODO should we check for "boxed" values like 'new Number(1)'?
              const auto ctorName =
              val["constructor"]["name"].as<std::string>().c_str();
    
              emscripten::val(util::format("Unable to convert an object with ctor '(%1)' to a Mixed", ctorName)).throw_();
          } else {
            // NOTE: must not treat undefined as null here, because that makes Optional<Mixed> ambiguous.
            emscripten::val(util::format("Can't convert (%1) to Mixed", val.typeOf().as<std::string>().c_str())).throw_();
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
    void browser_init()
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

    this.boundSpec.classes.forEach((c) => {
      out(`
        void ${c.jsName}_deleter(emscripten::val pointer) {
          // FIXME reenable when investigating currently causing 'Uncaught RuntimeError: memory access out of bounds' 
          // delete reinterpret_cast<${c.cppName}*>(pointer.as<std::uintptr_t>());
        }        
      `);
    });

    // export free functions via embind
    out(`\nEMSCRIPTEN_BINDINGS(realm_c_api) {`);
    this.free_funcs
      .filter((free_func: CppFunc) => {
        // FIXME:  manually exclude some function signatrue causing issue wiht embind (ex: call to deleted constructor of 'realm::ThreadSafeReference')
        const excluded_functions: string[] = [
          "NODE_FROM_CLASS_ThreadSafeReference",
          "NODE_FROM_CLASS_AppSubscriptionToken",
          "NODE_FROM_CLASS_SyncUserSubscriptionToken",
          "NODE_FROM_CLASS_NotificationToken",
        ];
        return free_func.ret.endsWith("emscripten::val") && excluded_functions.indexOf(free_func.name) == -1;
        // return free_func.ret.endsWith("emscripten::val") && free_func.name !in excluded_functions;
      })
      .map((fun: CppFunc) => {
        out(`\nfunction("${fun.name}", &${fun.name});`);
      });

    this.boundSpec.classes.forEach((c) => {
      out(`\nfunction("${c.jsName}_deleter", &${c.jsName}_deleter);`);
    });

    out(`\nemscripten::function("browserInit", &browser_init);`);
    out(`\nfunction("injectInjectables", &injectExternalTypes);`);

    out("\n}");
  }
}

export function generate({ spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("browser_init.cpp", "clang-format");

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of spec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <emscripten/bind.h>
      #include <realm_js_helpers.h>
      #include <realm_js_browser_helpers.h>

      namespace realm::js::browser {
      namespace {
    `);

    new BrowserCppDecls(doJsPasses(bindModel(spec))).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::browser
    `);
}
