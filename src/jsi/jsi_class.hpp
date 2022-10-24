////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#pragma once
#include "jsi_types.hpp"
#include "jsi_return_value.hpp"
#include "jsi_string.hpp"
#include "jsi_object.hpp"

#include "js_class.hpp"
#include "js_util.hpp"

#include <ctype.h>
#include <unordered_set>
#include <vector>
#include <functional>
#include <string>
#include <unordered_map>
#include <exception>

namespace realm::js {

template <typename T>
struct RealmObjectClass;
template <typename T>
class RealmClass;

namespace fbjsi = facebook::jsi;

template <>
struct Arguments<realmjsi::Types> {
    const std::vector<JsiVal> valStorage;
    const JsiEnv ctx;
    const size_t count;
    const JsiVal* const value;

    Arguments(JsiEnv env, size_t argc, const JsiVal* argv)
        : ctx(env)
        , count(argc)
        , value(argv)
    {
    }

    Arguments(JsiEnv env, size_t argc, const fbjsi::Value* argv)
        : valStorage([&] {
            std::vector<JsiVal> out;
            out.reserve(argc);
            for (size_t i = 0; i < argc; i++) {
                out.emplace_back(env, argv[i]);
            }
            return out;
        }())
        , ctx(env)
        , count(argc)
        , value(valStorage.data())
    {
    }

    // If moving or copying were allowed, we would need to update value's pointer
    Arguments(Arguments&&) = delete;

    JsiVal operator[](size_t index) const noexcept
    {
        if (index >= count) {
            return ctx.undefined();
        }
        return ctx(value[index]);
    }

    void validate_maximum(size_t max) const
    {
        if (max < count) {
            throw std::invalid_argument(
                util::format("Invalid arguments: at most %1 expected, but %2 supplied.", max, count));
        }
    }

    void validate_count(size_t expected) const
    {
        if (count != expected) {
            throw std::invalid_argument(
                util::format("Invalid arguments: %1 expected, but %2 supplied.", expected, count));
        }
    }

    void validate_between(size_t min, size_t max) const
    {
        if (count < min || count > max) {
            throw std::invalid_argument(
                util::format("Invalid arguments: expected between %1 and %2, but %3 supplied.", min, max, count));
        }
    }
};

namespace realmjsi { // realm::js::realmjsi

inline std::optional<fbjsi::Object> ObjectGetOwnPropertyDescriptor(JsiEnv env, const fbjsi::Object& target,
                                                                   const std::string& name)
{
    auto obj = js::globalType(env, "Object");
    auto res = obj.getPropertyAsFunction(env, "getOwnPropertyDescriptor").callWithThis(env, obj, target, name);
    if (!res.isObject())
        return {};
    return std::move(res).getObject(env);
}

inline void ObjectSetPrototypeOf(JsiEnv env, const fbjsi::Value& target, const fbjsi::Value& proto)
{
    auto obj = js::globalType(env, "Object");
    obj.getPropertyAsFunction(env, "setPrototypeOf").callWithThis(env, obj, target, proto);
}

// Cache various objects we fetch from the runtime which are hot paths
// during object creation
static std::optional<fbjsi::Function> s_object;
static std::optional<fbjsi::Function> s_object_create;

inline JsiObj ObjectCreate(JsiEnv env, const fbjsi::Object& proto)
{
    if (REALM_UNLIKELY(!s_object)) {
        s_object = js::globalType(env, "Object");
    }
    if (REALM_UNLIKELY(!s_object_create)) {
        s_object_create = (*s_object).getPropertyAsFunction(env, "create");
    }

    return env(s_object_create->call(env, proto)).asObject();
}

inline void defineProperty(JsiEnv env, const fbjsi::Object& target, StringData name, const fbjsi::Object& descriptor)
{
    auto objClass = js::globalType(env, "Object");
    objClass.getPropertyAsFunction(env, "defineProperty")
        .callWithThis(env, objClass, target, str(env, name), descriptor);
};

inline void copyProperty(JsiEnv env, const fbjsi::Object& from, const fbjsi::Object& to, const std::string& name)
{
    auto prop = ObjectGetOwnPropertyDescriptor(env, from, name);
    REALM_ASSERT_RELEASE(prop);
    defineProperty(env, to, name, *prop);
}

// The name used for the property on the JS object which stores the reference to the corresponding C++ object.
// We use an empty string as testing showed it was 1% faster with JSC and 4% faster with Hermes than using
// an actual string, and also has the benefit that it is not a valid Realm object key name.
inline constexpr const char g_internal_field[] = "";

template <typename T>
using ClassDefinition = js::ClassDefinition<js::realmjsi::Types, T>;

using ConstructorType = js::ConstructorType<js::realmjsi::Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<js::realmjsi::Types>;
using ReturnValue = js::ReturnValue<js::realmjsi::Types>;
using Arguments = js::Arguments<js::realmjsi::Types>;
using PropertyType = js::PropertyType<js::realmjsi::Types>;
using IndexPropertyType = js::IndexPropertyType<js::realmjsi::Types>;
using StringPropertyType = js::StringPropertyType<js::realmjsi::Types>;

template <typename T>
class Wrapper : public fbjsi::HostObject {
public:
    template <typename... Args, typename = std::enable_if_t<std::is_constructible_v<T, Args...>>>
    Wrapper(Args&&... args)
        : obj(std::forward<Args>(args)...)
    {
    }

