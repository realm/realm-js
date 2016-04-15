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

#include <JavaScriptCore/JSContextRef.h>
#include <JavaScriptCore/JSObjectRef.h>
#include <JavaScriptCore/JSStringRef.h>

#include "js_types.hpp"

namespace realm {
namespace jsc {

struct Types {
    using Context = JSContextRef;
    using GlobalContext = JSGlobalContextRef;
    using ClassDefinition = JSClassRef;
    using Value = JSValueRef;
    using Object = JSObjectRef;
    using String = JSStringRef;
    using Function = JSObjectRef;

    using ConstructorCallback = JSObjectCallAsConstructorCallback;
    using FunctionCallback = JSObjectCallAsFunctionCallback;
    using PropertyGetterCallback = JSObjectGetPropertyCallback;
    using PropertySetterCallback = JSObjectSetPropertyCallback;
    using IndexPropertyGetterCallback = JSValueRef (*)(JSContextRef, JSObjectRef, uint32_t, JSValueRef*);
    using IndexPropertySetterCallback = bool (*)(JSContextRef, JSObjectRef, uint32_t, JSValueRef, JSValueRef*);
    using StringPropertyGetterCallback = JSObjectGetPropertyCallback;
    using StringPropertySetterCallback = JSObjectSetPropertyCallback;
    using StringPropertyEnumeratorCallback = JSObjectGetPropertyNamesCallback;
};

template<typename T>
class Protected {
    const T m_value;

  public:
    Protected(T value) : m_value(value) {}

    operator T() const {
        return m_value;
    }
    bool operator==(const T &other) const {
        return m_value == other;
    }
    bool operator!=(const T &other) const {
        return m_value != other;
    }
    bool operator==(const Protected<T> &other) const {
        return m_value == other;
    }
    bool operator!=(const Protected<T> &other) const {
        return m_value != other;
    }
    bool operator<(const Protected<T> &other) const {
        return m_value < other.m_value;
    }
};

template<typename T>
class ObjectWrap;

using String = js::String<Types>;
using Context = js::Context<Types>;
using Value = js::Value<Types>;
using Function = js::Function<Types>;
using Object = js::Object<Types>;
using Exception = js::Exception<Types>;
using ReturnValue = js::ReturnValue<Types>;

} // jsc

namespace js {

template<>
class String<jsc::Types> {
    using StringType = String<jsc::Types>;

    JSStringRef m_str;

  public:
    String(const char *s) : m_str(JSStringCreateWithUTF8CString(s)) {}
    String(const JSStringRef &s) : m_str(JSStringRetain(s)) {}
    String(const std::string &str) : String(str.c_str()) {}
    String(const StringType &o) : String(o.m_str) {}
    String(StringType &&o) : m_str(o.m_str) {
        o.m_str = nullptr;
    }
    ~String() {
        if (m_str) {
            JSStringRelease(m_str);
        }
    }

    operator JSStringRef() const {
        return m_str;
    }
    operator std::string() const {
        size_t max_size = JSStringGetMaximumUTF8CStringSize(m_str);
        std::string string;
        string.resize(max_size);
        string.resize(JSStringGetUTF8CString(m_str, &string[0], max_size) - 1);
        return string;
    }
};

template<>
class ReturnValue<jsc::Types> {
    const JSContextRef m_context;
    JSValueRef m_value = nullptr;

public:
    ReturnValue(JSContextRef ctx) : m_context(ctx) {}

