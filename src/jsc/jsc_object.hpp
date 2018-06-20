////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include "jsc_types.hpp"

namespace realm {
namespace js {

template<>
inline JSValueRef jsc::Object::get_property(JSContextRef ctx, const JSObjectRef &object, StringData key) {
    return get_property(ctx, object, jsc::String(key));
}

template<>
inline JSValueRef jsc::Object::get_property(JSContextRef ctx, const JSObjectRef &object, const jsc::String &key) {
    JSValueRef exception = nullptr;
    JSValueRef value = JSObjectGetProperty(ctx, object, key, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return value;
}

template<>
inline JSValueRef jsc::Object::get_property(JSContextRef ctx, const JSObjectRef &object, uint32_t index) {
    JSValueRef exception = nullptr;
    JSValueRef value = JSObjectGetPropertyAtIndex(ctx, object, index, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return value;
}

template<>
inline void jsc::Object::set_property(JSContextRef ctx, const JSObjectRef &object, const jsc::String &key, const JSValueRef &value, PropertyAttributes attributes) {
    JSValueRef exception = nullptr;
    JSObjectSetProperty(ctx, object, key, value, attributes << 1, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
}

template<>
inline void jsc::Object::set_property(JSContextRef ctx, const JSObjectRef &object, uint32_t index, const JSValueRef &value) {
    JSValueRef exception = nullptr;
    JSObjectSetPropertyAtIndex(ctx, object, index, value, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
}

template<>
inline std::vector<jsc::String> jsc::Object::get_property_names(JSContextRef ctx, const JSObjectRef &object) {
    JSPropertyNameArrayRef property_names = JSObjectCopyPropertyNames(ctx, object);
    size_t property_count = JSPropertyNameArrayGetCount(property_names);

    std::vector<jsc::String> names;
    names.reserve(property_count);

    for (size_t i = 0; i < property_count; i++) {
        names.push_back(JSPropertyNameArrayGetNameAtIndex(property_names, i));
    }

    JSPropertyNameArrayRelease(property_names);
    return names;
}

template<>
inline JSValueRef jsc::Object::get_prototype(JSContextRef ctx, const JSObjectRef &object) {
    return JSObjectGetPrototype(ctx, object);
}

template<>
inline void jsc::Object::set_prototype(JSContextRef ctx, const JSObjectRef &object, const JSValueRef &prototype) {
    JSObjectSetPrototype(ctx, object, prototype);
}

template<>
inline JSObjectRef jsc::Object::create_empty(JSContextRef ctx) {
    return JSObjectMake(ctx, nullptr, nullptr);
}

template<>
inline JSObjectRef jsc::Object::create_array(JSContextRef ctx, uint32_t length, const JSValueRef values[]) {
    JSValueRef exception = nullptr;
    JSObjectRef array = JSObjectMakeArray(ctx, length, values, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return array;
}

template<>
inline JSObjectRef jsc::Object::create_date(JSContextRef ctx, double time) {
    JSValueRef number = jsc::Value::from_number(ctx, time);
    return JSObjectMakeDate(ctx, 1, &number, nullptr);
}

template<>
template<typename ClassType>
inline JSObjectRef jsc::Object::create_instance(JSContextRef ctx, typename ClassType::Internal* internal) {
    return jsc::ObjectWrap<ClassType>::create_instance(ctx, internal);
}

template<>
template<typename ClassType>
inline bool jsc::Object::is_instance(JSContextRef ctx, const JSObjectRef &object) {
    return jsc::ObjectWrap<ClassType>::has_instance(ctx, object);
}

template<>
template<typename ClassType>
inline typename ClassType::Internal* jsc::Object::get_internal(const JSObjectRef &object) {
    return *static_cast<jsc::ObjectWrap<ClassType> *>(JSObjectGetPrivate(object));
}

template<>
template<typename ClassType>
inline void jsc::Object::set_internal(const JSObjectRef &object, typename ClassType::Internal* ptr) {
    auto wrap = static_cast<jsc::ObjectWrap<ClassType> *>(JSObjectGetPrivate(object));
    *wrap = ptr;
}

template<>
inline void jsc::Object::set_global(JSContextRef ctx, const jsc::String &key, const JSValueRef &value) {
    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    jsc::Object::set_property(ctx, global_object, key, value, js::ReadOnly | js::DontEnum | js::DontDelete);
}

template<>
inline JSValueRef jsc::Object::get_global(JSContextRef ctx, const jsc::String &key) {
    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    return jsc::Object::get_property(ctx, global_object, key);
}
    
} // js
} // realm