    T obj;
};

template <typename T>
inline T& unwrap(Wrapper<T>& wrapper)
{
    return wrapper.obj;
}

template <typename T>
inline T& unwrap(const std::shared_ptr<Wrapper<T>>& wrapper)
{
    return unwrap<T>(*wrapper);
}

template <typename T>
inline T& unwrap(JsiEnv env, const fbjsi::Object& wrapper)
{
    return unwrap<T>(wrapper.getHostObject<Wrapper<T>>(env));
}

template <typename T>
inline T& unwrap(JsiEnv env, const fbjsi::Value& wrapper)
{
    return unwrap<T>(env, wrapper.asObject(env));
}

template <typename T>
inline T& unwrap(const JsiObj& wrapper)
{
    return unwrap<T>(wrapper.env(), wrapper.get());
}

template <typename T>
inline T& unwrap(const JsiVal& wrapper)
{
    return unwrap<T>(wrapper.env(), wrapper.get());
}

template <typename T, typename U>
inline T* unwrapUnique(JsiEnv env, const U& arg)
{
    return unwrap<std::unique_ptr<T>>(env, arg).get();
}

template <typename T>
JsiObj wrap(JsiEnv env, T arg)
{
    return env(fbjsi::Object::createFromHostObject(env, std::make_shared<Wrapper<T>>(std::move(arg))));
}

template <typename T, typename... Args, typename = std::enable_if_t<std::is_constructible_v<T, Args...>>>
JsiObj wrap(JsiEnv env, Args&&... args)
{
    return env(fbjsi::Object::createFromHostObject(env, std::make_shared<Wrapper<T>>(std::forward<Args>(args)...)));
}

template <typename T>
JsiObj wrapUnique(JsiEnv env, T* arg)
{
    return wrap(env, std::unique_ptr<T>(arg));
}

template <typename T>
class ObjectWrap {
public:
    using Internal = typename T::Internal;
    using ParentClassType = typename T::Parent;

    // NOTE:  if this is static, it won't support multiple runtimes.
    // Also, may need to suppress destruction.
    inline static std::optional<JsiFunc> s_ctor;

    // Cache the JSI String instance representing the field name of the internal
    // C++ object for the lifetime of the current env, as this is a hot path
    inline static std::optional<fbjsi::String> s_js_internal_field_name;

    // Cache various objects we fetch from the runtime which are hot paths
    // during object creation
    inline static std::optional<fbjsi::Object> s_proto;
    inline static std::optional<fbjsi::Function> s_wrapper;

    /**
     * @brief callback for invalid access to index setters
     * Throws an error when a users attemps to write to an index on a type that
     * doesn't support it.
     *
     * @return nothing; always throws
     */
    static fbjsi::Value readonly_index_setter_callback(fbjsi::Runtime& env, const fbjsi::Value& thisVal,
                                                       const fbjsi::Value* args, size_t count)
    {
        throw fbjsi::JSError(env, "Cannot assign to index");
    }

    /**
     * @brief callback for invalid access to property setters
     * Trows an error when a user attempts to write to a read-only property
     *
     * @param propname name of the property the user is trying to write to
     * @return nothin; always throws
     */
    static fbjsi::Value readonly_setter_callback(fbjsi::Runtime& env, const fbjsi::Value& thisVal,
                                                 const fbjsi::Value* args, size_t count, std::string const& propname)
    {
        throw fbjsi::JSError(env, util::format("Cannot assign to read only property '%1'", propname));
    }

