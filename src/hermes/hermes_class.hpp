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

#include "hermes_types.hpp"
#include "hermes_return_value.hpp"
#include "hermes_string.hpp"
#include "hermes_object.hpp"

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

template <>
struct Arguments<hermes::Types> {
    const std::vector<JsiVal> valStorage;
    const JsiEnv ctx;
    const size_t count;
    const JsiVal* const value;
    Arguments(JsiEnv env, size_t argc, const jsi::Value* argv)
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

namespace hermes {

inline std::optional<jsi::Object> ObjectGetOwnPropertyDescriptor(JsiEnv env, const jsi::Object& target,
                                                                 const std::string& name)
{
    auto obj = js::globalType(env, "Object");
    auto res = obj.getPropertyAsFunction(env, "getOwnPropertyDescriptor").callWithThis(env, obj, target, name);
    if (!res.isObject())
        return {};
    return std::move(res).getObject(env);
}

inline void ObjectSetPrototypeOf(JsiEnv env, const jsi::Value& target, const jsi::Value& proto)
{
    auto obj = js::globalType(env, "Object");
    obj.getPropertyAsFunction(env, "setPrototypeOf").callWithThis(env, obj, target, proto);
}

inline void defineProperty(JsiEnv env, const jsi::Object& target, StringData name, const jsi::Object& descriptor)
{
    auto objClass = js::globalType(env, "Object");
    objClass.getPropertyAsFunction(env, "defineProperty")
        .callWithThis(env, objClass, target, str(env, name), descriptor);
};

inline void copyProperty(JsiEnv env, const jsi::Object& from, const jsi::Object& to, const std::string& name)
{
    auto prop = ObjectGetOwnPropertyDescriptor(env, from, name);
    REALM_ASSERT_RELEASE(prop);
    defineProperty(env, to, "name", *prop);
}

inline constexpr const char g_internal_field[] = "__Realm_internal";

#if 0
inline jsi::Symbol ExternalSymbol;
jsi::Symbol ext = jsi::Symbol::New(env, "_external");
ExternalSymbol = hermes::Protected<jsi::Symbol>(env, ext);
ExternalSymbol.SuppressDestruct();
#endif

template <typename T>
using ClassDefinition = js::ClassDefinition<js::hermes::Types, T>;

using ConstructorType = js::ConstructorType<js::hermes::Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<js::hermes::Types>;
using ReturnValue = js::ReturnValue<js::hermes::Types>;
using Arguments = js::Arguments<js::hermes::Types>;
using PropertyType = js::PropertyType<js::hermes::Types>;
using IndexPropertyType = js::IndexPropertyType<js::hermes::Types>;
using StringPropertyType = js::StringPropertyType<js::hermes::Types>;

template <typename T>
class Wrapper : public jsi::HostObject {
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
inline T& unwrap(JsiEnv env, const jsi::Object& wrapper)
{
    return unwrap<T>(wrapper.getHostObject<Wrapper<T>>(env));
}

template <typename T>
inline T& unwrap(JsiEnv env, const jsi::Value& wrapper)
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
    return env(jsi::Object::createFromHostObject(env, std::make_shared<Wrapper<T>>(std::move(arg))));
}

template <typename T, typename... Args, typename = std::enable_if_t<std::is_constructible_v<T, Args...>>>
JsiObj wrap(JsiEnv env, Args&&... args)
{
    return env(jsi::Object::createFromHostObject(env, std::make_shared<Wrapper<T>>(std::forward<Args>(args)...)));
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

    // XXX if this is static, it won't support multiple runtimes.
    // Also, may need to suppress destruction.
    inline static std::optional<JsiFunc> s_ctor;

    static JsiFunc create_constructor(JsiEnv env)
    {
        auto& s_type = get_class();

        auto nativeFunc =
            !bool(s_type.constructor)
                ? jsi::Value()
                : jsi::Function::createFromHostFunction(
                      env, propName(env, s_type.name), /* XXX paramCount */ 0,
                      [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
                          REALM_ASSERT_RELEASE(count >= 1);
                          auto env = JsiEnv(rt);
                          auto& s_type = get_class();
                          auto arguments = Arguments{env, count - 1, args + 1};
                          s_type.constructor(env, env(args[0]).asObject(), arguments);
                          return jsi::Value();
                      });

        s_ctor = env(globalType(env, "Function")
                         .call(env, "nativeFunc",
                               util::format(R"(
                      return function %1(...args) {
                         //"use strict";
                          if (!nativeFunc && false) // XXX only disable for Realm.Object
                              throw TypeError("%1() cannot be constructed directly from javascript");
                          if (!new.target && false) { // XXX find another way to detect this correctly
                              throw TypeError("%1() must be called as a constructor");
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

        for (auto&& [name, prop] : s_type.static_properties) {
            auto desc = jsi::Object(env);
            if (prop.getter) {
                desc.setProperty(env, "get", funcVal(env, "get_" + name, 0, prop.getter));
            }
            if (prop.setter) {
                desc.setProperty(env, "set", funcVal(env, "set_" + name, 1, prop.setter));
            }
            defineProperty(env, *s_ctor, name, desc);
        }

        for (auto&& [name, method] : s_type.static_methods) {
            auto desc = jsi::Object(env);
            desc.setProperty(env, "value", funcVal(env, name, /* XXX paramCount */ 0, method));
            defineProperty(env, *s_ctor, name, desc);
        }

        auto proto = (*s_ctor)->getPropertyAsObject(env, "prototype");

        for (auto&& [name, prop] : s_type.properties) {
            auto desc = jsi::Object(env);
            if (prop.getter) {
                desc.setProperty(env, "get", funcVal(env, "get_" + name, 0, prop.getter));
            }
            if (prop.setter) {
                desc.setProperty(env, "set", funcVal(env, "set_" + name, 1, prop.setter));
            }
            defineProperty(env, proto, name, desc);
        }

        for (auto&& [name, method] : s_type.methods) {
            auto desc = jsi::Object(env);
            desc.setProperty(env, "value", funcVal(env, name, /* XXX paramCount */ 0, method));
            defineProperty(env, proto, name, desc);
        }

        if constexpr (!std::is_void_v<ParentClassType>) {
            REALM_ASSERT_RELEASE(ObjectWrap<ParentClassType>::s_ctor);
            JsiFunc parentCtor = *ObjectWrap<ParentClassType>::s_ctor;

            auto parentProto = parentCtor->getProperty(env, "prototype");
            if (parentProto.isUndefined()) {
                throw std::runtime_error("undefined 'prototype' on parent constructor");
            }

            ObjectSetPrototypeOf(env, jsi::Value(env, proto), jsi::Value(std::move(parentProto)));
            ObjectSetPrototypeOf(env, jsi::Value(env, *s_ctor), jsi::Value(std::move(parentCtor.get())));
        }

        if (s_type.index_accessor) {
            // Code below assumes getter is present, and it doesn't make sense to have setter without one.
            REALM_ASSERT_RELEASE(s_type.index_accessor.getter);

            // XXX Do we want to trap things like ownKeys() and getOwnPropertyDescriptors() to support for...in?
            auto [getter, setter] = s_type.index_accessor;
            auto desc = jsi::Object(env);
            desc.setProperty(env, "value",
                             globalType(env, "Function")
                                 .call(env, "getter", "setter", R"(
                        function getIndex(prop) {
                            return typeof prop === "string" ? Number(prop) : Number.NaN;
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
                                } else if (setter) {
                                    return setter(target, index, value);
                                } else {
                                    return false;
                                }
                            }
                        }
                        return (obj) => new Proxy(obj, handler);
                    )")
                                 .asObject(env)
                                 .asFunction(env)
                                 .call(env, funcVal(env, "getter", 0, getter), funcVal(env, "setter", 1, setter))
                                 .asObject(env)
                                 .asFunction(env));
            defineProperty(env, *s_ctor, "_proxyWrapper", desc);
        }

        return env((*s_ctor)->getFunction(env));
    }

    static JsiObj create_instance(JsiEnv env, Internal* ptr = nullptr)
    {
        auto proto = (*s_ctor)->getPropertyAsObject(env, "prototype");
        auto objClass = js::globalType(env, "Object");
        auto obj = env(objClass.getPropertyAsFunction(env, "create").callWithThis(env, objClass, proto)).asObject();
        set_internal(env, obj, ptr);

        auto wrapper = (*s_ctor)->getProperty(env, "_proxyWrapper");
        if (!wrapper.isUndefined()) {
            obj = env(wrapper.asObject(env).asFunction(env).call(env, std::move(obj.get()))).asObject();
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
        auto internal = object->getProperty(env, g_internal_field);
        if (internal.isUndefined()) {
            if constexpr (std::is_same_v<T, RealmObjectClass<hermes::Types>>) // XXX comment why
                return nullptr;
            throw jsi::JSError(env, "no internal field");
        }
        if (!JsiObj(object)->instanceOf(env, *s_ctor)) {
            throw jsi::JSError(env, "calling method on wrong type of object");
        }
        return unwrapUnique<Internal>(env, std::move(internal));
    }
    static void set_internal(JsiEnv env, const JsiObj& object, Internal* data)
    {
        auto desc = jsi::Object(env);
        desc.setProperty(env, "value", wrapUnique(env, data));
        desc.setProperty(env, "configurable", true);
        defineProperty(env, object, g_internal_field, desc);
    }

private:
    static jsi::Value funcVal(JsiEnv env, const std::string& name, size_t args, jsi::HostFunctionType&& func)
    {
        if (!func)
            return jsi::Value();
        return jsi::Value(
            jsi::Function::createFromHostFunction(env, propName(env, name), uint32_t(args), std::move(func)));
    };

    static void defineSchemaProperties(JsiEnv env, const jsi::Object& constructorPrototype,
                                       const realm::ObjectSchema& schema, bool redefine)
    {
        // Do the same thing for all computed and persisted properties
        auto loopBody = [&](const Property& property) {
            const auto& name = property.public_name.empty() ? property.name : property.public_name;
            // TODO should this use hasOwnProperty?
            if (!redefine && constructorPrototype.hasProperty(env, str(env, name))) {
                return;
            }

            auto desc = jsi::Object(env);
            desc.setProperty(env, "enumerable", true);

            desc.setProperty(env, "get",
                             funcVal(env, "get_" + name, 0,
                                     [name = String(name)](jsi::Runtime& rt, const jsi::Value& thisVal,
                                                           const jsi::Value* args, size_t count) {
                                         if (count != 0)
                                             throw jsi::JSError(rt, "getters take no arguments");
                                         return get_class().string_accessor.getter(rt, thisVal, name);
                                     }));
            desc.setProperty(env, "set",
                             funcVal(env, "set_" + name, 1,
                                     [name = String(name)](jsi::Runtime& rt, const jsi::Value& thisVal,
                                                           const jsi::Value* args, size_t count) {
                                         if (count != 1)
                                             throw jsi::JSError(rt, "setters take exactly 1 argument");
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

        bool isRealmObjectClass = std::is_same_v<T, RealmObjectClass<hermes::Types>>;
        if (!isRealmObjectClass) {
            throw jsi::JSError(env, "Creating instances by schema is supported for RealmObjectClass only");
        }

        if (!internal) {
            throw jsi::JSError(
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

                // create the RealmObject function by name
                //  XXX May need to escape/sanitize schema.name to avoid code injection
                auto schemaObjectConstructor = globalType(env, "Function")
                                                   .callAsConstructor(env, "return function " + schema.name + "() {}")
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
                if (!jsi::Function::strictEquals(env, schemaObjects.at(schemaName), constructor)) {
                    schemaExists = false;
                    schemaObjects.erase(schemaName);
                }
            }

            if (!schemaExists) {
                schemaObjects.emplace(schemaName, JsiFunc(constructor).get());
                auto constructorPrototype = constructor->getPropertyAsObject(env, "prototype");

                // get all properties from the schema
                defineSchemaProperties(env, env(constructorPrototype), schema, false);

                // Skip if the user defined constructor inherited the RealmObjectClass. All RealmObjectClass members
                // are available already.
                if (!constructorPrototype.instanceOf(env, realmObjectClassConstructor)) {
                    // setup all RealmObjectClass<T> methods to the prototype of the object
                    auto realmObjectClassProto = realmObjectClassConstructor->getPropertyAsObject(env, "prototype");
                    for (auto& [name, method] : s_class.methods) {
                        // don't redefine if exists
                        //  TODO should this use hasOwnProperty?
                        if (!constructorPrototype.hasProperty(env, propName(env, name))) {
                            copyProperty(env, realmObjectClassProto, constructorPrototype, name);
                        }
                    }

                    for (auto& [name, property] : s_class.properties) {
                        // TODO should this use hasOwnProperty?
                        if (!constructorPrototype.hasProperty(env, propName(env, name))) {
                            copyProperty(env, realmObjectClassProto, constructorPrototype, name);
                        }
                    }
                }
            }
        }

        const auto& schemaObjectCtor = schemaObjects.at(schemaName);
        auto instanceVal = schemaObjectCtor.callAsConstructor(env);
        if (!instanceVal.isObject()) {
            throw jsi::JSError(env, "Realm object constructor must not return another value");
        }
        auto instance = env(std::move(instanceVal).getObject(env));
        if (!instance->instanceOf(env, schemaObjectCtor)) {
            throw jsi::JSError(env, "Realm object constructor must not return another value");
        }

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
        // XXX this being static prevents using multiple runtimes.
        static std::unordered_map<std::string, std::unordered_map<std::string, jsi::Function>> s_schemaObjectTypes;
        return s_schemaObjectTypes;
    }
};

} // hermes

template <typename ClassType>
class ObjectWrap<hermes::Types, ClassType> : public hermes::ObjectWrap<ClassType> {
};

template <hermes::ArgumentsMethodType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const jsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto result = hermes::ReturnValue(env);
    auto arguments = hermes::Arguments{env, count, args};

    F(env, env(thisVal).asObject(), arguments, result);
    return std::move(result).ToValue();
}

template <hermes::PropertyType::GetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const jsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto result = hermes::ReturnValue(env);
    auto arguments = hermes::Arguments{env, count, args};
    arguments.validate_count(0);

    F(env, env(thisVal).asObject(), result);
    return std::move(result).ToValue();
}

template <hermes::PropertyType::SetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const jsi::Value* args, size_t count)
{
    auto env = JsiEnv(rt);
    auto arguments = hermes::Arguments{env, count, args};
    arguments.validate_count(1);

    F(env, env(thisVal).asObject(), JsiVal(env, args[0]));

    return jsi::Value();
}

template <hermes::IndexPropertyType::GetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count)
{
    REALM_ASSERT_RELEASE(count == 2);
    auto env = JsiEnv(rt);
    auto out = hermes::ReturnValue(env);
    F(env, env(args[0]).asObject(), uint32_t(args[1].asNumber()), out);
    return std::move(out).ToValue();
}

template <hermes::IndexPropertyType::SetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count)
{
    REALM_ASSERT_RELEASE(count == 3);
    auto env = JsiEnv(rt);
    return jsi::Value(F(env, env(args[0]).asObject(), uint32_t(args[1].asNumber()), env(args[2])));
}

template <hermes::StringPropertyType::GetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const hermes::String& str)
{
    auto env = JsiEnv(rt);
    auto result = hermes::ReturnValue(env);
    F(env, env(thisVal).asObject(), str, result);
    return std::move(result).ToValue();
}

template <hermes::StringPropertyType::SetterType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const hermes::String& str, const jsi::Value& value)
{
    auto env = JsiEnv(rt);
    F(env, env(thisVal).asObject(), str, env(value));
    return jsi::Value();
}

template <hermes::StringPropertyType::EnumeratorType F>
jsi::Value wrap(jsi::Runtime& rt, const jsi::Value& thisVal, const jsi::Value* args, size_t count)
{
    // This is only used in the JSC impl.
    REALM_UNREACHABLE();
}

} // realm::js

// Leaving this here for now in case I need to copy-paste more functionality. TODO delete.
#ifdef OLD
template <typename ClassType>
class WrappedObject : public JsiObjWrap<WrappedObject<ClassType>> {
    using Internal = typename ClassType::Internal;

public:
    WrappedObject(const jsi::CallbackInfo& info);