    void set(const JSValueRef &value) {
        m_value = value;
    }
    void set(const std::string &string) {
        m_value = JSValueMakeString(m_context, jsc::String(string));
    }
    void set(bool boolean) {
        m_value = JSValueMakeBoolean(m_context, boolean);
    }
    void set(double number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set(int32_t number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set(uint32_t number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set_null() {
        m_value = JSValueMakeNull(m_context);
    }
    void set_undefined() {
        m_value = JSValueMakeUndefined(m_context);
    }
    operator JSValueRef() const {
        return m_value;
    }
};

template<>
class Protected<JSGlobalContextRef> : public jsc::Protected<JSGlobalContextRef> {
  public:
    Protected(JSGlobalContextRef ctx) : jsc::Protected<JSGlobalContextRef>(ctx) {
        JSGlobalContextRetain(*this);
    }
    ~Protected() {
        JSGlobalContextRelease(*this);
    }
};

template<>
class Protected<JSValueRef> : public jsc::Protected<JSValueRef> {
    const JSGlobalContextRef m_context;

  public:
    Protected(JSContextRef ctx, JSValueRef value) : jsc::Protected<JSValueRef>(value), m_context(JSContextGetGlobalContext(ctx)) {
        JSValueProtect(m_context, *this);
    }
    ~Protected() {
        JSValueUnprotect(m_context, *this);
    }
};

template<>
class Protected<JSObjectRef> : public Protected<JSValueRef> {
  public:
    Protected(JSContextRef ctx, JSObjectRef object) : Protected<JSValueRef>(ctx, object) {}

    operator JSObjectRef() const {
        JSValueRef value = static_cast<JSValueRef>(*this);
        return (JSObjectRef)value;
    }
};

static inline bool is_object_of_type(JSContextRef ctx, JSValueRef value, jsc::String type) {
    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    JSValueRef exception = nullptr;
    JSValueRef constructor = JSObjectGetProperty(ctx, global_object, type, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    bool result = JSValueIsInstanceOfConstructor(ctx, value, jsc::Value::validated_to_constructor(ctx, constructor), &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    return result;
}

template<>
inline JSGlobalContextRef jsc::Context::get_global_context(JSContextRef ctx) {
    return JSContextGetGlobalContext(ctx);
}

template<>
inline bool jsc::Value::is_array(JSContextRef ctx, const JSValueRef &value) {
    // JSValueIsArray() is not available until iOS 9.
    static const jsc::String type = "Array";
    return is_object_of_type(ctx, value, type);
}

template<>
inline bool jsc::Value::is_array_buffer(JSContextRef ctx, const JSValueRef &value) {
    static const jsc::String type = "ArrayBuffer";
    return is_object_of_type(ctx, value, type);
}

template<>
inline bool jsc::Value::is_date(JSContextRef ctx, const JSValueRef &value) {
    static const jsc::String type = "Date";
    return is_object_of_type(ctx, value, type);
}

template<>
inline bool jsc::Value::is_boolean(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsBoolean(ctx, value);
}

template<>
inline bool jsc::Value::is_constructor(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsObject(ctx, value) && JSObjectIsConstructor(ctx, (JSObjectRef)value);
}

template<>
inline bool jsc::Value::is_function(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsObject(ctx, value) && JSObjectIsFunction(ctx, (JSObjectRef)value);
}

template<>
inline bool jsc::Value::is_null(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsNull(ctx, value);
}

template<>
inline bool jsc::Value::is_number(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsNumber(ctx, value);
}

template<>
inline bool jsc::Value::is_object(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsObject(ctx, value);
}

template<>
inline bool jsc::Value::is_string(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsString(ctx, value);
}

template<>
inline bool jsc::Value::is_undefined(JSContextRef ctx, const JSValueRef &value) {
    return JSValueIsUndefined(ctx, value);
}

template<>
inline bool jsc::Value::is_valid(const JSValueRef &value) {
    return value != nullptr;
}

template<>
inline JSValueRef jsc::Value::from_boolean(JSContextRef ctx, bool boolean) {
    return JSValueMakeBoolean(ctx, boolean);
}

template<>
inline JSValueRef jsc::Value::from_null(JSContextRef ctx) {
    return JSValueMakeNull(ctx);
}

template<>
inline JSValueRef jsc::Value::from_number(JSContextRef ctx, double number) {
    return JSValueMakeNumber(ctx, number);
}

template<>
inline JSValueRef jsc::Value::from_string(JSContextRef ctx, const jsc::String &string) {
    return JSValueMakeString(ctx, string);
}

template<>
inline JSValueRef jsc::Value::from_undefined(JSContextRef ctx) {
    return JSValueMakeUndefined(ctx);
}

template<>
inline bool jsc::Value::to_boolean(JSContextRef ctx, const JSValueRef &value) {
    return JSValueToBoolean(ctx, value);
}

template<>
inline double jsc::Value::to_number(JSContextRef ctx, const JSValueRef &value) {
    JSValueRef exception = nullptr;
    double number = JSValueToNumber(ctx, value, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    if (isnan(number)) {
        throw std::invalid_argument("Value not convertible to a number.");
    }
    return number;
}

template<>
inline jsc::String jsc::Value::to_string(JSContextRef ctx, const JSValueRef &value) {
    JSValueRef exception = nullptr;
    jsc::String string = JSValueToStringCopy(ctx, value, &exception);

    // Since the string's retain value is +2 here, we need to manually release it before returning.
    JSStringRelease(string);

    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return string;
}

template<>
inline JSObjectRef jsc::Value::to_object(JSContextRef ctx, const JSValueRef &value) {
    JSValueRef exception = nullptr;
    JSObjectRef object = JSValueToObject(ctx, value, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return object;
}

template<>
inline JSObjectRef jsc::Value::to_array(JSContextRef ctx, const JSValueRef &value) {
    return to_object(ctx, value);
}

template<>
inline JSObjectRef jsc::Value::to_constructor(JSContextRef ctx, const JSValueRef &value) {
    return to_object(ctx, value);
}

template<>
inline JSObjectRef jsc::Value::to_date(JSContextRef ctx, const JSValueRef &value) {
    return to_object(ctx, value);
}

template<>
inline JSObjectRef jsc::Value::to_function(JSContextRef ctx, const JSValueRef &value) {
    return to_object(ctx, value);
}

template<>
inline JSValueRef jsc::Function::call(JSContextRef ctx, const JSObjectRef &function, const JSObjectRef &this_object, size_t argc, const JSValueRef arguments[]) {
    JSValueRef exception = nullptr;
    JSValueRef result = JSObjectCallAsFunction(ctx, function, this_object, argc, arguments, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}

template<>
inline JSObjectRef jsc::Function::construct(JSContextRef ctx, const JSObjectRef &function, size_t argc, const JSValueRef arguments[]) {
    JSValueRef exception = nullptr;
    JSObjectRef result = JSObjectCallAsConstructor(ctx, function, argc, arguments, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}

template<>
inline bool jsc::Object::has_property(JSContextRef ctx, const JSObjectRef &object, const jsc::String &key) {
    return JSObjectHasProperty(ctx, object, key);
}

template<>
inline bool jsc::Object::has_property(JSContextRef ctx, const JSObjectRef &object, uint32_t index) {
    return JSObjectHasProperty(ctx, object, jsc::String(util::to_string(index)));
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
template<typename U>
inline JSObjectRef jsc::Object::create_instance(JSContextRef ctx, U* internal) {
    return jsc::ObjectWrap<U>::create_instance(ctx, internal);
}

template<>
template<typename U>
inline bool jsc::Object::is_instance(JSContextRef ctx, const JSObjectRef &object) {
    return jsc::ObjectWrap<U>::has_instance(ctx, object);
}

template<>
template<typename U>
inline U* jsc::Object::get_internal(const JSObjectRef &object) {
    return *static_cast<jsc::ObjectWrap<U> *>(JSObjectGetPrivate(object));
}

template<>
template<typename U>
inline void jsc::Object::set_internal(const JSObjectRef &object, U* ptr) {
    auto wrap = static_cast<jsc::ObjectWrap<U> *>(JSObjectGetPrivate(object));
    *wrap = ptr;
}

template<>
inline JSValueRef jsc::Exception::value(JSContextRef ctx, const std::string &message) {
    JSValueRef value = jsc::Value::from_string(ctx, message);
    return JSObjectMakeError(ctx, 1, &value, NULL);
}

} // js
} // realm