    static JsiFunc create_constructor(JsiEnv env)
    {
        if (s_ctor) {
            return *s_ctor;
        }

        auto& s_type = get_class();

        auto nativeFunc = !bool(s_type.constructor)
                              ? fbjsi::Value()
                              : fbjsi::Function::createFromHostFunction(
                                    env, propName(env, s_type.name), /* paramCount verified by callback */ 0,
                                    [](fbjsi::Runtime& rt, const fbjsi::Value&, const fbjsi::Value* args,
                                       size_t count) -> fbjsi::Value {
                                        REALM_ASSERT_RELEASE(count >= 1);
                                        auto env = JsiEnv(rt);
                                        auto& s_type = get_class();
                                        auto arguments = Arguments{env, count - 1, args + 1};
                                        s_type.constructor(env, env(args[0]).asObject(), arguments);
                                        return fbjsi::Value();
                                    });

        s_ctor = env(globalType(env, "Function")
                         .call(env, "nativeFunc",
                               util::format(R"(
                      return function %1(...args) {
                          // Allow explicit construction only for classes with a constructor
                          if (new.target && !nativeFunc) {
                              throw TypeError("Illegal constructor");
                          }
                          if (nativeFunc)
                              nativeFunc(this, ...args);

                          if ('_proxyWrapper' in %1)
                              return %1._proxyWrapper(this);
                      })",
                                            s_type.name))
                         .asObject(env)
                         .asFunction(env)
                         .call(env, std::move(nativeFunc))
                         .asObject(env)
                         .asFunction(env));

        js::Context<js::realmjsi::Types>::register_invalidator([] {
            // Ensure all static references tied to the runtime are destructed when the runtime goes away.
            // This is to avoid reassignment and destruction throwing because the runtime has disappeared.
            s_ctor.reset();
            s_js_internal_field_name.reset();
            s_proto.reset();
            s_wrapper.reset();
            s_object.reset();
            s_object_create.reset();
        });

        for (auto&& [name, prop] : s_type.static_properties) {
            auto desc = fbjsi::Object(env);
            if (prop.getter) {
                desc.setProperty(env, "get", funcVal(env, "get_" + name, 0, prop.getter));
            }
            if (prop.setter) {
                desc.setProperty(env, "set", funcVal(env, "set_" + name, 1, prop.setter));
            }
            else {
                desc.setProperty(
                    env, "set",
                    funcVal(env, "set_" + name, 0,
                            std::bind(ObjectWrap::readonly_setter_callback, std::placeholders::_1,
                                      std::placeholders::_2, std::placeholders::_3, std::placeholders::_4, name)));
            }
            defineProperty(env, *s_ctor, name, desc);
        }

        for (auto&& [name, method] : s_type.static_methods) {
            auto desc = fbjsi::Object(env);
            desc.setProperty(env, "value",
                             funcVal(env, name, /* paramCount must be verified by callback */ 0, method));
            defineProperty(env, *s_ctor, name, desc);
        }

        auto proto = (*s_ctor)->getPropertyAsObject(env, "prototype");

        for (auto&& [name, prop] : s_type.properties) {
            auto desc = fbjsi::Object(env);
            if (prop.getter) {
                desc.setProperty(env, "get", funcVal(env, "get_" + name, 0, prop.getter));
            }
            if (prop.setter) {
                desc.setProperty(env, "set", funcVal(env, "set_" + name, 1, prop.setter));
            }
            else {
                desc.setProperty(
                    env, "set",
                    funcVal(env, "set_" + name, 0,
                            std::bind(ObjectWrap::readonly_setter_callback, std::placeholders::_1,
                                      std::placeholders::_2, std::placeholders::_3, std::placeholders::_4, name)));
            }
            defineProperty(env, proto, name, desc);
        }

        for (auto&& [name, method] : s_type.methods) {
            auto desc = fbjsi::Object(env);
            desc.setProperty(env, "value",
                             funcVal(env, name, /* paramCount must be verified by callback */ 0, method));
            defineProperty(env, proto, name, desc);
        }

        if constexpr (!std::is_void_v<ParentClassType>) {
            REALM_ASSERT_RELEASE(ObjectWrap<ParentClassType>::s_ctor);
            JsiFunc parentCtor = *ObjectWrap<ParentClassType>::s_ctor;

            auto parentProto = parentCtor->getProperty(env, "prototype");
            if (parentProto.isUndefined()) {
                throw std::runtime_error("undefined 'prototype' on parent constructor");
            }

            ObjectSetPrototypeOf(env, fbjsi::Value(env, proto), fbjsi::Value(std::move(parentProto)));
            ObjectSetPrototypeOf(env, fbjsi::Value(env, s_ctor->get()), fbjsi::Value(std::move(parentCtor.get())));
        }

