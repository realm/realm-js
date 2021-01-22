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
inline const char *jsc::Value::typeof(JSContextRef ctx, const JSValueRef &value) {
    switch (JSValueGetType(ctx, value)) {
        case kJSTypeNull: return "null";
        case kJSTypeNumber: return "number";
        case kJSTypeObject: return "object";
        case kJSTypeString: return "string";
        case kJSTypeBoolean: return "boolean";
        case kJSTypeUndefined: return "undefined";
        #if defined __IPHONE_12_2 || defined __MAC_10_14_4
            case kJSTypeSymbol: return "symbol";
        #endif
    }
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
inline bool jsc::Value::is_error(JSContextRef ctx, const JSValueRef &value) {
    static const jsc::String type = "Error";
    return is_object_of_type(ctx, value, type);
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

inline bool is_bson_type(JSContextRef ctx, const JSValueRef &value, std::string type) {
    if (JSValueIsNull(ctx, value) || JSValueIsUndefined(ctx, value) || !JSValueIsObject(ctx, value)) {
        return false;
    }


    JSValueRef error = nullptr;
    JSObjectRef object = JSValueToObject(ctx, value, &error);
    if (error) {
        throw jsc::Exception(ctx, error);
    }

    JSValueRef bson_type = JSObjectGetProperty(ctx, object, JSStringCreateWithUTF8CString("_bsontype"), &error);
    if (error) {
        throw jsc::Exception(ctx, error);
    }

    if (JSValueIsUndefined(ctx, value)) {
        return false;
    }

    jsc::String bson_type_value = JSValueToStringCopy(ctx, bson_type, &error);
    // Since the string's retain value is +2 here, we need to manually release it before returning.
    JSStringRelease(bson_type_value);
    if (error) {
        throw jsc::Exception(ctx, error);
    }

    return (std::string)bson_type_value == type;
}

/**
 * Checks if a `value` is an EJSON representation of a particular type (determined by the existance of a particular property).
 */
inline bool is_ejson_type(JSContextRef ctx, const JSValueRef &value, std::string property_name) {
    if (JSValueIsNull(ctx, value) || JSValueIsUndefined(ctx, value) || !JSValueIsObject(ctx, value)) {
        return false;
    }

    JSValueRef error = nullptr;
    JSObjectRef object = JSValueToObject(ctx, value, &error);
    if (error) {
        throw jsc::Exception(ctx, error);
    }

    JSStringRef property_name_string = JSStringCreateWithUTF8CString(property_name.c_str());
    auto property = JSObjectGetProperty(ctx, object, property_name_string, &error);
    if (error) {
        throw jsc::Exception(ctx, error);
    }

    return JSValueIsUndefined(ctx, property) == false;
}

template<>
inline bool jsc::Value::is_decimal128(JSContextRef ctx, const JSValueRef &value) {
    return is_bson_type(ctx, value, "Decimal128") || is_ejson_type(ctx, value, "$numberDecimal");
}

template<>
inline bool jsc::Value::is_object_id(JSContextRef ctx, const JSValueRef &value) {
    return is_bson_type(ctx, value, "ObjectID") || is_ejson_type(ctx, value, "$oid");
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
inline JSValueRef jsc::Value::from_nonnull_string(JSContextRef ctx, const jsc::String &string) {
    return JSValueMakeString(ctx, string);
}

template<>
inline JSValueRef jsc::Value::from_undefined(JSContextRef ctx) {
    return JSValueMakeUndefined(ctx);
}

template<>
JSValueRef jsc::Value::from_nonnull_binary(JSContextRef ctx, BinaryData data);

template<>
JSValueRef jsc::Value::from_decimal128(JSContextRef ctx, const Decimal128& value);

template<>
JSValueRef jsc::Value::from_object_id(JSContextRef ctx, const ObjectId& value);

template<>
JSValueRef jsc::Value::from_uuid(JSContextRef ctx, const UUID& value);

template<>
inline bool jsc::Value::to_boolean(JSContextRef ctx, const JSValueRef &value) {
    return JSValueToBoolean(ctx, value);
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
inline double jsc::Value::to_number(JSContextRef ctx, const JSValueRef &value) {
    JSValueRef exception = nullptr;
    double number = JSValueToNumber(ctx, value, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    if (isnan(number)) {
        throw std::invalid_argument(util::format("Value '%1' not convertible to a number.",
                                                 (std::string)to_string(ctx, value)));
    }
    return number;
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
    if (JSValueIsString(ctx, value)) {
        JSValueRef error;
        std::array<JSValueRef, 1> args { value };
        if (JSObjectRef result = JSObjectMakeDate(ctx, args.size(), args.data(), &error)) {
            return result;
        } else {
            throw jsc::Exception(ctx, error);
        }
    }
    return to_object(ctx, value);
}

template<>
inline JSObjectRef jsc::Value::to_function(JSContextRef ctx, const JSValueRef &value) {
    return to_object(ctx, value);
}

template<>
OwnedBinaryData jsc::Value::to_binary(JSContextRef ctx, JSValueRef value);

template<>
Decimal128 jsc::Value::to_decimal128(JSContextRef ctx, const JSValueRef& value);

template<>
ObjectId jsc::Value::to_object_id(JSContextRef ctx, const JSValueRef& value);

template<>
UUID jsc::Value::to_uuid(JSContextRef ctx, const JSValueRef& value);

} // js
} // realm