    static JsiVal create_instance_with_proxy(const jsi::CallbackInfo& info);

    static JsiFunc init(JsiEnv env, const std::string& name, hermes::Types::FunctionCallback constructor_callback,
                        std::function<bool(const std::string&)> has_native_method_callback,
                        const std::vector<jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties,
                        const IndexPropertyType* indexPropertyHandlers = nullptr);

    static JsiObj create_instance(JsiEnv env, Internal* internal = nullptr);

    static bool is_instance(JsiEnv env, const JsiObj& object);

    static WrappedObject<ClassType>* try_unwrap(const JsiObj& object);

    Internal* get_internal();
    void set_internal(Internal* internal);
    static void set_factory_constructor(const JsiFunc& factoryConstructor);
    static JsiFunc get_constructor(JsiEnv env);

    JsiVal method_callback(const jsi::CallbackInfo& info);
    JsiVal getter_callback(const jsi::CallbackInfo& info);
    void setter_callback(const jsi::CallbackInfo& info, const JsiVal& value);
    void readonly_setter_callback(const jsi::CallbackInfo& info, const JsiVal& value);
    static void readonly_static_setter_callback(const jsi::CallbackInfo& info, const JsiVal& value);

private:
    std::unique_ptr<Internal> m_internal;
    static JsiFuncReference constructor;
    static JsiFuncReference factory_constructor;
    static IndexPropertyType* m_indexPropertyHandlers;
    static std::string m_name;
    static std::function<bool(const std::string&)> m_has_native_methodFunc;
    static jsi::Reference<jsi::External<Internal>> m_nullExternal;

