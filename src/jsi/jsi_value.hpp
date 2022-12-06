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

#include "jsi_string.hpp"
#include "jsi_types.hpp"
#include "realm/util/to_string.hpp"

namespace realm {
namespace js {

namespace fbjsi = facebook::jsi;

template <>
inline const char* realmjsi::Value::typeof(JsiEnv env, const JsiVal& value)
{
    if (value->isNull()) {
        return "null";
    }
    if (value->isNumber()) {
        return "number";
    }
    if (value->isString()) {
        return "string";
    }
    if (value->isBool()) {
        return "boolean";
    }
    if (value->isUndefined()) {
        return "undefined";
    }
    if (value->isObject()) {
        return "object";
    }
    return "unknown";
}

template <>
inline bool realmjsi::Value::is_array(JsiEnv env, const JsiVal& value)
{
    return value->isObject() && value->getObject(env).isArray(env);
}

template <>
inline bool realmjsi::Value::is_array_buffer(JsiEnv env, const JsiVal& value)
{
    return value->isObject() && value->getObject(env).isArrayBuffer(env);
}

template <>
inline bool realmjsi::Value::is_array_buffer_view(JsiEnv env, const JsiVal& value)
{
    return globalType(env, "ArrayBuffer").getPropertyAsFunction(env, "isView").call(env, value).getBool();
}

template <>
inline bool realmjsi::Value::is_date(JsiEnv env, const JsiVal& value)
{
    return value->isObject() &&
           value->getObject(env).instanceOf(env, env->global().getPropertyAsFunction(env, "Date"));
}

template <>
inline bool realmjsi::Value::is_boolean(JsiEnv env, const JsiVal& value)
{
    return value->isBool();
}

template <>
inline bool realmjsi::Value::is_constructor(JsiEnv env, const JsiVal& value)
{
    return value->isObject() && value->getObject(env).isFunction(env);
}

template <>
inline bool realmjsi::Value::is_error(JsiEnv env, const JsiVal& value)
{
    return value->isObject() &&
           value->getObject(env).instanceOf(env, env->global().getPropertyAsFunction(env, "Error"));
}

template <>
inline bool realmjsi::Value::is_function(JsiEnv env, const JsiVal& value)
{
    return value->isObject() && value->getObject(env).isFunction(env);
}

template <>
inline bool realmjsi::Value::is_null(JsiEnv env, const JsiVal& value)
{
    return value->isNull();
}

template <>
inline bool realmjsi::Value::is_number(JsiEnv env, const JsiVal& value)
{
    return value->isNumber();
}

inline bool is_bson_type(JsiEnv env, const JsiVal& value, std::string type)
{
    if (value->isNull() || value->isUndefined() || !value->isObject()) {
        return false;
    }

    auto bsonType = value->getObject(env).getProperty(env, "_bsontype");
    if (bsonType.isUndefined()) {
        return false;
    }

    return fbjsi::Value::strictEquals(env, bsonType, JsiVal(str(env, type)));
}

template <>
inline bool realmjsi::Value::is_decimal128(JsiEnv env, const JsiVal& value)
{
    return is_bson_type(env, value, "Decimal128");
}

template <>
inline bool realmjsi::Value::is_object_id(JsiEnv env, const JsiVal& value)
{
    return is_bson_type(env, value, "ObjectID");
}

template <>
inline bool realmjsi::Value::is_object(JsiEnv env, const JsiVal& value)
{
    return value->isObject();
}

template <>
inline bool realmjsi::Value::is_string(JsiEnv env, const JsiVal& value)
{
    return value->isString();
}

template <>
inline bool realmjsi::Value::is_undefined(JsiEnv env, const JsiVal& value)
{
    return value->isUndefined();
}

template <>
inline bool realmjsi::Value::is_binary(JsiEnv env, const JsiVal& value)
{
    return Value::is_array_buffer(env, value) || Value::is_array_buffer_view(env, value);
}

template <>
inline bool realmjsi::Value::is_valid(const JsiVal& value)
{
    return (*value) != nullptr;
}

template <>
inline bool realmjsi::Value::is_uuid(JsiEnv env, const JsiVal& value)
{
    return is_bson_type(env, value, "UUID");
}

template <>
inline JsiVal realmjsi::Value::from_boolean(JsiEnv env, bool boolean)
{
    return JsiVal(env, boolean);
}

template <>
inline JsiVal realmjsi::Value::from_null(JsiEnv env)
{
    return env.null();
}

template <>
inline JsiVal realmjsi::Value::from_number(JsiEnv env, double number)
{
    return JsiVal(env, number);
}

template <>
inline JsiVal realmjsi::Value::from_nonnull_string(JsiEnv env, const realmjsi::String& string)
{
    return str(env, StringData(string));
}

template <>
inline JsiVal realmjsi::Value::from_nonnull_binary(JsiEnv env, BinaryData data)
{
    fbjsi::ArrayBuffer buffer =
        globalType(env, "ArrayBuffer").callAsConstructor(env, double(data.size())).getObject(env).getArrayBuffer(env);

    if (data.size()) {
        memcpy(buffer.data(env), data.data(), data.size());
    }

    return env(std::move(buffer));
}

template <>
inline JsiVal realmjsi::Value::from_undefined(JsiEnv env)
{
    return env.undefined();
}

template <>
inline JsiVal realmjsi::Value::from_uuid(JsiEnv env, const UUID& uuid)
{
    return env(globalType(env, "Realm")
                   .getPropertyAsFunction(env, "_UUID")
                   .callAsConstructor(env, str(env, uuid.to_string())));
}

template <>
inline bool realmjsi::Value::to_boolean(JsiEnv env, const JsiVal& value)
{
    if (value->isBool()) {
        return value->getBool();
    }

    // boolean conversions as specified by
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean ...

    // trivial conversions to false
    if (value->isUndefined() || value->isNull()) {
        return false;
    }

    if (value->isObject()) {
        // not null, as checked above
        return true;
    }

    if (value->isString()) {
        // only the empty string is false
        return value->toString(env).utf8(env) != "";
    }

    if (value->isNumber()) {
        double const dblval = value->asNumber();
        if (std::isnan(dblval)) {
            return false;
        }

        std::string const stringval = value->toString(env).utf8(env);
        return (stringval != "0" && stringval != "-0");
    }

    throw fbjsi::JSError(env,
                         util::format("TypeError:  cannot convert type %1 to boolean", Value::typeof(env, value)));
}

template <>
inline realmjsi::String realmjsi::Value::to_string(JsiEnv env, const JsiVal& value)
{
    return value->toString(env).utf8(env);
}

template <>
inline double realmjsi::Value::to_number(JsiEnv env, const JsiVal& value)
{
    double number = std::nan("");
    if (value->isNumber()) {
        number = value->asNumber();
    }
    else if (value->isString()) {
        std::string string = value->toString(env).utf8(env);
        try {
            number = std::stod(string);
        }
        catch (std::invalid_argument) {
            // The number will remain nan and we defer to the check below to throw an exception.
        }
    }
    else if (is_date(env, value)) {
        fbjsi::Object date = value->getObject(env);
        number = date.getPropertyAsFunction(env, "getTime").callWithThis(env, date).getNumber();
    }
    if (std::isnan(number)) {
        throw std::invalid_argument(
            util::format("Value '%1' not convertible to a number.", (std::string)to_string(env, value)));
    }

    return number;
}

template <>
inline OwnedBinaryData realmjsi::Value::to_binary_impl(JsiEnv env, const JsiVal& value)
{
    auto obj = value->asObject(env);
    if (obj.isArrayBuffer(env)) {
        auto buf = std::move(obj).getArrayBuffer(env);
        return OwnedBinaryData(reinterpret_cast<const char*>(buf.data(env)), buf.length(env));
    }

    if (is_array_buffer_view(env, value)) {
        auto buffer = obj.getPropertyAsObject(env, "buffer").getArrayBuffer(env);
        size_t byteOffset = static_cast<size_t>(obj.getProperty(env, "byteOffset").asNumber());
        size_t byteLength = static_cast<size_t>(obj.getProperty(env, "byteLength").asNumber());
        return OwnedBinaryData(reinterpret_cast<const char*>(buffer.data(env) + byteOffset), byteLength);
    }

    throw std::runtime_error("Can only convert ArrayBuffer and ArrayBufferView objects to binary");
}

/**
 * @brief convert a JSI value to an object
 * Will try to convert a given value to a JavaScript object according to
 * https://tc39.es/ecma262/#sec-toobject.  Most primitive types will be wrapped
 * in their corresponding object types (e.g., string -> String).
 *
 * @param env JSI runtime environment
 * @param value JSI value that will be converted to object
 * @return JsiObj
 */
template <>
inline JsiObj realmjsi::Value::to_object(JsiEnv env, JsiVal const& value)
{
    if (value->isObject()) {
        return env(value->asObject(env));
    }

    // trivial non-conversions
    if (value->isNull() || value->isUndefined()) {
        throw fbjsi::JSError(env, util::format("TypeError:  cannot convert '%1' to object",
                                               realmjsi::Value::typeof(env, value))); // throw TypeError
    }

    // use JavaScript's `Object()` to wrap types in their corresponding object types
    auto objectCtor = env->global().getPropertyAsFunction(env, "Object");
    fbjsi::Value wrappedValue = objectCtor.callAsConstructor(env, value);
    if (!wrappedValue.isObject()) {
        throw fbjsi::JSError(
            env, util::format("TypeError:  cannot wrap %1 in Object", realmjsi::Value::typeof(env, value)));
    }
    return env(wrappedValue.asObject(env));
}

template <>
inline JsiObj realmjsi::Value::to_array(JsiEnv env, const JsiVal& value)
{
    return to_object(env, value);
}

template <>
inline JsiFunc realmjsi::Value::to_function(JsiEnv env, const JsiVal& value)
{
    return env(value->asObject(env).asFunction(env));
}

template <>
inline JsiFunc realmjsi::Value::to_constructor(JsiEnv env, const JsiVal& value)
{
    return to_function(env, value);
}

template <>
inline JsiObj realmjsi::Value::to_date(JsiEnv env, const JsiVal& value)
{
    if (value->isString()) {
        return env(globalType(env, "Date").callAsConstructor(env, value).asObject(env));
    }

    return to_object(env, value);
}

template <>
inline JsiVal realmjsi::Value::from_decimal128(JsiEnv env, const Decimal128& number)
{
    if (number.is_null()) {
        return env(fbjsi::Value::null());
    }

    return env(globalType(env, "Realm")
                   .getPropertyAsObject(env, "_Decimal128")
                   .getPropertyAsFunction(env, "fromString")
                   .call(env, str(env, number.to_string())));
}

template <>
inline Decimal128 realmjsi::Value::to_decimal128(JsiEnv env, const JsiVal& value)
{
    return Decimal128(value->toString(env).utf8(env));
}

template <>
inline JsiVal realmjsi::Value::from_object_id(JsiEnv env, const ObjectId& objectId)
{
    return env(globalType(env, "Realm")
                   .getPropertyAsFunction(env, "_ObjectId")
                   .callAsConstructor(env, str(env, objectId.to_string())));
}

template <>
inline ObjectId realmjsi::Value::to_object_id(JsiEnv env, const JsiVal& value)
{
    auto objectId = value->asObject(env);
    return ObjectId(objectId.getPropertyAsFunction(env, "toHexString")
                        .callWithThis(env, objectId)
                        .getString(env)
                        .utf8(env)
                        .c_str());
}

template <>
inline UUID realmjsi::Value::to_uuid(JsiEnv env, const JsiVal& value)
{
    auto uuid = value->asObject(env);
    return UUID(
        uuid.getPropertyAsFunction(env, "toHexString").callWithThis(env, uuid).getString(env).utf8(env).c_str());
}

} // namespace js
} // namespace realm
