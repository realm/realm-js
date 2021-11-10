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
#include "jsi_string.hpp"

namespace realm {
namespace js {

namespace hermes {
    // forward-declare JSI ObjectWrap from jsi_class.hpp
    template<typename ClassType>
        class ObjectWrap;
}

namespace fbjsi = facebook::jsi;

#if 0
inline napi_property_attributes operator|(napi_property_attributes a, PropertyAttributes b) {
    int flag = napi_default;

    if ((b & DontEnum) != DontEnum) {
        flag |= napi_enumerable;
    }

    if ((b & DontDelete) != DontDelete) {
        flag |= napi_configurable;
    }

    if ((b & ReadOnly) != ReadOnly) {
        flag |= napi_writable;
    }

    napi_property_attributes napi_flag = static_cast<napi_property_attributes>(a | flag);
    return napi_flag;
}
#endif

template<>
inline JsiVal realmjsi::Object::get_property(JsiEnv env, const JsiObj& object, StringData key) {
    return env(object->getProperty(env, propName(env, key)));
}

template<>
inline JsiVal realmjsi::Object::get_property(JsiEnv env, const JsiObj& object, const realmjsi::String &key) {
    return env(object->getProperty(env, propName(env, key)));
}

template<>
inline JsiVal realmjsi::Object::get_property(JsiEnv env, const JsiObj& object, uint32_t index) {
    if (object->isArray(env))
        return env(object->asArray(env).getValueAtIndex(env, index));
    return realmjsi::Object::get_property(env, object, std::to_string(index));
}

template<>
inline void realmjsi::Object::set_property(JsiEnv env, JsiObj& object, const realmjsi::String& key, const JsiVal& value, PropertyAttributes attributes) {
    if (attributes) {
        auto desc = fbjsi::Object(env);
        desc.setProperty(env, "configurable", !(attributes & DontDelete));
        desc.setProperty(env, "enumerable", !(attributes & DontEnum));
        desc.setProperty(env, "writable", !(attributes & ReadOnly));
        desc.setProperty(env, "value", value);

        auto objClass = env->global().getPropertyAsObject(env, "Object");
        objClass.getPropertyAsFunction(env, "defineProperty").callWithThis(
            env,
            objClass,
            object,
            str(env, key),
            std::move(desc));
    } else {
        object->setProperty(env, propName(env, key), value);
    }
}

template<>
inline void realmjsi::Object::set_property(JsiEnv env, JsiObj& object, uint32_t index, const JsiVal& value) {
    if (object->isArray(env))
        return object->asArray(env).setValueAtIndex(env, index, value);
    return realmjsi::Object::set_property(env, object, std::to_string(index), value);
}

template<>
inline std::vector<realmjsi::String> realmjsi::Object::get_property_names(JsiEnv env, const JsiObj& object) {
    auto namesArray = object->getPropertyNames(env);

    size_t count = namesArray.length(env);
    std::vector<realmjsi::String> names;
    names.reserve(count);

    for (size_t i = 0; i < count; i++) {
        names.push_back(namesArray.getValueAtIndex(env, i).asString(env).utf8(env));
    }

    return names;
}

template<>
inline JsiVal realmjsi::Object::get_prototype(JsiEnv env, const JsiObj& object) {
    auto objClass = env->global().getPropertyAsObject(env, "Object");
    return env(objClass.getPropertyAsFunction(env, "getPrototypeOf").callWithThis(env, objClass, object));
}

template<>
inline void realmjsi::Object::set_prototype(JsiEnv env, const JsiObj& object, const JsiVal& prototype) {
    auto objClass = env->global().getPropertyAsObject(env, "Object");
    objClass.getPropertyAsFunction(env, "setPrototypeOf").callWithThis(env, objClass, object, prototype);
}

template<>
inline JsiObj realmjsi::Object::create_empty(JsiEnv env) {
    return JsiObj(env);
}

template<>
inline JsiObj realmjsi::Object::create_array(JsiEnv env, uint32_t length, const JsiVal values[]) {
    fbjsi::Array array = fbjsi::Array(env, length);
    for (uint32_t i = 0; i < length; i++) {
        array.setValueAtIndex(env, i, values[i]);
    }
    return env(std::move(array));
}

template<>
inline JsiObj realmjsi::Object::create_date(JsiEnv env, double time) {
    return env(env->global().getPropertyAsFunction(env, "Date").callAsConstructor(env, time).asObject(env));
}

template<>
template<typename ClassType>
inline JsiObj realmjsi::Object::create_instance(JsiEnv env, typename ClassType::Internal* internal) {
    return hermes::ObjectWrap<ClassType>::create_instance(env, internal);
}

template<>
template<typename ClassType>
inline JsiObj realmjsi::Object::create_instance_by_schema(JsiEnv env, JsiFunc& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal* internal) {
    return hermes::ObjectWrap<ClassType>::create_instance_by_schema(env, constructor, schema, internal);
}

template<>
template<typename ClassType>
inline JsiObj realmjsi::Object::create_instance_by_schema(JsiEnv env, const realm::ObjectSchema& schema, typename ClassType::Internal* internal) {
    return hermes::ObjectWrap<ClassType>::create_instance_by_schema(env, schema, internal);
}

template<typename ClassType>
inline void on_context_destroy(JsiEnv env, std::string realmPath) {
    hermes::ObjectWrap<ClassType>::on_context_destroy(env, realmPath);
}

template<>
template<typename ClassType>
inline bool realmjsi::Object::is_instance(JsiEnv env, const JsiObj& object) {
    return hermes::ObjectWrap<ClassType>::is_instance(env, object);
}

template<>
template<typename ClassType>
inline typename ClassType::Internal* realmjsi::Object::get_internal(JsiEnv env, const JsiObj& object) {
    return hermes::ObjectWrap<ClassType>::get_internal(env, object);
}

template<>
template<typename ClassType>
inline void realmjsi::Object::set_internal(JsiEnv env, const JsiObj& object, typename ClassType::Internal* internal) {
    return hermes::ObjectWrap<ClassType>::set_internal(env, object, internal);
}

template<>
inline void realmjsi::Object::set_global(JsiEnv env, const realmjsi::String &key, const JsiVal &value) {
    auto global = env.global();
    Object::set_property(env, global, key, value);
}

template<>
inline JsiVal realmjsi::Object::get_global(JsiEnv env, const realmjsi::String &key) {
    return Object::get_property(env, env.global(), key);
}

template<>
inline JsiVal realmjsi::Exception::value(JsiEnv env, const std::string &message) {
	return str(env, message);
}

} // js
} // realm