        if (s_type.index_accessor) {
            // Code below assumes getter is present, and it doesn't make sense to have setter without one.
            REALM_ASSERT_RELEASE(s_type.index_accessor.getter);

            // XXX Do we want to trap things like ownKeys() and getOwnPropertyDescriptors() to support for...in?
            auto [getter, setter] = s_type.index_accessor;
            auto desc = fbjsi::Object(env);

            s_wrapper =
                globalType(env, "Function")
                    .call(env, "getter", "setter", R"(
                        const integerPattern = /^-?\d+$/;
                        function getIndex(prop) {
                            if (typeof prop === "string" && integerPattern.test(prop)) {
                                return parseInt(prop, 10);
                            } else {
                                return Number.NaN;
                            }
                        }
                        const handler = {
                            ownKeys(target) {
                                const out = Reflect.ownKeys(target)
                                const end = target.length
                                for (let i = 0; i < end; i++) {
                                    out.push(String(i));
                                }
                                return out;
                            },
                            getOwnPropertyDescriptor(target, prop) {
                                const index = getIndex(prop);
                                if (Number.isNaN(index)) {
                                    return Reflect.getOwnPropertyDescriptor(...arguments);
                                } else if (index >= 0 && index < target.length) {
                                    return {
                                        configurable: true,
                                        enumerable: true,
                                    };
                                }
                            },
                            get(target, prop, receiver) {
                                const index = getIndex(prop);
                                if (Number.isNaN(index)) {
                                    return Reflect.get(...arguments);
                                } else if (index >= 0 && index < target.length) {
                                    return getter(target, index);
                                }
                            },
                            set(target, prop, value, receiver) {
                                const index = getIndex(prop);
                                if (Number.isNaN(index)) {
                                    return Reflect.set(...arguments);
                                } else if (index < 0) {
                                    // This mimics realm::js::validated_positive_index
                                    throw new Error(`Index ${index} cannot be less than zero.`);
                                } else {
                                    return setter(target, index, value);
                                }
                            }
                        }
                        return (obj) => new Proxy(obj, handler);
                    )")
                    .asObject(env)
                    .asFunction(env)
                    .call(env, funcVal(env, "getter", 0, getter),
                          funcVal(env, "setter", 1, setter ? setter : ObjectWrap::readonly_index_setter_callback))
                    .asObject(env)
                    .asFunction(env);

            desc.setProperty(env, "value", *s_wrapper);
            defineProperty(env, *s_ctor, "_proxyWrapper", desc);
        }

        return *s_ctor;
    }

    static JsiObj create_instance(JsiEnv env, Internal* ptr = nullptr)
    {
        if (REALM_UNLIKELY(!s_proto)) {
            s_proto = (*s_ctor)->getPropertyAsObject(env, "prototype");
        }

        auto obj = ObjectCreate(env, *s_proto);

        set_internal(env, obj, ptr);

        if (s_wrapper) {
            obj = env((*s_wrapper).call(env, std::move(obj.get()))).asObject();
        }

        return obj;
    }

    static JsiObj create_instance_by_schema(JsiEnv env, JsiFunc& constructor, const realm::ObjectSchema& schema,
                                            Internal* internal = nullptr)
    {
        return create_instance_by_schema(env, &constructor, schema, internal);
    }
    static JsiObj create_instance_by_schema(JsiEnv env, const realm::ObjectSchema& schema,
                                            Internal* internal = nullptr)
    {
        return create_instance_by_schema(env, nullptr, schema, internal);
    }

    static void on_context_destroy(JsiEnv, std::string realmPath)
    {
        get_schemaObjectTypes().erase(realmPath);
    }

    static bool is_instance(JsiEnv env, JsiObj object)
    {
        return object->instanceOf(env, *s_ctor);
    }

