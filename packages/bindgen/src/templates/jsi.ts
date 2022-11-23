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
import { CppVar, CppFunc, CppFuncProps, CppCtor, CppMethod, CppClass, CppDecls, CppMemInit } from "../cpp";
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

// Code assumes this is a unique name that is always in scope to refer to the jsi::Runtime.
// Callbacks need to ensure this is in scope. Functions taking Runtime arguments must use this name.
const env = "_env";

const jsi_callback_args = [
  new CppVar("[[maybe_unused]] jsi::Runtime&", "_env"),
  new CppVar("[[maybe_unused]] const jsi::Value&", "thisValue"),
  new CppVar("[[maybe_unused]] const jsi::Value*", "args"),
  new CppVar("[[maybe_unused]] size_t", "count"),
];

function tryWrap(body: string) {
  return `try {
                ${body}
            } catch (const std::exception& ex) {
                throwJsiException(_env, ex);
            }
        `;
}

class CppJsiFunc extends CppFunc {
  constructor(private addon: JsiAddon, name: string, props?: CppFuncProps) {
    super(name, "jsi::Value", jsi_callback_args, props);
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

class JsiAddon extends CppClass {
  exports: string[] = [];
  classes: string[] = [];
  injectables = ["ArrayBuffer", "Float", "UUID", "ObjectId", "Decimal128", "EJSON_parse", "EJSON_stringify"];
  mem_inits: CppMemInit[] = [];

  props = new Set<string>();

  constructor() {
    super("RealmAddon");

    this.members.push(new CppVar("std::deque<std::string>", "m_string_bufs"));
    this.members.push(new CppVar("std::unique_ptr<RealmAddon>", "self", { static: true }));

    this.members.push(new CppVar("jsi::Runtime&", "m_rt"));
    this.mem_inits.push(new CppMemInit("m_rt", "_env"));

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
      this.members.push(new CppVar("std::optional<jsi::Function>", JsiAddon.memberNameFor(t))),
    );
    this.classes.forEach((t) =>
      this.members.push(new CppVar("std::optional<jsi::Function>", JsiAddon.memberNameForExtractor(t))),
    );
    this.addMethod(
      new CppMethod("injectInjectables", "jsi::Value", jsi_callback_args, {
        body: `
          auto ctors = args[0].asObject(_env);
          ${this.injectables
            .map(
              (t) => `${JsiAddon.memberNameFor(t)} = ctors.getProperty(_env, "${t}").asObject(_env).asFunction(_env);`,
            )
            .join("\n")}
          ${this.classes
            .map(
              (cls) =>
                `${JsiAddon.memberNameForExtractor(cls)} =
                  ${JsiAddon.memberNameFor(cls)}->getProperty(_env, "_extract").asObject(_env).asFunction(_env);`,
            )
            .join("\n")}

          return jsi::Value::undefined();
        `,
      }),
    );

    for (const prop of this.props) {
      const mem = JsiAddon.memberNameForProp(prop);
      this.members.push(new CppVar("jsi::PropNameID", mem));
      this.mem_inits.push(new CppMemInit(mem, `jsi::PropNameID::forAscii(_env, "${prop}")`));
    }

    this.addMethod(
      new CppCtor(this.name, [new CppVar("jsi::Runtime&", env), new CppVar("jsi::Object", "exports")], {
        mem_inits: this.mem_inits,
        body: `
            ${this.exports
              .map(
                (name) => `
                  exports.setProperty(_env, "${name}", jsi::Function::createFromHostFunction(
                    _env,
                    jsi::PropNameID::forAscii(_env, "${name}"),
                    1,
                    ${name}));`,
              )
              .join("")};

            using namespace std::placeholders;  // for _1, _2, _3...
            exports.setProperty(_env, "injectInjectables", jsi::Function::createFromHostFunction(
                _env,
                jsi::PropNameID::forAscii(_env, "injectInjectables"),
                1,
                std::bind(&${this.name}::injectInjectables, this, _1, _2, _3, _4)
            ));

            _env.global().setProperty(_env, "__RealmFuncs", std::move(exports));
            `,
      }),
    );
  }

  addFunc(name: string, props?: CppFuncProps) {
    this.exports.push(name);
    return new CppJsiFunc(this, name, props);
  }

  addClass(cls: Class) {
    this.injectables.push(cls.jsName);
    this.classes.push(cls.jsName);
  }

  getPropId(prop: string) {
    this.props.add(prop);
    return `${this.get()}->${JsiAddon.memberNameForProp(prop)}`;
  }

  static memberNameForProp(prop: string) {
    return `m_prop_${prop}`;
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
    return `(*${this.get()}->${JsiAddon.memberNameFor(cls)})`;
  }

  accessExtractor(cls: string | { jsName: string }) {
    return `(*${this.get()}->${JsiAddon.memberNameForExtractor(cls)})`;
  }

  get() {
    return `${this.name}::self`;
  }
}

function convertPrimToJsi(addon: JsiAddon, type: string, expr: string): string {
  switch (type) {
    case "void":
      return `((void)(${expr}), jsi::Value::undefined())`;

    case "bool":
      return `jsi::Value(bool(${expr}))`;

    case "float":
      return `${addon.accessCtor("Float")}.callAsConstructor(_env, {${convertPrimToJsi(addon, "double", expr)}})`;

    case "double":
    case "int32_t":
      return `jsi::Value(double(${expr}))`;

    case "count_t":
      // NOTE: using int64_t cast here to get -1.0 for size_t(-1), aka npos.
      return `jsi::Value(double(int64_t(${expr})))`;

    case "int64_t":
      return `jsi::BigInt::fromInt64(_env, ${expr})`;
    case "uint64_t":
      return `jsi::BigInt::fromUint64(_env, ${expr})`;

    case "StringData":
    case "std::string_view":
    case "std::string":
      return `([&] (auto&& sd) {
                return jsi::String::createFromUtf8(_env, reinterpret_cast<const uint8_t*>(sd.data()), sd.size());
            }(${expr}))`;

    case "EncryptionKey":
    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (const auto& bd) -> jsi::Value {
                auto arr = ${addon.accessCtor("ArrayBuffer")}
                    .callAsConstructor(_env, int(bd.size()))
                    .getObject(_env).getArrayBuffer(_env);
                memcpy(arr.data(_env), bd.data(), bd.size());
                return arr;
            }(${expr}))`;

    case "Mixed":
      return `JS_FROM_Mixed(_env, ${expr})`;
    case "QueryArg":
      // We _could_ support this, but no reason to.
      throw Error("QueryArg should only be used for conversion to C++");

    case "ObjectId":
    case "UUID":
    case "Decimal128":
      return `${addon.accessCtor(type)}.callAsConstructor(_env, {${convertPrimToJsi(
        addon,
        "std::string",
        `${expr}.to_string()`,
      )}})`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return `${addon.accessCtor("EJSON_parse")}.call(_env, {${convertPrimToJsi(addon, "std::string", expr)}})`;

    case "bson::BsonArray":
    case "bson::BsonDocument":
      return convertPrimToJsi(addon, "EJsonObj", `bson::Bson(${expr}).to_string()`);

    case "AppError":
      // This matches old JS SDK. The C++ type will be changing as part of the unify error handleing project.
      return `([&] (const app::AppError& err) {
                auto jsErr = jsi::JSError(_env, err.message).value().getObject(_env);
                jsErr.setProperty(_env, ${addon.getPropId("code")}, double(err.error_code.value()));
                return jsErr;
              }(${expr}))`;
    case "std::exception_ptr":
      return `toJsiException(_env, ${expr})`;
    case "std::error_code":
      return `toJsiErrorCode(_env, ${expr})`;
  }
  assert.fail(`unexpected primitive type '${type}'`);
}
function convertPrimFromJsi(addon: JsiAddon, type: string, expr: string): string {
  // TODO consider using coercion using ToString, ToNumber, ToBoolean.
  switch (type) {
    case "void":
      return `((void)(${expr}))`;

    case "bool":
      return `(${expr}).asBool()`;

    case "double":
      return `(${expr}).asNumber()`;
    case "float":
      return `(${expr}).asObject(_env).getProperty(_env, ${addon.getPropId("value")}).asNumber()`;

    case "int32_t":
      return `int32_t((${expr}).asNumber())`;

    case "count_t":
      // NOTE: using int64_t here is important to correctly handle -1.0 aka npos.
      return `size_t(int64_t((${expr}).asNumber()))`;

    case "int64_t":
      return `${expr}.asBigInt(_env).asInt64(_env)`;
    case "uint64_t":
      return `${expr}.asBigInt(_env).asUint64(_env)`;

    case "std::string":
      return `(${expr}).asString(_env).utf8(_env)`;

    case "StringData":
    case "std::string_view":
      // TODO look into not wrapping if directly converting into an argument.
      return `${addon.get()}->wrapString(${convertPrimFromJsi(addon, "std::string", expr)})`;

    case "OwnedBinaryData":
    case "BinaryData":
      return `([&] (auto&& v) -> ${type} {
                auto buf = FWD(v).asObject(_env).getArrayBuffer(_env);
                auto data = buf.data(_env);
                return BinaryData(data ? reinterpret_cast<const char*>(data) : "", buf.length(_env));
            })(${expr})`;

    case "EncryptionKey":
      return `([&] (auto&& v) -> std::vector<char> {
                auto buf = FWD(v).asObject(_env).getArrayBuffer(_env);
                auto data = buf.data(_env);
                const auto size = buf.length(_env);
                if (size == 0) return {};
                return std::vector<char>(data, data + size);
            })(${expr})`;

    case "Mixed":
      return `JS_TO_Mixed(_env, ${expr})`;
    case "QueryArg": {
      const mixed = new Primitive("Mixed");
      return `
        ([&] (auto&& arg) -> ${new Primitive(type).toCpp()} {
            if (arg.isObject()) {
                auto obj = FWD(arg).getObject(_env);
                const bool isArray = obj.isArray(_env);
                jsi::Value v = std::move(obj); // move back into a value
                if (isArray) {
                  return ${convertFromJsi(addon, new Template("std::vector", [mixed]), "std::move(v)")};
                }
            }
            return ${convertFromJsi(addon, mixed, "FWD(arg)")};
        })(${expr})`;
    }

    case "UUID":
    case "Decimal128":
      return `${type}(${expr}.toString(_env).utf8(_env))`;

    // TODO add a StringData overload to the ObjectId ctor in core so this can merge with above.
    case "ObjectId":
      return `${type}(${expr}.toString(_env).utf8(_env).c_str())`;

    case "EJson":
    case "EJsonObj":
    case "EJsonArray":
      return convertPrimFromJsi(
        addon,
        "std::string",
        `${addon.accessCtor("EJSON_stringify")}.call(_env, {FWD_OR_COPY(${expr})})`,
      );

    case "bson::BsonArray":
    case "bson::BsonDocument":
      return `${type}(bson::parse(${convertPrimFromJsi(addon, "EJsonObj", expr)}))`;

    case "AppError":
      assert.fail("Cannot convert AppError to C++, only from C++.");
  }
  assert.fail(`unexpected primitive type '${type}'`);
}

function convertToJsi(addon: JsiAddon, type: Type, expr: string): string {
  const c = convertToJsi.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimToJsi(addon, type.name, expr);
    case "Pointer":
      return `[&] (const auto& ptr){
          REALM_ASSERT(bool(ptr) && "Must mark nullable pointers with Nullable<> in spec");
          return ${c(type.type, "*ptr")};
      } (${expr})`;

    case "Opaque":
      return `HostRefWrapper<${type.name}&>::create(_env, ${expr})`;

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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `JS_FROM_SHARED_${inner.name}(_env, ${expr})`;
          return c(new Pointer(inner), expr);
        case "Nullable":
          return `[&] (auto&& val) { return !val ? jsi::Value::null() : ${c(inner, "FWD(val)")}; }(${expr})`;
        case "util::Optional":
          return `[&] (auto&& opt) { return !opt ? jsi::Value::undefined() : ${c(inner, "*FWD(opt)")}; }(${expr})`;
        case "std::vector":
          // TODO try different ways to create the array to see what is fastest.
          // eg, try calling push() with and without passing size argument to New().
          return `[&] (auto&& vec) {
                        auto out = jsi::Array(_env, vec.size());
                        size_t i = 0;
                        for (auto&& e : vec) {
                            out.setValueAtIndex(_env, i++, ${c(inner, "e")});
                        }
                        return out;
                    }(${expr})`;
        case "std::pair":
        case "std::tuple":
          return `
            [&] (auto&& tup) {
                auto out = jsi::Array(_env, ${type.args.length});
                ${type.args
                  .map((arg, i) => `out.setValueAtIndex(_env, ${i}, ${c(arg, `std::get<${i}>(FWD(tup))`)});`)
                  .join("\n")}
                return out;
            }(${expr})`;
        case "std::map":
        case "std::unordered_map":
          // Note: currently assuming that key is natively supported by js object setter (string or number).
          return `
            [&] (auto&& map) {
                auto out = jsi::Object(_env);
                for (auto&& [k, v] : map) {
                    out.setProperty(
                      _env,
                      ${c(type.args[0], "k")},
                      ${c(type.args[1], "v")});
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
      return `JS_FROM_CLASS_${type.name}(_env, ${expr})`;

    case "Struct":
      return `${type.toJsi().name}(_env, ${expr})`;

    case "Func":
      // TODO: see if we want to try to propagate a function name in rather than always making them anonymous.
      return `
          [&] (auto&& cb) -> jsi::Value {
              if constexpr(std::is_constructible_v<bool, decltype(cb)>) {
                  REALM_ASSERT(bool(cb) && "Must mark nullable callbacks with Nullable<> in spec");
              }
              return jsi::Function::createFromHostFunction(_env, ${addon.getPropId("callback")}, ${type.args.length},
                  [cb = MakeCopyable(FWD(cb))]
                  (jsi::Runtime& _env, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value
                  {
                      const auto callBlock = ${addon.get()}->startCall();
                      REALM_ASSERT_3(count, ==, ${type.args.length}u);
                      ${tryWrap(`
                          return ${c(
                            type.ret,
                            `cb(${type.args
                              .map((arg, i) => convertFromJsi(addon, arg.type, `args[${i}]`))
                              .join(", ")})`,
                          )};
                      `)}
                  });
          }(${expr})`;

    case "Enum":
      return `[&]{
                static_assert(sizeof(${type.cppName}) <= sizeof(int32_t), "we only support enums up to 32 bits");
                return jsi::Value(_env, int(${expr}));
            }()`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}
function convertFromJsi(addon: JsiAddon, type: Type, expr: string): string {
  const c = convertFromJsi.bind(null, addon); // shortcut for recursion
  switch (type.kind) {
    case "Primitive":
      return convertPrimFromJsi(addon, type.name, expr);
    case "Pointer":
      return `&(${c(type.type, expr)})`;
    case "Opaque":
      return `HostRefWrapper<${type.name}&>::extract(_env, ${expr})`;

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
          if (inner.kind == "Class" && inner.sharedPtrWrapped) return `JS_TO_SHARED_${inner.name}(_env, ${expr})`;
          return `std::make_shared<${inner.toCpp()}>(${c(inner, expr)})`;
        case "Nullable":
          return `[&] (auto&& val) {
              return val.isNull() ? ${inner.toCpp()}() : ${c(inner, "FWD(val)")};
          }(${expr})`;
        case "util::Optional":
          return `[&] (auto&& val) {
              return val.isUndefined() ? ${type.toCpp()}() : ${c(inner, "FWD(val)")};
          }(${expr})`;
        case "std::vector":
          return `[&] (jsi::Array vec) {
                auto out = std::vector<${inner.toCpp()}>();

                const size_t length = vec.length(_env);
                out.reserve(length);
                for (size_t i = 0; i < length; i++) {
                    out.push_back(${c(inner, "vec.getValueAtIndex(_env, i)")});
                }
                return out;
            }((${expr}).getObject(_env).getArray(_env))`;

        case "std::tuple":
        case "std::pair":
          const suffix = type.name.split(":")[2];
          const nArgs = type.args.length;
          return `[&] (const jsi::Array& arr) {
              if (arr.length(_env) != ${nArgs}u)
                throw jsi::JSError(_env, "Need an array with exactly ${nArgs} elements");
              return std::make_${suffix}(${type.args.map((arg, i) => c(arg, `arr.getValueAtIndex(_env, ${i}u)`))});
          }((${expr}).getObject(_env).getArray(_env))`;
        case "std::map":
        case "std::unordered_map":
          // For now, can only convert string-keyed maps to C++.
          // We could also support numbers pretty easily. Anything else will be problematic.
          // Consider list-of-pairs for keys that aren't strings or numbers.
          assert.deepEqual(type.args[0], new Primitive("std::string"));
          return `[&] (jsi::Object obj) {
                auto out = ${type.toCpp()}();
                const auto names = obj.getPropertyNames(_env);
                const auto length = names.length(_env);
                for (size_t i = 0; i < length; i++) {
                    auto name = names.getValueAtIndex(_env, i).getString(_env);
                    out.insert({
                        name.utf8(_env),
                        ${c(type.args[1], "obj.getProperty(_env, name)")}
                    });
                }
                return out;
            }((${expr}).getObject(_env))`;
        case "AsyncCallback":
        case "util::UniqueFunction":
        case "std::function":
          return `${type.toCpp()}(${c(inner, expr)})`;
      }
      assert.fail(`unknown template ${type.name}`);
      break;

    case "Class":
      if (type.sharedPtrWrapped) return `*JS_TO_SHARED_${type.name}(_env, ${expr})`;
      return `JS_TO_CLASS_${type.name}(_env, ${expr})`;

    case "Struct":
      return `${type.fromJsi().name}(_env, ${expr})`;

    case "Func":
      // TODO see if we ever need to do any conversion from jsi::JSError exceptions to something else.
      // TODO see if the ThreadConfinementChecker is ever too expensive in release builds.
      // Note: putting the jsi::Function in a shared_ptr because some of these need to be put into a std::function
      // which requires copyability, but jsi::Functions are move-only.
      const lambda = `
        [
          _cb = std::make_shared<jsi::Function>(${expr}.getObject(_env).getFunction(_env)),
          _thread = ThreadConfinementChecker()
        ]
        (${type.args
          .map(({ name, type }) => `${type.toCpp()} ${type.isTemplate("IgnoreArgument") ? "" : name}`)
          .join(", ")}
        ) -> ${type.ret.toCpp()}
        {
            _thread.assertOnSameThread();
            auto& _env = ${addon.get()}->m_rt;
            return ${c(
              type.ret,
              `_cb->call(
                  _env,
                  {${type
                    .argsSkippingIgnored()
                    .map(({ name, type }) => convertToJsi(addon, type, `FWD(${name})`))
                    .join(", ")}})`,
            )};
        }`;

      if (!type.isOffThread) return lambda;

      // For now assuming that all void-returning functions are "notifications" and don't need to block until done.
      // Non-void returning functions *must* block so they have something to return.
      const shouldBlock = !type.ret.isVoid();
      return shouldBlock ? `schedulerWrapBlockingFunction(${lambda})` : `util::EventLoopDispatcher(${lambda})`;

    case "Enum":
      return `${type.cppName}((${expr}).getNumber())`;

    default:
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}

declare module "../bound-model" {
  interface Struct {
    toJsi: () => CppFunc;
    fromJsi: () => CppFunc;
  }
  interface Method {
    readonly jsiDescriptorType: string;
  }
}

function constCast<T>(obj: T) {
  return obj as { -readonly [k in keyof T]: T[k] };
}

constCast(InstanceMethod.prototype).jsiDescriptorType = "InstanceMethod";
constCast(StaticMethod.prototype).jsiDescriptorType = "StaticMethod";
constCast(Property.prototype).jsiDescriptorType = "InstanceAccessor";

class JsiCppDecls extends CppDecls {
  addon = pushRet(this.classes, new JsiAddon());
  constructor(spec: BoundSpec) {
    super();

    for (const struct of spec.records) {
      // Lazily create the to/from conversions only as needed. This is important because some structs
      // can only be converted in one direction.
      let toJsi: CppFunc | undefined;
      let fromJsi: CppFunc | undefined;

      struct.toJsi = () => {
        if (!toJsi) {
          toJsi = new CppFunc(
            `STRUCT_TO_JS_${struct.name}`,
            "jsi::Value",
            [new CppVar("jsi::Runtime&", env), new CppVar(`const ${struct.cppName}&`, "in")],
            {
              body: `
                    auto out = jsi::Object(_env);
                    ${struct.fields
                      .filter((field) => !field.type.isFunction())
                      .map(
                        (field) =>
                          `out.setProperty(
                            _env,
                            ${this.addon.getPropId(field.jsName)},
                            ${convertToJsi(this.addon, field.type, `in.${field.cppName}`)});`,
                      )
                      .join("\n")}
                    return out;
                `,
            },
          );
          this.free_funcs.push(toJsi);
        }
        return toJsi;
      };

      struct.fromJsi = () => {
        if (!fromJsi) {
          for (const field of struct.fields) {
            if (field.cppName && field.cppName.endsWith(")")) {
              // If this fires, we should consider a way to mark these fields as only being for one-way conversion.
              throw new Error(
                `Attempting JS->C++ conversion of ${struct.name}::${field.name} which looks like it may be a method`,
              );
            }
          }
          fromJsi = new CppFunc(
            `STRUCT_FROM_JS_${struct.name}`,
            struct.cppName,
            [new CppVar("jsi::Runtime&", env), new CppVar("auto&&", "val")],
            {
              body: `
                auto obj = FWD(val).asObject(_env);
                auto out = ${struct.cppName}();
                ${struct.fields
                  .map(
                    (field) => `{
                        auto field = obj.getProperty(_env, ${this.addon.getPropId(field.jsName)});
                        if (!field.isUndefined()) {
                            // Make functions on structs behave like bound methods.
                            if (field.isObject()) {
                                auto fieldObj = field.getObject(_env);
                                if (fieldObj.isFunction(_env)) {
                                    field = fieldObj
                                        .getProperty(_env,
                                          ${this.addon.getPropId("bind")})
                                        .getObject(_env).getFunction(_env)
                                        .callWithThis(_env, fieldObj, obj);
                                }
                            }
                            out.${field.cppName} = ${convertFromJsi(this.addon, field.type, "FWD(field)")};
                        } else if constexpr (${field.required ? "true" : "false"}) {
                            throw jsi::JSError(_env, "${struct.jsName}::${field.jsName} is required");
                        }
                    }`,
                  )
                  .join("\n")}
                return out;
            `,
            },
          );
          this.free_funcs.push(fromJsi);
        }
        return fromJsi;
      };
    }

    for (const cls of spec.classes) {
      // TODO need to do extra work to enable JS implementation of interfaces

      assert(
        !cls.sharedPtrWrapped || (!cls.base && cls.subclasses.length == 0),
        `We don't support mixing sharedPtrWrapped and class hierarchies. ${cls.name} requires this.`,
      );

      this.addon.addClass(cls);

      // TODO look into more efficient storage for types that aren't part of a hierarchy
      const baseType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.rootBase().cppName;
      const derivedType = cls.sharedPtrWrapped ? `std::shared_ptr<${cls.cppName}>` : cls.cppName;
      const ptr = (expr: string) => `(&HostRefWrapper<${baseType}&>::extract(_env, ${expr}))`;
      const casted = (expr: string) => (cls.base ? `static_cast<${derivedType}*>(${ptr(expr)})` : ptr(expr));
      const self = `(${cls.needsDeref ? "**" : "*"}${casted("args[0]")})`;

      for (const method of cls.methods) {
        const argOffset = method.isStatic ? 0 : 1; // `this` takes arg 0 if not static
        const args = method.sig.args.map((a, i) => convertFromJsi(this.addon, a.type, `args[${i + argOffset}]`));

        this.free_funcs.push(
          this.addon.addFunc(method.id, {
            body: `
              if (count != ${args.length + argOffset})
                  throw jsi::JSError(_env, "expected ${args.length} arguments");
              return ${convertToJsi(this.addon, method.sig.ret, method.call({ self }, ...args))};
            `,
          }),
        );
      }

      if (cls.iterable) {
        this.free_funcs.push(
          this.addon.addFunc(cls.iteratorMethodId(), {
            body: `
              if (count != 1)
                  throw jsi::JSError(_env, "expected 0 arguments");

              auto& self = ${self};
              auto jsIt = jsi::Object(_env);
              jsIt.setProperty(_env, "_keepAlive", args[0]);
              jsIt.setProperty(_env, "next", jsi::Function::createFromHostFunction(
                  _env,
                  ${this.addon.getPropId("next")},
                  0,
                  [it = self.begin(), end = self.end()] (${jsi_callback_args.map((a) => a.arg_definition())}) mutable {
                      auto ret = jsi::Object(_env);
                      if (it == end) {
                          ret.setProperty(_env, ${this.addon.getPropId("done")}, jsi::Value(true));
                      } else {
                          ret.setProperty(
                            _env,
                            ${this.addon.getPropId("value")},
                            ${convertToJsi(this.addon, cls.iterable, "*it")});
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

      this.free_funcs.push(
        new CppFunc(
          `JS_TO_${kind}_${cls.name}`,
          refType,
          [new CppVar("jsi::Runtime&", "_env"), new CppVar("const jsi::Value&", "val")],
          {
            attributes: "[[maybe_unused]]",
            body: `
              auto external = ${this.addon.accessExtractor(cls)}.call(_env, &val, size_t(1));
              const auto ptr = ${casted(`external`)};
              ${cls.sharedPtrWrapped ? `if (!*ptr) throwNullSharedPtrError(_env, "${cls.name}");` : ""}
              return *ptr;
          `,
          },
        ),
      );

      const nullCheck = cls.sharedPtrWrapped
        ? 'REALM_ASSERT(bool(val) && "Must mark nullable pointers with Nullable<> in spec");'
        : "";

      if (!cls.abstract) {
        this.free_funcs.push(
          new CppFunc(
            `JS_FROM_${kind}_${cls.name}`,
            "jsi::Value",
            [new CppVar("jsi::Runtime&", env), new CppVar(derivedType, "val")],
            {
              attributes: "[[maybe_unused]]",
              // Note: the External::New constructor taking a finalizer does an extra heap allocation for the finalizer.
              // We can look into bypassing that if it is a problem.
              body: `
                ${nullCheck}
                return ${this.addon.accessCtor(cls)}.callAsConstructor(_env, {
                      HostObjClassWrapper<${derivedType}, ${baseType}>::create(_env, std::move(val))
                });
              `,
            },
          ),
        );
      }
    }

    this.free_funcs.push(
      new CppFunc("JS_FROM_Mixed", "jsi::Value", [new CppVar("jsi::Runtime&", env), new CppVar("Mixed", "val")], {
        body: `
          if (val.is_null())
              return jsi::Value::null();
          switch (val.get_type()) {
          ${spec.mixedInfo.getters
            .map(
              (g) => `
                case DataType::Type::${g.dataType}:
                  return ${convertToJsi(this.addon, g.type, `val.${g.getter}()`)};
              `,
            )
            .join("\n")}
          // The remaining cases are never stored in a Mixed.
          ${spec.mixedInfo.unusedDataTypes.map((t) => `case DataType::Type::${t}: break;`).join("\n")}
          }
          REALM_UNREACHABLE();
        `,
      }),
      new CppFunc("JS_TO_Mixed", "Mixed", [new CppVar("jsi::Runtime&", env), new CppVar("auto&&", "val")], {
        body: `
          if (val.isNull())
              return Mixed();
          if (val.isString())
              return ${convertFromJsi(this.addon, spec.types["StringData"], "val")};
          if (val.isNumber())
              return ${convertFromJsi(this.addon, spec.types["double"], "val")};
          if (val.isBigInt())
              return ${convertFromJsi(this.addon, spec.types["int64_t"], "val")};
          if (val.isBool())
              return ${convertFromJsi(this.addon, spec.types["bool"], "val")};
          if (val.isObject()) {
              auto obj = std::move(val).asObject(_env);
              if (obj.isArrayBuffer(_env)) {
                return ${convertFromJsi(this.addon, spec.types["BinaryData"], "jsi::Value(std::move(obj))")};
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
                      `else if (obj.instanceOf(_env, ${this.addon.accessCtor(jsName)})) {
                          return ${convertFromJsi(this.addon, spec.types[typeName], "jsi::Value(std::move(obj))")};
                      }`,
                  )
                  .join(" ")
              } else if (obj.isFunction(_env)) {
                throw jsi::JSError(_env, "Unable to convert a function to a Mixed");
              } else if (obj.isHostObject(_env)) {
                throw jsi::JSError(_env, "Unable to convert a native host object to a Mixed");
              }

              // TODO should we check for "boxed" values like 'new Number(1)'?

              const auto ctorName = obj
                  .getProperty(_env, "constructor").getObject(_env)
                  .getProperty(_env, "name").asString(_env).utf8(_env);
              throw jsi::JSError(_env, "Unable to convert an object with ctor '" + ctorName + "' to a Mixed");
          }
          // NOTE: must not treat undefined as null here, because that makes Optional<Mixed> ambiguous.
          throw jsi::JSError(_env, "Can't convert " + val.toString(_env).utf8(_env) + " to Mixed");
        `,
      }),
    );

    this.addon.generateMembers();
  }

  // TODO delete unless needed.
  outputDefsTo(out: (...parts: string[]) => void) {
    super.outputDefsTo(out);
  }
}

export function generate({ spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("jsi_init.cpp", "clang-format");

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of spec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <jsi/jsi.h>
      #include <realm_js_jsi_helpers.h>

      // Using all-caps JSI to avoid risk of conflicts with jsi namespace from fb.
      namespace realm::js::JSI {
      namespace {
    `);

  new JsiCppDecls(doJsPasses(bindModel(spec))).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::JSI
    `);
}