    class ProxyHandler {
    public:
        static JsiVal get_instance_proxy_handler(JsiEnv env);

    private:
        static JsiVal bind_native_function(JsiEnv env, const std::string& functionName, const JsiFunc& function,
                                           const JsiObj& thisObject);
        static JsiObjReference m_proxyHandler;


        static JsiVal get_proxy_trap(const jsi::CallbackInfo& info);
        static JsiVal set_proxy_trap(const jsi::CallbackInfo& info);
        static JsiVal own_keys_proxy_trap(const jsi::CallbackInfo& info);
        static JsiVal has_proxy_trap(const jsi::CallbackInfo& info);
        static JsiVal get_own_property_descriptor_trap(const jsi::CallbackInfo& info);
        static JsiVal get_prototype_of_proxy_trap(const jsi::CallbackInfo& info);
        static JsiVal set_prototype_of_proxy_trap(const jsi::CallbackInfo& info);
    };
};

template <typename ClassType>
JsiFuncReference WrappedObject<ClassType>::constructor;

template <typename ClassType>
JsiFuncReference WrappedObject<ClassType>::factory_constructor;

template <typename ClassType>
IndexPropertyType* WrappedObject<ClassType>::m_indexPropertyHandlers;

template <typename ClassType>
std::string WrappedObject<ClassType>::m_name;

template <typename ClassType>
std::function<bool(const std::string&)> WrappedObject<ClassType>::m_has_native_methodFunc;

template <typename ClassType>
jsi::Reference<jsi::External<typename ClassType::Internal>> WrappedObject<ClassType>::m_nullExternal;


struct SchemaObjectType {
    JsiFuncReference constructor;
};

template <typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

public:
    static JsiFunc create_constructor(JsiEnv env);

    static JsiObj create_instance(JsiEnv env, Internal* = nullptr);
    static JsiObj create_instance_by_schema(JsiEnv env, JsiFunc& constructor, const realm::ObjectSchema& schema,
                                            Internal* internal = nullptr);
    static void internal_finalizer(JsiEnv, typename ClassType::Internal* internal);

    static void on_context_destroy(JsiEnv env, std::string realmPath);
    static bool is_instance(JsiEnv env, const JsiObj& object);

    static Internal* get_internal(JsiEnv env, const JsiObj& object);
    static void set_internal(JsiEnv env, const JsiObj& object, Internal* data);

    static JsiVal constructor_callback(const jsi::CallbackInfo& info);
    static bool has_native_method(const std::string& name);

private:
    static auto& get_class();
    static auto& get_nativeMethods();
    static auto& get_schemaObjectTypes();

    // Gives access to ObjectWrap<ClassType> init_class private static member. See
    // https://stackoverflow.com/a/40937193
    template <typename T>
    friend struct ObjectWrapAccessor;

    static JsiFunc init_class(JsiEnv env);

    static jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
    setup_method(JsiEnv env, const std::string& name, hermes::Types::FunctionCallback callback);
    static jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
    setup_static_method(JsiEnv env, const std::string& name, hermes::Types::FunctionCallback callback);
    static jsi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_property(JsiEnv env, const std::string& name,
                                                                                 const PropertyType&);
    static jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
    setup_static_property(JsiEnv env, const std::string& name, const PropertyType&);

    static JsiVal property_getter(const jsi::CallbackInfo& info);
    static void property_setter(const jsi::CallbackInfo& info);
};

template <>
class ObjectWrap<void> {
public:
    using Internal = void;

    static JsiFunc create_constructor(JsiEnv env)
    {
        return JsiFunc();
    }

    static JsiFunc init_class(JsiEnv env)
    {
        return JsiFunc();
    }

    static bool has_native_method(const std::string& name)
    {
        return false;
    }
};

// Gives access to ObjectWrap<ClassType> init_class private static member. See https://stackoverflow.com/a/40937193
template <typename T>
struct ObjectWrapAccessor {
    inline static JsiFunc init_class(JsiEnv env)
    {
        return ObjectWrap<T>::init_class(env);
    }
};

template <typename ClassType>
inline auto& ObjectWrap<ClassType>::get_class()
{
    static ClassType s_class;
    return s_class;
}

template <typename ClassType>
inline auto& ObjectWrap<ClassType>::get_nativeMethods()
{
    static std::unordered_set<std::string> s_nativeMethods;
    return s_nativeMethods;
}


template <typename ClassType>
inline auto& ObjectWrap<ClassType>::get_schemaObjectTypes()
{
    static std::unordered_map<std::string, std::unordered_map<std::string, SchemaObjectType*>*> s_schemaObjectTypes;
    return s_schemaObjectTypes;
}

// A cache for property names. The pair is property name and a hermes::String* to the same string representation.
// The cache is persisted throughout the process life time to preseve property names between constructor cache
// invalidations (on_destory_context is called) Since RealmObjectClass instances may be used after context is
// destroyed, their property names should be valid
static std::unordered_map<std::string, hermes::String*> propertyNamesCache;

static hermes::String* get_cached_property_name(const std::string& name)
{
    if (propertyNamesCache.count(name)) {
        hermes::String* cachedName = propertyNamesCache.at(name);
        return cachedName;
    }

    hermes::String* result = new hermes::String(name);
    propertyNamesCache.emplace(name, result);
    return result;
}


inline static void copy_object(JsiEnv env, const JsiVal& source, const jsi::Error& target)
{
    jsi::HandleScope scope(env);

    if (source.IsEmpty() || source.IsNull() || source.IsUndefined()) {
        return;
    }

    JsiFunc objectFunc = env.Global().Get("Object").As<JsiFunc>();
    JsiFunc assignFunc = objectFunc.Get("assign").As<JsiFunc>();
    assignFunc.Call({target.Value(), source});
}