    static Internal* get_internal(JsiEnv env, const JsiObj& object)
    {
        if (REALM_UNLIKELY(!s_js_internal_field_name)) {
            s_js_internal_field_name = fbjsi::String::createFromAscii(env, g_internal_field);
        }

        auto internal = object->getProperty(env, *s_js_internal_field_name);
        if (internal.isUndefined()) {
            // In the case of a user opening a Realm with a class-based model,
            // the user defined constructor will get called before the "internal" property has been set.
            if constexpr (std::is_same_v<T, RealmObjectClass<realmjsi::Types>>)
                return nullptr;
            throw fbjsi::JSError(env, "no internal field");
        }
        // The following check is disabled to support user defined classes that doesn't extend Realm.Object
        // if (!JsiObj(object)->instanceOf(env, *s_ctor)) {
        //     throw fbjsi::JSError(env, "calling method on wrong type of object");
        // }
        return unwrapUnique<Internal>(env, std::move(internal));
    }
    static void set_internal(JsiEnv env, const JsiObj& object, Internal* data)
    {
        auto desc = fbjsi::Object(env);
        desc.setProperty(env, "value", wrapUnique(env, data));
        desc.setProperty(env, "configurable", true);
        defineProperty(env, object, g_internal_field, desc);
    }

private:
    static fbjsi::Value funcVal(JsiEnv env, const std::string& name, size_t args, fbjsi::HostFunctionType&& func)
    {
        if (!func)
            return fbjsi::Value();
        return fbjsi::Value(
            fbjsi::Function::createFromHostFunction(env, propName(env, name), uint32_t(args), std::move(func)));
    };

    static void defineSchemaProperties(JsiEnv env, const fbjsi::Object& constructorPrototype,
                                       const realm::ObjectSchema& schema, bool redefine)
    {
        // Do the same thing for all computed and persisted properties
        auto loopBody = [&](const Property& property) {
            const auto& name = property.public_name.empty() ? property.name : property.public_name;
            // TODO should this use hasOwnProperty?
            if (!redefine && constructorPrototype.hasProperty(env, str(env, name))) {
                return;
            }

            auto desc = fbjsi::Object(env);
            desc.setProperty(env, "enumerable", true);

            desc.setProperty(env, "get",
                             funcVal(env, "get_" + name, 0,
                                     [name = String(name)](fbjsi::Runtime& rt, const fbjsi::Value& thisVal,
                                                           const fbjsi::Value* args, size_t count) {
                                         if (count != 0)
                                             throw fbjsi::JSError(rt, "getters take no arguments");
                                         return get_class().string_accessor.getter(rt, thisVal, name);
                                     }));
            desc.setProperty(env, "set",
                             funcVal(env, "set_" + name, 1,
                                     [name = String(name)](fbjsi::Runtime& rt, const fbjsi::Value& thisVal,
                                                           const fbjsi::Value* args, size_t count) {
                                         if (count != 1)
                                             throw fbjsi::JSError(rt, "setters take exactly 1 argument");
                                         return get_class().string_accessor.setter(rt, thisVal, name, args[0]);
                                     }));

            defineProperty(env, constructorPrototype, name, desc);
        };

        for (auto&& property : schema.persisted_properties) {
            loopBody(property);
        }
        for (auto&& property : schema.computed_properties) {
            loopBody(property);
        }
    }

    static JsiObj create_instance_by_schema(JsiEnv env, JsiFunc* maybeConstructor, const realm::ObjectSchema& schema,
                                            Internal* internal = nullptr)
    {
        auto& s_schemaObjectTypes = get_schemaObjectTypes();
        auto& s_class = get_class();

        bool isRealmObjectClass = std::is_same_v<T, RealmObjectClass<realmjsi::Types>>;
        if (!isRealmObjectClass) {
            throw fbjsi::JSError(env, "Creating instances by schema is supported for RealmObjectClass only");
        }

        if (!internal) {
            throw fbjsi::JSError(
                env, "RealmObjectClass requires an internal realm object when creating instances by schema");
        }

        REALM_ASSERT_RELEASE(!s_class.index_accessor); // assume we don't need a ProxyWrapper

        auto config = internal->realm()->config();
        std::string path = config.path;
        auto version = internal->realm()->schema_version();
        std::string schemaName = schema.name + ":" + std::to_string(version);

        const JsiFunc& realmObjectClassConstructor = *ObjectWrap<T>::s_ctor;

        auto& schemaObjects = s_schemaObjectTypes[path];

        // jsi::Symbol externalSymbol = ExternalSymbol;

        // if we are creating a RealmObject from schema with no user defined constructor
        if (!maybeConstructor) {
            // 1.Check by name if the constructor is already created for this RealmObject
            if (!schemaObjects.count(schemaName)) {
                // 2.Create the constructor
                // create an anonymous RealmObject function
                auto schemaObjectConstructor = globalType(env, "Function")
                                                   .callAsConstructor(env, "return function () {}")
                                                   .asObject(env)
                                                   .asFunction(env)
                                                   .call(env)
                                                   .asObject(env)
                                                   .asFunction(env);


                auto schemaProto = schemaObjectConstructor.getProperty(env, "prototype");
                ObjectSetPrototypeOf(env, schemaProto, realmObjectClassConstructor->getProperty(env, "prototype"));
                ObjectSetPrototypeOf(env, JsiVal(env(schemaObjectConstructor)), JsiVal(realmObjectClassConstructor));

                defineSchemaProperties(env, std::move(schemaProto).asObject(env), schema, true);

                schemaObjects.emplace(schemaName, std::move(schemaObjectConstructor));
            }
        }
        else {
            // creating a RealmObject with user defined constructor
            auto& constructor = *maybeConstructor;

            bool schemaExists = schemaObjects.count(schemaName);
            if (schemaExists) {
                // check if constructors have changed for the same schema object and name
                if (!fbjsi::Function::strictEquals(env, schemaObjects.at(schemaName), constructor)) {
                    schemaExists = false;
                    schemaObjects.erase(schemaName);
                }
            }

            if (!schemaExists) {
                schemaObjects.emplace(schemaName, JsiFunc(constructor).get());
                auto constructorPrototype = constructor->getPropertyAsObject(env, "prototype");

                // get all properties from the schema
                defineSchemaProperties(env, env(constructorPrototype), schema, false);
            }
        }

        const auto& schemaObjectCtor = schemaObjects.at(schemaName);
        auto constructorPrototype = schemaObjectCtor.getPropertyAsObject(env, "prototype");
        auto instance = ObjectCreate(env, constructorPrototype);
        set_internal(env, instance, internal);
        return instance;
    }

