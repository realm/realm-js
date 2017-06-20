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

#include "jsc_protected.hpp"
#include "jsc_types.hpp"
#include "jsc_string.hpp"

namespace realm {
namespace js {

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
bool jsc::Value::is_binary(JSContextRef ctx, const JSValueRef &value);

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
JSValueRef jsc::Value::from_binary(JSContextRef ctx, BinaryData data);

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
OwnedBinaryData jsc::Value::to_binary(JSContextRef ctx, JSValueRef value);

} // js
} // realm