template <typename ClassType>
WrappedObject<ClassType>::WrappedObject(const jsi::CallbackInfo& info)
    : JsiObjWrap<WrappedObject<ClassType>>(info)
{
    JsiEnv env = info.Runtime * ();

    // skip the constructor_callback if create_instance is creating a JS instance only
    if (info.Length() == 1 && info[0].IsExternal()) {
        jsi::External<Internal> external = info[0].As<jsi::External<Internal>>();
        if (!external.Data()) {
            return;
        }

        Internal* internal = external.Data();
        set_internal(internal);
        return;
    }

    try {
        hermes::Types::FunctionCallback constructor_callback = (hermes::Types::FunctionCallback)info.Data();
        constructor_callback(info);
    }
    catch (const hermes::Exception& e) {
        jsi::Error error = jsi::Error::New(info.Runtime * (), e.what());
        copy_object(env, e.m_value, error);
        throw error;
    }
    catch (const std::exception& e) {
        throw jsi::Error::New(env, e.what());
    }
}

template <typename ClassType>
JsiFunc
WrappedObject<ClassType>::init(JsiEnv env, const std::string& name,
                               hermes::Types::FunctionCallback constructor_callback,
                               std::function<bool(const std::string&)> has_native_method_callback,
                               const std::vector<jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties,
                               const IndexPropertyType* indexPropertyHandlers)
{

    m_name = name;
    m_has_native_methodFunc = has_native_method_callback;
    WrappedObject<ClassType>::m_nullExternal = jsi::Persistent(jsi::External<Internal>::New(env, nullptr));
    WrappedObject<ClassType>::m_nullExternal.SuppressDestruct();

    JsiFunc ctor =
        JsiObjWrap<WrappedObject<ClassType>>::DefineClass(env, name.c_str(), properties, (void*)constructor_callback);

    constructor = jsi::Persistent(ctor);
    constructor.SuppressDestruct();

    m_indexPropertyHandlers = const_cast<IndexPropertyType*>(indexPropertyHandlers);
    return ctor;
}

// This creates the required JS instance with a Proxy parent to support get and set handlers and returns a proxy
// created on the JS instance to support property enumeration handler the returned JS Proxy has only ownKeys trap
// setup so that all other member accesses skip the Proxy and go directly to the JS instance
template <typename ClassType>
JsiVal WrappedObject<ClassType>::create_instance_with_proxy(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();

    if (constructor.IsEmpty()) {
        std::string typeName(typeid(ClassType).name());
        std::string errorMessage =
            util::format("create_instance_with_proxy: Class %s not initialized. Call init() first", typeName);
        throw jsi::Error::New(env, errorMessage);
    }

    if (!info.IsConstructCall()) {
        throw jsi::Error::New(env, "This function should be called as a constructor");
    }

    jsi::EscapableHandleScope scope(env);

    try {

        auto arguments = napi_get_arguments(info);
        JsiObj instance = constructor.New(arguments);

        // using DefineProperty to make it non enumerable and non configurable and non writable
        instance.DefineProperty(jsi::PropertyDescriptor::Value("_instance", instance, napi_default));

        info.This().As<JsiObj>().DefineProperty(
            jsi::PropertyDescriptor::Value("isRealmCtor", jsi::Boolean::New(env, true), napi_configurable));

        ObjectSetPrototypeOf.Call({info.This(), instance});
        JsiObj instanceProxy = GlobalProxy.New({info.This(), ProxyHandler::get_instance_proxy_handler(env)});

        instance.DefineProperty(jsi::PropertyDescriptor::Value("_instanceProxy", instanceProxy, napi_default));
        return scope.Escape(instanceProxy);
    }
    catch (const jsi::Error& e) {
        throw e;
    }
    catch (const std::exception& e) {
        throw jsi::Error::New(info.Runtime * (), e.what());
    }
}

template <typename ClassType>
JsiObj WrappedObject<ClassType>::create_instance(JsiEnv env, Internal* internal)
{
    if (constructor.IsEmpty() || factory_constructor.IsEmpty()) {
        std::string typeName(typeid(ClassType).name());
        std::string errorMessage =
            util::format("create_instance: Class %s not initialized. Call init() first", typeName);
        throw jsi::Error::New(env, errorMessage);
    }
    jsi::EscapableHandleScope scope(env);

    // creating a JS instance only. pass null as first and single argument
    // Internal intern = &std::shared_ptr<Internal>(internal);
    jsi::External<Internal> external;
    if (internal) {
        external = jsi::External<Internal>::New(env, internal);
    }
    else {
        external = WrappedObject<ClassType>::m_nullExternal.Value();
    }

    JsiObj instance = factory_constructor.New({external});
    return scope.Escape(instance).As<JsiObj>();
}

template <typename ClassType>
WrappedObject<ClassType>* WrappedObject<ClassType>::try_unwrap(const JsiObj& object)
{
    JsiEnv env = object.Runtime * ();

    WrappedObject<ClassType>* unwrapped;
    napi_status status = napi_unwrap(env, object, reinterpret_cast<void**>(&unwrapped));
    if ((status) != napi_ok) {
        JsiObj instance = object.Get("_instance").As<JsiObj>();
        if (instance.IsUndefined() || instance.IsNull()) {
            throw jsi::Error::New(env, "Invalid object. No _instance member");
        }

        status = napi_unwrap(env, instance, reinterpret_cast<void**>(&unwrapped));
    }

    NAPI_THROW_IF_FAILED(env, status, nullptr);
    return unwrapped;
}

template <typename ClassType>
inline typename ClassType::Internal* WrappedObject<ClassType>::get_internal()
{
    return m_internal.get();
}

template <typename ClassType>
inline void WrappedObject<ClassType>::set_internal(Internal* internal)
{
    m_internal = std::unique_ptr<Internal>(internal);
}

template <typename ClassType>
void WrappedObject<ClassType>::set_factory_constructor(const JsiFunc& factoryConstructor)
{
    factory_constructor = jsi::Persistent(factoryConstructor);
    factory_constructor.SuppressDestruct();
}

template <typename ClassType>
JsiFunc WrappedObject<ClassType>::get_constructor(JsiEnv env)
{
    if (!constructor.IsEmpty()) {
        return constructor.Value();
    }

    return JsiFunc(env, env.Null());
}

template <typename ClassType>
inline bool WrappedObject<ClassType>::is_instance(JsiEnv env, const JsiObj& object)
{
    if (constructor.IsEmpty()) {
        std::string typeName(typeid(ClassType).name());
        std::string errorMessage = util::format("is_instance: Class %s not initialized. Call init() first", typeName);
        throw jsi::Error::New(env, errorMessage);
    }

    jsi::HandleScope scope(env);

    // Check the object is instance of the constructor. This will be true when the object have it's prototype set with
    // setPrototypeOf. This is true for objects configured in the schema with a function type.
    JsiFunc ctor = constructor.Value();
    bool isInstanceOf = object.InstanceOf(ctor);
    if (isInstanceOf) {
        return true;
    }

    // Object store needs is_instance to return true when called with RealmObject instance even if the prototype was
    // changed with setPrototypeOf
    JsiObj instance = object.Get("_instance").As<JsiObj>();
    if (!instance.IsUndefined()) {
        isInstanceOf = instance.InstanceOf(ctor);
    }

    // handle RealmObjects with user defined ctors without extending RealmObject
    // In this case we just check for existing internal value to identify RealmObject instances
    if (!isInstanceOf) {
        bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;
        if (isRealmObjectClass) {
            jsi::External<typename ClassType::Internal> external =
                object.Get(ExternalSymbol).As<jsi::External<typename ClassType::Internal>>();
            if (!external.IsUndefined()) {
                return true;
            }
        }
    }

    return isInstanceOf;
}