    static auto& get_class()
    {
        // TODO this is silly. These should be static properties.
        static T s_class;
        return s_class;
    }

    inline static auto& get_schemaObjectTypes()
    {
        // NOTE:  this being static prevents using multiple runtimes.
        static std::unordered_map<std::string, std::unordered_map<std::string, fbjsi::Function>> s_schemaObjectTypes;
        return s_schemaObjectTypes;
    }
};

} // namespace realmjsi

template <typename ClassType>
class ObjectWrap<realmjsi::Types, ClassType> : public realm::js::realmjsi::ObjectWrap<ClassType> {};

template <realmjsi::ArgumentsMethodType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const fbjsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto result = realmjsi::ReturnValue(env);
    auto arguments = realmjsi::Arguments{env, count, args};

    F(env, env(thisVal).asObject(), arguments, result);
    return std::move(result).ToValue();
}

template <realmjsi::PropertyType::GetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const fbjsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto result = realmjsi::ReturnValue(env);
    auto arguments = realmjsi::Arguments{env, count, args};
    arguments.validate_count(0);

    F(env, env(thisVal).asObject(), result);
    return std::move(result).ToValue();
}

template <realmjsi::PropertyType::SetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const fbjsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto arguments = realmjsi::Arguments{env, count, args};
    arguments.validate_count(1);

    F(env, env(thisVal).asObject(), JsiVal(env, args[0]));

    return fbjsi::Value();
}

template <realmjsi::IndexPropertyType::GetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value&, const fbjsi::Value* args, size_t count)
{
    REALM_ASSERT_RELEASE(count == 2);
    auto env = JsiEnv(rt);
    auto out = realmjsi::ReturnValue(env);
    F(env, env(args[0]).asObject(), uint32_t(args[1].asNumber()), out);
    return std::move(out).ToValue();
}

template <realmjsi::IndexPropertyType::SetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value&, const fbjsi::Value* args, size_t count)
{
    REALM_ASSERT_RELEASE(count == 3);
    auto env = JsiEnv(rt);
    return fbjsi::Value(F(env, env(args[0]).asObject(), uint32_t(args[1].asNumber()), env(args[2])));
}

template <realmjsi::StringPropertyType::GetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const realmjsi::String& str)
{
    auto env = JsiEnv(rt);
    auto result = realmjsi::ReturnValue(env);
    F(env, env(thisVal).asObject(), str, result);
    return std::move(result).ToValue();
}

template <realmjsi::StringPropertyType::SetterType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const realmjsi::String& str,
                  const fbjsi::Value& value)
{
    auto env = JsiEnv(rt);
    F(env, env(thisVal).asObject(), str, env(value));
    return fbjsi::Value();
}

template <realmjsi::StringPropertyType::EnumeratorType F>
fbjsi::Value wrap(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const fbjsi::Value* args, size_t count)
{
    // This is only used in the JSC impl.
    REALM_UNREACHABLE();
}

} // namespace realm::js