static inline JsiVal method_callback(const jsi::CallbackInfo& info)
{
    hermes::Types::FunctionCallback method = (hermes::Types::FunctionCallback)info.Data();
    return method(info);
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::method_callback(const jsi::CallbackInfo& info)
{
    hermes::Types::FunctionCallback method = (hermes::Types::FunctionCallback)info.Data();
    return method(info);
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::getter_callback(const jsi::CallbackInfo& info)
{
    PropertyType* propertyType = (PropertyType*)info.Data();
    return propertyType->getter(info);
}

template <typename ClassType>
void WrappedObject<ClassType>::setter_callback(const jsi::CallbackInfo& info, const JsiVal& value)
{
    PropertyType* propertyType = (PropertyType*)info.Data();
    propertyType->setter(info, value);
}

template <typename ClassType>
void WrappedObject<ClassType>::readonly_setter_callback(const jsi::CallbackInfo& info, const JsiVal& value)
{
    jsi::Error error = jsi::Error::New(info.Runtime * (), "Cannot assign to read only property");
    error.Set("readOnly", true);
    throw error;
}

template <typename ClassType>
void WrappedObject<ClassType>::readonly_static_setter_callback(const jsi::CallbackInfo& info, const JsiVal& value)
{
    jsi::Error error = jsi::Error::New(info.Runtime * (), "Cannot assign to read only static property");
    error.Set("readOnly", true);
    throw error;
}

template <typename ClassType>
JsiObjReference WrappedObject<ClassType>::ProxyHandler::m_proxyHandler;

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::get_instance_proxy_handler(JsiEnv env)
{
    if (!m_proxyHandler.IsEmpty()) {
        return m_proxyHandler.Value();
    }

    JsiObj proxyObject = JsiObj::New(env);
    jsi::PropertyDescriptor instanceGetTrapFunc =
        jsi::PropertyDescriptor::Function("get", &WrappedObject<ClassType>::ProxyHandler::get_proxy_trap);
    jsi::PropertyDescriptor instanceSetTrapFunc =
        jsi::PropertyDescriptor::Function("set", &WrappedObject<ClassType>::ProxyHandler::set_proxy_trap);
    jsi::PropertyDescriptor ownKeysTrapFunc =
        jsi::PropertyDescriptor::Function("ownKeys", &WrappedObject<ClassType>::ProxyHandler::own_keys_proxy_trap);
    jsi::PropertyDescriptor hasTrapFunc =
        jsi::PropertyDescriptor::Function("has", &WrappedObject<ClassType>::ProxyHandler::has_proxy_trap);
    jsi::PropertyDescriptor getOwnPropertyDescriptorTrapFunc = jsi::PropertyDescriptor::Function(
        "getOwnPropertyDescriptor", &WrappedObject<ClassType>::ProxyHandler::get_own_property_descriptor_trap);
    jsi::PropertyDescriptor getPrototypeOfFunc = jsi::PropertyDescriptor::Function(
        "getPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::get_prototype_of_proxy_trap);
    jsi::PropertyDescriptor setPrototypeOfFunc = jsi::PropertyDescriptor::Function(
        "setPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::set_prototype_of_proxy_trap);

    proxyObject.DefineProperties({instanceGetTrapFunc, instanceSetTrapFunc, ownKeysTrapFunc, hasTrapFunc,
                                  getOwnPropertyDescriptorTrapFunc, getPrototypeOfFunc, setPrototypeOfFunc});

    m_proxyHandler = jsi::Persistent(proxyObject);
    m_proxyHandler.SuppressDestruct();
    return proxyObject;
}

static JsiVal bind_function(JsiEnv env, const std::string& functionName, const JsiFunc& function,
                            const JsiObj& thisObject)
{
    JsiFunc boundFunc = FunctionBind.Call(function, {thisObject}).As<JsiFunc>();
    return boundFunc;
}


template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::bind_native_function(JsiEnv env, const std::string& functionName,
                                                                    const JsiFunc& function, const JsiObj& thisObject)
{
    jsi::EscapableHandleScope scope(env);

    // do not bind the non native functions. These are attached from extensions.js and should be called on the
    // instanceProxy.
    if (!m_has_native_methodFunc(functionName)) {
        // return undefined to indicate this is not a native function
        return scope.Escape(env.Undefined());
    }

    JsiVal result = bind_function(env, functionName, function, thisObject);
    return scope.Escape(result);
}

static inline JsiObj get_prototype(JsiEnv env, const JsiObj& object)
{
    napi_value napi_proto;
    napi_status status = napi_get_prototype(env, object, &napi_proto);
    if (status != napi_ok) {
        throw jsi::Error::New(env, "Invalid object. Couldn't get prototype of object");
    }
    JsiObj prototypeObject = JsiObj(env, napi_proto);
    return prototypeObject;
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::get_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    JsiObj target = info[0].As<JsiObj>();
    JsiVal property = info[1];

#if DEBUG
    std::string _debugproperty = property.IsString() ? (std::string)property.As<JsiString>() : "";
    const char* _debugPropertyName = _debugproperty.c_str();
    (void)_debugPropertyName; // disable unused variable warning
#endif

    JsiObj instance = target.Get("_instance").As<JsiObj>();
    if (instance.IsUndefined() || instance.IsNull()) {
        throw jsi::Error::New(env, "Invalid object. No _instance member");
    }

    // skip Symbols
    if (!property.IsString()) {
        JsiVal propertyValue = instance.Get(property);
        return scope.Escape(propertyValue);
    }

    JsiString propertyName = property.As<JsiString>();
    std::string propertyText = propertyName;

    if (propertyText == "_instance") {
        return scope.Escape(instance);
    }

    // Order of execution
    // 1.check for number and call get index handlers
    // 2.check if its a native function
    // 3.get any other property name from the instance


    // 1.Check property is number and call index handler
    char firstChar = *propertyText.c_str();

    // myobject[""] and negative indexes return undefined in JavaScript
    if (propertyText.length() == 0 || firstChar == '-') {
        return scope.Escape(env.Undefined());
    }

    bool isNumber = isdigit(firstChar) || firstChar == '+';
    if (isNumber) {
        int32_t index = 0;
        try {
            index = std::stoi(propertyText);
        }
        catch (const std::exception& e) {
            throw jsi::Error::New(env, "Invalid number " + propertyText);
        }

        WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
        JsiVal result = wrappedObject->m_indexPropertyHandlers->getter(info, instance, index);
        return scope.Escape(result);
    }


    // 2. Check if its a native function
    if (m_has_native_methodFunc(propertyText)) {
        // TODO: cache this function in the wrappedObject of this instance
        JsiVal propertyValue = instance.Get(property);
        JsiVal result = bind_function(env, propertyText, propertyValue.As<JsiFunc>(), instance);
        return scope.Escape(result);
    }

    // return all other properties from the instance
    JsiVal propertyValue = instance.Get(property);
    return scope.Escape(propertyValue);
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::set_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    JsiObj target = info[0].As<JsiObj>();
    JsiVal property = info[1];
    JsiVal value = info[2];

#if DEBUG
    std::string _debugproperty = property.IsString() ? (std::string)property.As<JsiString>() : "";
    const char* _debugPropertyName = _debugproperty.c_str();
    (void)_debugPropertyName; // disable unused variable warning
#endif


    JsiObj instance = target.Get("_instance").As<JsiObj>();
    if (instance.IsUndefined() || instance.IsNull()) {
        throw jsi::Error::New(env, "Invalid object. No _instance member");
    }

    // skip Symbols
    if (!property.IsString()) {
        instance.Set(property, value);
        return scope.Escape(value);
    }

    JsiString propertyName = property.As<JsiString>();
    std::string propertyText = propertyName;

    // Order of execution
    // 1.check for number and call set index handlers
    // 2.get any other property name from the instance

    // do not assign empty property name. myarray[''] = 42; is valid in JS
    if (propertyText.length() == 0) {
        throw jsi::Error::New(env, "Invalid number ''");
    }

    // 1.Check property is number and call set index handler
    char firstChar = *propertyText.c_str();
    bool isNumber = isdigit(firstChar) || firstChar == '+' || firstChar == '-';
    if (isNumber) {
        try {
            realm::js::validated_positive_index(propertyText);
        }
        catch (const std::out_of_range& e) {
            throw jsi::Error::New(env, e.what());
        }

        int32_t index = 0;
        try {
            index = std::stoi(propertyText);
        }
        catch (const std::exception& e) {
            throw jsi::Error::New(env, "Invalid number " + propertyText);
        }

        WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
        if (wrappedObject->m_indexPropertyHandlers->setter == nullptr) {
            std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
            throw jsi::Error::New(env, message);
        }

        JsiVal result = wrappedObject->m_indexPropertyHandlers->setter(info, instance, index, value);
        return scope.Escape(result);
    }

    // call Set on the instance for non indexed properties
    try {
        instance.Set(property, value);
        return scope.Escape(jsi::Boolean::New(env, true));
    }
    catch (const jsi::Error& e) {
        jsi::Boolean readOnly = e.Get("readOnly").As<jsi::Boolean>();
        if (!readOnly.IsUndefined() && readOnly) {
            std::string message = "Cannot assign to read only property '" + propertyText + "'";
            throw jsi::Error::New(env, message);
        }

        throw e;
    }
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::own_keys_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    JsiObj target = info[0].As<JsiObj>();

    JsiObj instance = target.Get("_instance").As<JsiObj>();
    WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);

    if (wrappedObject->m_indexPropertyHandlers != nullptr) {
        uint32_t length = instance.Get("length").As<jsi::Number>();
        jsi::Array array = jsi::Array::New(env, length);
        for (uint32_t i = 0; i < length; i++) {
            array.Set(i, jsi::Number::New(env, i).ToString());
        }
        return scope.Escape(array);
    }

    return scope.Escape(jsi::Array::New(env, 0));
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::has_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    JsiObj target = info[0].As<JsiObj>();
    JsiVal propertyArg = info[1];


    // skip symbols
    if (!propertyArg.IsString()) {
        bool hasProperty = target.Has(propertyArg);
        return scope.Escape(jsi::Boolean::From(env, hasProperty));
    }

    JsiString property = propertyArg.As<JsiString>();
    std::string propertyText = property;

    if (propertyText.length() == 0) {
        return scope.Escape(jsi::Boolean::From(env, false));
    }

    JsiObj instance = target.Get("_instance").As<JsiObj>();
    if (instance.IsUndefined() || instance.IsNull()) {
        bool hasProperty = target.Has(propertyArg);
        return scope.Escape(jsi::Boolean::From(env, hasProperty));
    }

    if (target.Has(property)) {
        return scope.Escape(jsi::Boolean::From(env, true));
    }

    // Property should be a number from here on
    char firstChar = *propertyText.c_str();
    bool isNumber = isdigit(firstChar) || firstChar == '+';

    // return false for negative indexes and non numbers
    if (!isNumber || firstChar == '-') {
        return scope.Escape(jsi::Boolean::From(env, false));
    }

    int32_t index = 0;
    try {
        index = std::stoi(propertyText);
    }
    catch (const std::exception& e) {
        // not a number. return false;
        return scope.Escape(jsi::Boolean::From(env, false));
    }

    int32_t length = instance.Get("length").As<jsi::Number>();
    bool hasIndex = index >= 0 && index < length;
    return scope.Escape(jsi::Boolean::From(env, hasIndex));
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::get_own_property_descriptor_trap(const jsi::CallbackInfo& info)
{
    // This exists only for ownKeysTrap to work properly with Object.keys(). It does not check if the property is from
    // the named handler or it is an existing property on the instance. This implementation can be extended to return
    // the true property descriptor if the property is an existing one

    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    // JsiObj target = info[0].As<JsiObj>();
    JsiString key = info[1].As<JsiString>();
    std::string text = key;

    JsiObj descriptor = JsiObj::New(env);
    descriptor.Set("enumerable", jsi::Boolean::New(env, true));
    descriptor.Set("configurable", jsi::Boolean::New(env, true));

    return scope.Escape(descriptor);
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::get_prototype_of_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);

    JsiObj target = info[0].As<JsiObj>();
    JsiObj proto = get_prototype(env, target);
    return scope.Escape(proto);
}

template <typename ClassType>
JsiVal WrappedObject<ClassType>::ProxyHandler::set_prototype_of_proxy_trap(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    throw jsi::Error::New(env, "Setting the prototype on this type of object is not supported");
}


template <typename ClassType>
JsiFunc ObjectWrap<ClassType>::create_constructor(JsiEnv env)
{
    auto& s_class = get_class();
    JsiFunc ctor = init_class(env);

    // If the class has no index accessor we can create an instance of the class itself and can skip proxy objects
    bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;

    if (!has_index_accessor || isRealmObjectClass) {
        WrappedObject<ClassType>::set_factory_constructor(ctor);
        return ctor;
    }

    // since NAPI ctors can't change the returned type we need to return a factory func which will be called when 'new
    // ctor()' is called from JS. This will create a JS Proxy and return it to the caller. The proxy is needed to
    // support named and index handlers
    JsiFunc factory = JsiFunc::New(env, WrappedObject<ClassType>::create_instance_with_proxy, s_class.name);
    auto ctorPrototypeProperty = ctor.Get("prototype");

    // the factory function should have the same prototype property as the constructor.prototype so `instanceOf` works
    factory.Set("prototype", ctorPrototypeProperty);
    ObjectSetPrototypeOf.Call({factory, ctor});

    WrappedObject<ClassType>::set_factory_constructor(factory);

    return factory;
}

template <typename ClassType>
JsiFunc ObjectWrap<ClassType>::init_class(JsiEnv env)
{
    auto& s_class = get_class();
    // check if the constructor is already created. It means this class and it's parent are already initialized.
    JsiFunc ctor = WrappedObject<ClassType>::get_constructor(env);
    if (!ctor.IsNull()) {
        return ctor;
    }

    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;

    std::vector<jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>> properties;

    if (!isRealmObjectClass) {
        // setup properties and accessors on the class
        for (auto& pair : s_class.static_properties) {
            jsi::ClassPropertyDescriptor<WrappedObject<ClassType>> statc_property =
                setup_static_property(env, pair.first, pair.second);
            properties.push_back(statc_property);
        }

        for (auto& pair : s_class.static_methods) {
            jsi::ClassPropertyDescriptor<WrappedObject<ClassType>> staticMethod =
                setup_static_method(env, pair.first, pair.second);
            properties.push_back(staticMethod);
        }

        for (auto& pair : s_class.methods) {
            jsi::ClassPropertyDescriptor<WrappedObject<ClassType>> method =
                setup_method(env, pair.first, pair.second);
            properties.push_back(method);
        }

        for (auto& pair : s_class.properties) {
            jsi::ClassPropertyDescriptor<WrappedObject<ClassType>> property =
                setup_property(env, pair.first, pair.second);
            properties.push_back(property);
        }
    }

    bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
    const IndexPropertyType* index_accessor = has_index_accessor ? &s_class.index_accessor : nullptr;

    ctor = WrappedObject<ClassType>::init(env, s_class.name, &ObjectWrap<ClassType>::constructor_callback,
                                          &ObjectWrap<ClassType>::has_native_method, properties, index_accessor);

    auto ctorPrototypeProperty = ctor.Get("prototype");
    if (ctorPrototypeProperty.IsUndefined()) {
        throw std::runtime_error("undefined 'prototype' on constructor");
    }

    JsiFunc parentCtor = ObjectWrapAccessor<ParentClassType>::init_class(env);
    if (!parentCtor.IsEmpty()) {

        auto parentCtorPrototypeProperty = parentCtor.Get("prototype");
        if (parentCtorPrototypeProperty.IsUndefined()) {
            throw std::runtime_error("undefined 'prototype' on parent constructor");
        }

        ObjectSetPrototypeOf.Call({ctorPrototypeProperty, parentCtorPrototypeProperty});
        ObjectSetPrototypeOf.Call({ctor, parentCtor});
    }

    // use PropertyDescriptors instead of ClassPropertyDescriptors, since ClassPropertyDescriptors requires the JS
    // instance members callbacks to be instance members of the WrappedObject<ClassType> class
    if (isRealmObjectClass) {
        std::vector<jsi::PropertyDescriptor> properties;
        auto ctorPrototype = ctor.Get("prototype").As<JsiObj>();
        for (auto& pair : s_class.methods) {
            auto descriptor = jsi::PropertyDescriptor::Function(
                env, ctorPrototype, JsiString::New(env, pair.first) /*name*/, &method_callback,
                napi_default | realm::js::PropertyAttributes::DontEnum, (void*)pair.second /*callback*/);
            properties.push_back(descriptor);
        }

        for (auto& pair : s_class.properties) {
            napi_property_attributes napi_attributes =
                napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
            auto descriptor = jsi::PropertyDescriptor::Accessor<property_getter_callback>(
                JsiString::New(env, pair.first) /*name*/, napi_attributes, (void*)&pair.second /*callback*/);
            properties.push_back(descriptor);
        }

        ctorPrototype.DefineProperties(properties);
    }

    bool isRealmClass = std::is_same<ClassType, realm::js::RealmClass<realm::hermes::Types>>::value;


    return ctor;
}

template <typename ClassType>
JsiObj ObjectWrap<ClassType>::create_instance(JsiEnv env, Internal* internal)
{
    jsi::EscapableHandleScope scope(env);


    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;

    if (isRealmObjectClass && !internal) {
        throw jsi::Error::New(env, "RealmObjectClass requires an internal realm object when creating instances");
    }

    JsiObj factory = WrappedObject<ClassType>::create_instance(env, internal);
    return scope.Escape(factory).As<JsiObj>();
}

inline static void schema_object_type_constructor(const jsi::CallbackInfo& info) {}

template <typename ClassType>
void ObjectWrap<ClassType>::internal_finalizer(JsiEnv, typename ClassType::Internal* internal)
{
    if (internal) {
        delete internal;
        internal = nullptr;
    }
}

static inline void remove_schema_object(std::unordered_map<std::string, SchemaObjectType*>* schemaObjects,
                                        const std::string& schemaName)
{
    bool schemaExists = schemaObjects->count(schemaName);
    if (!schemaExists) {
        return;
    }

    SchemaObjectType* schemaObjectType = schemaObjects->at(schemaName);
    schemaObjects->erase(schemaName);
    schemaObjectType->constructor.Reset();
    delete schemaObjectType;
}

template <typename ClassType>
inline std::vector<jsi::PropertyDescriptor>
ObjectWrap<ClassType>::create_napi_property_descriptors(JsiEnv env, const JsiObj& constructorPrototype,
                                                        const realm::ObjectSchema& schema, bool redefine)
{
    std::vector<jsi::PropertyDescriptor> properties;

    for (auto& property : schema.persisted_properties) {
        std::string propName = property.public_name.empty() ? property.name : property.public_name;
        if (redefine || !constructorPrototype.HasOwnProperty(propName)) {
            hermes::String* name = get_cached_property_name(propName);
            auto descriptor = jsi::PropertyDescriptor::Accessor<property_getter, property_setter>(
                name->ToString(env), napi_enumerable, (void*)name);
            properties.push_back(descriptor);
        }
    }

    for (auto& property : schema.computed_properties) {
        std::string propName = property.public_name.empty() ? property.name : property.public_name;
        if (redefine || !constructorPrototype.HasOwnProperty(propName)) {
            hermes::String* name = get_cached_property_name(propName);
            auto descriptor = jsi::PropertyDescriptor::Accessor<property_getter, property_setter>(
                name->ToString(env), napi_enumerable, (void*)name);
            properties.push_back(descriptor);
        }
    }

    return properties;
}

template <typename ClassType>
JsiObj ObjectWrap<ClassType>::create_instance_by_schema(JsiEnv env, JsiFunc& constructor,
                                                        const realm::ObjectSchema& schema, Internal* internal)
{
    jsi::EscapableHandleScope scope(env);
    auto& s_schemaObjectTypes = get_schemaObjectTypes();
    auto& s_class = get_class();

    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;
    if (!isRealmObjectClass) {
        throw jsi::Error::New(env, "Creating instances by schema is supported for RealmObjectClass only");
    }

    if (isRealmObjectClass && !internal) {
        throw jsi::Error::New(env,
                              "RealmObjectClass requires an internal realm object when creating instances by schema");
    }

    JsiObj instance;
    auto config = internal->realm()->config();
    std::string path = config.path;
    auto version = internal->realm()->schema_version();
    std::string schemaName = schema.name + ":" + std::to_string(version);

    std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
    if (!s_schemaObjectTypes.count(path)) {
        // std::map<std::string, std::map<std::string, SchemaObjectType*>>
        schemaObjects = new std::unordered_map<std::string, SchemaObjectType*>();
        s_schemaObjectTypes.emplace(path, schemaObjects);
    }
    else {
        schemaObjects = s_schemaObjectTypes.at(path);
    }

    JsiFunc schemaObjectConstructor;
    jsi::Symbol externalSymbol = ExternalSymbol;
    // if we are creating a RealmObject from schema with no user defined constructor
    if (constructor.IsEmpty()) {
        // 1.Check by name if the constructor is already created for this RealmObject
        if (!schemaObjects->count(schemaName)) {

            // 2.Create the constructor

            // get or create the RealmObjectClass<T> constructor

            // create the RealmObject function by name
            schemaObjectConstructor = JsiFunc::New(env, schema_object_type_constructor, schema.name);

            JsiFunc realmObjectClassConstructor = ObjectWrap<ClassType>::create_constructor(env);
            auto parentCtorPrototypeProperty = realmObjectClassConstructor.Get("prototype");
            auto childPrototypeProperty = schemaObjectConstructor.Get("prototype").As<JsiObj>();
            ObjectSetPrototypeOf.Call({childPrototypeProperty, parentCtorPrototypeProperty});
            ObjectSetPrototypeOf.Call({schemaObjectConstructor, realmObjectClassConstructor});

            // get all properties from the schema
            std::vector<jsi::PropertyDescriptor> properties =
                create_napi_property_descriptors(env, childPrototypeProperty, schema, true /*redefine*/);

            // define the properties on the prototype of the schema object constructor
            childPrototypeProperty.DefineProperties(properties);

            SchemaObjectType* schemaObjectType = new SchemaObjectType();
            schemaObjects->emplace(schemaName, schemaObjectType);
            schemaObjectType->constructor = jsi::Persistent(schemaObjectConstructor);
            schemaObjectType->constructor.SuppressDestruct();
        }
        else {
            // hot path. The constructor for this schema object is already cached. use it and return a new instance
            SchemaObjectType* schemaObjectType = schemaObjects->at(schemaName);
            schemaObjectConstructor = schemaObjectType->constructor.Value();
        }

        jsi::External<Internal> externalValue = jsi::External<Internal>::New(env, internal, internal_finalizer);
        instance = schemaObjectConstructor.New({});
        instance.Set(externalSymbol, externalValue);
    }
    else {
        // creating a RealmObject with user defined constructor

        bool schemaExists = schemaObjects->count(schemaName);
        SchemaObjectType* schemaObjectType;
        if (schemaExists) {
            schemaObjectType = schemaObjects->at(schemaName);
            schemaObjectConstructor = schemaObjectType->constructor.Value();

            // check if constructors have changed for the same schema object and name
            if (!schemaObjectConstructor.StrictEquals(constructor)) {
                schemaExists = false;
                remove_schema_object(schemaObjects, schemaName);
            }
        }

        // hot path. The constructor for this schema object is already cached. use it and return a new instance
        if (schemaExists) {
            schemaObjectType = schemaObjects->at(schemaName);
            schemaObjectConstructor = schemaObjectType->constructor.Value();

            instance = schemaObjectConstructor.New({});

            jsi::External<Internal> externalValue = jsi::External<Internal>::New(env, internal, internal_finalizer);
            instance.Set(externalSymbol, externalValue);

            return scope.Escape(instance).As<JsiObj>();
        }

        schemaObjectConstructor = constructor;
        JsiObj constructorPrototype = constructor.Get("prototype").As<JsiObj>();

        // get all properties from the schema
        std::vector<jsi::PropertyDescriptor> properties =
            create_napi_property_descriptors(env, constructorPrototype, schema, false /*redefine*/);

        JsiFunc realmObjectClassConstructor = ObjectWrap<ClassType>::create_constructor(env);
        bool isInstanceOfRealmObjectClass = constructorPrototype.InstanceOf(realmObjectClassConstructor);

        // Skip if the user defined constructor inherited the RealmObjectClass. All RealmObjectClass members are
        // available already.
        if (!isInstanceOfRealmObjectClass) {
            // setup all RealmObjectClass<T> methods to the prototype of the object
            for (auto& pair : s_class.methods) {
                // don't redefine if exists
                if (!constructorPrototype.HasOwnProperty(pair.first)) {
                    auto descriptor = jsi::PropertyDescriptor::Function(
                        env, constructorPrototype, JsiString::New(env, pair.first) /*name*/, &method_callback,
                        napi_default | realm::js::PropertyAttributes::DontEnum, (void*)pair.second /*callback*/);
                    properties.push_back(descriptor);
                }
            }

            for (auto& pair : s_class.properties) {
                // don't redefine if exists
                if (!constructorPrototype.HasOwnProperty(pair.first)) {
                    napi_property_attributes napi_attributes =
                        napi_default |
                        (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
                    auto descriptor = jsi::PropertyDescriptor::Accessor<property_getter_callback>(
                        JsiString::New(env, pair.first) /*name*/, napi_attributes, (void*)&pair.second /*callback*/);
                    properties.push_back(descriptor);
                }
            }
        }

        // define the properties on the prototype of the schema object constructor
        if (properties.size() > 0) {
            constructorPrototype.DefineProperties(properties);
        }

        instance = schemaObjectConstructor.New({});
        if (!instance.InstanceOf(schemaObjectConstructor)) {
            throw jsi::Error::New(env, "Realm object constructor must not return another value");
        }

        jsi::External<Internal> externalValue = jsi::External<Internal>::New(env, internal, internal_finalizer);
        instance.Set(externalSymbol, externalValue);

        schemaObjectType = new SchemaObjectType();
        schemaObjects->emplace(schemaName, schemaObjectType);
        schemaObjectType->constructor = jsi::Persistent(schemaObjectConstructor);
        schemaObjectType->constructor.SuppressDestruct();
    }

    return scope.Escape(instance).As<JsiObj>();
}

template <typename ClassType>
inline void ObjectWrap<ClassType>::on_context_destroy(JsiEnv env, std::string realmPath)
{
    std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
    auto& s_schemaObjectTypes = get_schemaObjectTypes();
    if (!s_schemaObjectTypes.count(realmPath)) {
        return;
    }

    schemaObjects = s_schemaObjectTypes.at(realmPath);
    for (auto it = schemaObjects->begin(); it != schemaObjects->end(); ++it) {
        it->second->constructor.Reset();
        SchemaObjectType* schemaObjecttype = it->second;
        delete schemaObjecttype;
    }
    s_schemaObjectTypes.erase(realmPath);

    delete schemaObjects;
}

template <typename ClassType>
inline bool ObjectWrap<ClassType>::is_instance(JsiEnv env, const JsiObj& object)
{
    return WrappedObject<ClassType>::is_instance(env, object);
}

template <typename ClassType>
typename ClassType::Internal* ObjectWrap<ClassType>::get_internal(JsiEnv env, const JsiObj& object)
{
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;
    if (isRealmObjectClass) {
        jsi::External<typename ClassType::Internal> external =
            object.Get(ExternalSymbol).As<jsi::External<typename ClassType::Internal>>();
        if (external.IsUndefined()) {
            return nullptr;
        }

        return external.Data();
    }

    WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::try_unwrap(object);
    return wrappedObject->get_internal();
}

template <typename ClassType>
void ObjectWrap<ClassType>::set_internal(JsiEnv env, const JsiObj& object, typename ClassType::Internal* internal)
{
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;
    if (isRealmObjectClass) {
        JsiObj& obj = const_cast<JsiObj&>(object);
        obj.Set(ExternalSymbol, jsi::External<typename ClassType::Internal>::New(env, internal));
        return;
    }

    WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::try_unwrap(object);
    wrappedObject->set_internal(internal);
}

template <typename ClassType>
JsiVal ObjectWrap<ClassType>::constructor_callback(const jsi::CallbackInfo& info)
{
    JsiEnv env = info.Runtime * ();
    jsi::EscapableHandleScope scope(env);
    auto& s_class = get_class();

    if (reinterpret_cast<void*>(s_class.constructor) != nullptr) {
        auto arguments = get_arguments(info);
        hermes::Arguments args{env, arguments.size(), arguments.data()};
        s_class.constructor(env, info.This().As<JsiObj>(), args);
        return scope.Escape(env.Null()); // return a value to comply with JsiFuncCallback
    }
    else {
        bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::hermes::Types>>::value;
        if (isRealmObjectClass) {
            return scope.Escape(env.Null()); // return a value to comply with JsiFuncCallback
        }

        throw jsi::Error::New(env, "Illegal constructor");
    }
}

template <typename ClassType>
bool ObjectWrap<ClassType>::has_native_method(const std::string& name)
{
    auto& s_nativeMethods = get_nativeMethods();
    if (s_nativeMethods.find(name) != s_nativeMethods.end()) {
        return true;
    }

    return ObjectWrap<ParentClassType>::has_native_method(name);
}

template <typename ClassType>
jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
ObjectWrap<ClassType>::setup_method(JsiEnv env, const std::string& name, hermes::Types::FunctionCallback callback)
{
    auto& s_nativeMethods = get_nativeMethods();
    auto methodCallback =
        (typename WrappedObject<ClassType>::InstanceMethodCallback)(&WrappedObject<ClassType>::method_callback);
    s_nativeMethods.insert(name);
    return WrappedObject<ClassType>::InstanceMethod(
        name.c_str(), methodCallback, napi_default | realm::js::PropertyAttributes::DontEnum, (void*)callback);
}

template <typename ClassType>
jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
ObjectWrap<ClassType>::setup_static_method(JsiEnv env, const std::string& name,
                                           hermes::Types::FunctionCallback callback)
{
    return JsiObjWrap<WrappedObject<ClassType>>::StaticMethod(name.c_str(), callback,
                                                              napi_static | realm::js::PropertyAttributes::DontEnum);
}

template <typename ClassType>
jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
ObjectWrap<ClassType>::setup_property(JsiEnv env, const std::string& name, const PropertyType& property)
{
    napi_property_attributes napi_attributes =
        napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);

    auto getterCallback =
        (typename WrappedObject<ClassType>::InstanceGetterCallback)(&WrappedObject<ClassType>::getter_callback);
    auto setterCallback = (typename WrappedObject<ClassType>::InstanceSetterCallback)(
        &WrappedObject<ClassType>::readonly_setter_callback);
    if (property.setter) {
        setterCallback =
            (typename WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::setter_callback);
    }

    return WrappedObject<ClassType>::InstanceAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes,
                                                      (void*)&property);
}

template <typename ClassType>
jsi::ClassPropertyDescriptor<WrappedObject<ClassType>>
ObjectWrap<ClassType>::setup_static_property(JsiEnv env, const std::string& name, const PropertyType& property)
{
    napi_property_attributes napi_attributes =
        napi_static | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);

    auto getterCallback = (typename WrappedObject<ClassType>::StaticGetterCallback)(property.getter);
    typename WrappedObject<ClassType>::StaticSetterCallback setterCallback =
        &WrappedObject<ClassType>::readonly_static_setter_callback;
    if (property.setter) {
        setterCallback = (typename WrappedObject<ClassType>::StaticSetterCallback)(property.setter);
    }

    return WrappedObject<ClassType>::StaticAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes,
                                                    nullptr);
}

} // hermes
} // js
} // realm
#endif
