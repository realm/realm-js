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

#include "node_types.hpp"
#include "napi.h"
#include "realm/binary_data.hpp"

namespace realm {
namespace js {

template <>
inline const char* node::Value::typeof(Napi::Env env, const Napi::Value& value)
{
    if (value.IsNull()) {
        return "null";
    }
    if (value.IsNumber()) {
        return "number";
    }
    if (value.IsString()) {
        return "string";
    }
    if (value.IsBoolean()) {
        return "boolean";
    }
    if (value.IsUndefined()) {
        return "undefined";
    }
    if (value.IsObject()) {
        return "object";
    }
    return "unknown";
}

template <>
inline bool node::Value::is_array(Napi::Env env, const Napi::Value& value)
{
    return value.IsArray();
}

template <>
inline bool node::Value::is_array_buffer(Napi::Env env, const Napi::Value& value)
{
    return value.IsArrayBuffer();
}

template <>
inline bool node::Value::is_array_buffer_view(Napi::Env env, const Napi::Value& value)
{
    return value.IsTypedArray() || value.IsDataView();
}

template <>
inline bool node::Value::is_date(Napi::Env env, const Napi::Value& value)
{
    if (value.IsEmpty()) {
        return false;
    }

    bool is_date;
    napi_status status = napi_is_date(env, value, &is_date);
    NAPI_THROW_IF_FAILED(env, status, false);
    return is_date;
}

template <>
inline bool node::Value::is_boolean(Napi::Env env, const Napi::Value& value)
{
    return value.IsBoolean();
}

template <>
inline bool node::Value::is_constructor(Napi::Env env, const Napi::Value& value)
{
    return value.IsFunction();
}


template <>
inline bool node::Value::is_error(Napi::Env env, const Napi::Value& value)
{
    return value.IsObject() && value.As<Napi::Object>().InstanceOf(env.Global().Get("Error").As<Napi::Function>());
}

template <>
inline bool node::Value::is_function(Napi::Env env, const Napi::Value& value)
{
    return value.IsFunction();
}

template <>
inline bool node::Value::is_null(Napi::Env env, const Napi::Value& value)
{
    return value.IsNull();
}

template <>
inline bool node::Value::is_number(Napi::Env env, const Napi::Value& value)
{
    return value.IsNumber();
}

inline bool is_bson_type(Napi::Env env, const Napi::Value& value, std::string type)
{
    if (value.IsNull() || value.IsUndefined() || !value.IsObject()) {
        return false;
    }

    Napi::Object object = value.As<Napi::Object>();
    Napi::Value bsonType = object.Get("_bsontype");
    if (bsonType.IsUndefined()) {
        return false;
    }

    return bsonType.StrictEquals(Napi::String::New(env, type));
}

template <>
inline bool node::Value::is_decimal128(Napi::Env env, const Napi::Value& value)
{
    return is_bson_type(env, value, "Decimal128");
}

template <>
inline bool node::Value::is_object_id(Napi::Env env, const Napi::Value& value)
{
    return is_bson_type(env, value, "ObjectID");
}

template <>
inline bool node::Value::is_uuid(Napi::Env env, const Napi::Value& value)
{
    return is_bson_type(env, value, "UUID");
}

template <>
inline bool node::Value::is_object(Napi::Env env, const Napi::Value& value)
{
    return value.IsObject();
}

template <>
inline bool node::Value::is_string(Napi::Env env, const Napi::Value& value)
{
    return value.IsString();
}

template <>
inline bool node::Value::is_undefined(Napi::Env env, const Napi::Value& value)
{
    return value.IsUndefined();
}

template <>
inline bool node::Value::is_binary(Napi::Env env, const Napi::Value& value)
{
    return Value::is_array_buffer(env, value) || Value::is_array_buffer_view(env, value);
}

template <>
inline bool node::Value::is_valid(const Napi::Value& value)
{
    return !value.IsEmpty();
}

template <>
inline Napi::Value node::Value::from_boolean(Napi::Env env, bool boolean)
{
    return Napi::Boolean::New(env, boolean);
}


template <>
inline Napi::Value node::Value::from_null(Napi::Env env)
{
    return Napi::Value(env, env.Null());
}

template <>
inline Napi::Value node::Value::from_number(Napi::Env env, double number)
{
    return Napi::Number::New(env, number);
}

template <>
inline Napi::Value node::Value::from_nonnull_string(Napi::Env env, const node::String& string)
{
    return Napi::String::New(env, string);
}

template <>
inline Napi::Value node::Value::from_nonnull_binary(Napi::Env env, BinaryData data)
{
    Napi::EscapableHandleScope scope(env);

    Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, data.size());

    if (data.size()) {
        memcpy(buffer.Data(), data.data(), data.size());
    }

    return scope.Escape(buffer);
}

template <>
inline Napi::Value node::Value::from_undefined(Napi::Env env)
{
    return Napi::Value(env, env.Undefined());
}

template <>
inline bool node::Value::to_boolean(Napi::Env env, const Napi::Value& value)
{
    return value.ToBoolean();
}

template <>
inline node::String node::Value::to_string(Napi::Env env, const Napi::Value& value)
{
    return value.ToString();
}

template <>
inline double node::Value::to_number(Napi::Env env, const Napi::Value& value)
{
    double number = value.ToNumber();
    if (std::isnan(number)) {
        throw std::invalid_argument(
            util::format("Value '%1' not convertible to a number.", (std::string)to_string(env, value)));
    }

    return number;
}

template <>
inline OwnedBinaryData node::Value::to_binary_impl(Napi::Env env, const Napi::Value& value)
{
    if (value.IsDataView()) {
        auto buf = value.As<Napi::DataView>();
        return OwnedBinaryData(reinterpret_cast<const char*>(buf.Data()), buf.ByteLength());
    }
    else if (value.IsTypedArray()) {
        auto view = value.As<Napi::TypedArray>();
        auto buf = view.ArrayBuffer();
        return OwnedBinaryData(reinterpret_cast<const char*>(buf.Data()) + view.ByteOffset(), view.ByteLength());
    }
    else if (value.IsArrayBuffer()) {
        auto buf = value.As<Napi::ArrayBuffer>();
        return OwnedBinaryData(reinterpret_cast<const char*>(buf.Data()), buf.ByteLength());
    }

    throw std::runtime_error("Can only convert Buffer, ArrayBuffer, and ArrayBufferView objects to binary");
}


template <>
inline Napi::Object node::Value::to_object(Napi::Env env, const Napi::Value& value)
{
    return value.ToObject();
}

template <>
inline Napi::Object node::Value::to_array(Napi::Env env, const Napi::Value& value)
{
    return to_object(env, value);
}

template <>
inline Napi::Function node::Value::to_function(Napi::Env env, const Napi::Value& value)
{
    return value.IsFunction() ? value.As<Napi::Function>() : Napi::Function();
}

template <>
inline Napi::Function node::Value::to_constructor(Napi::Env env, const Napi::Value& value)
{
    return to_function(env, value);
}

template <>
inline Napi::Object node::Value::to_date(Napi::Env env, const Napi::Value& value)
{
    if (value.IsString()) {
        Napi::Function date_constructor = to_constructor(env, env.Global().Get("Date"));
        std::array<Napi::Value, 1> args{{value}};
        return node::Function::construct(env, date_constructor, args.size(), args.data());
    }

    return to_object(env, value);
}

template <>
inline Napi::Value node::Value::from_decimal128(Napi::Env env, const Decimal128& number)
{
    Napi::EscapableHandleScope scope(env);

    if (number.is_null()) {
        return scope.Escape(Napi::Value(env, env.Null()));
    }

    Napi::Function realm_constructor = node::RealmClassConstructor.Value();
    Napi::Object decimal_constructor = realm_constructor.Get("_Decimal128").As<Napi::Object>();
    Napi::Function fromStringFunc = decimal_constructor.Get("fromString").As<Napi::Function>();
    Napi::String numberAsString = Napi::String::New(env, number.to_string());
    Napi::Value result = fromStringFunc.Call({numberAsString});

    return scope.Escape(result);
}

template <>
inline Decimal128 node::Value::to_decimal128(Napi::Env env, const Napi::Value& value)
{
    Napi::HandleScope scope(env);

    Napi::Object decimal128 = value.As<Napi::Object>();
    Napi::Function toStringFunc = decimal128.Get("toString").As<Napi::Function>();
    node::String string = toStringFunc.Call(value, {}).As<Napi::String>();
    std::string decimal128AsString = string;
    Decimal128 result(decimal128AsString);
    return result;
}

template <>
inline Napi::Value node::Value::from_object_id(Napi::Env env, const ObjectId& objectId)
{
    Napi::EscapableHandleScope scope(env);

    Napi::Function realm_constructor = node::RealmClassConstructor.Value();
    Napi::Function object_id_constructor = realm_constructor.Get("_ObjectId").As<Napi::Function>();
    napi_value args[] = {Napi::String::New(env, objectId.to_string())};
    Napi::Value result = object_id_constructor.New(1, args);
    return scope.Escape(result);
}

template <>
inline ObjectId node::Value::to_object_id(Napi::Env env, const Napi::Value& value)
{
    Napi::HandleScope scope(env);

    Napi::Object objectId = value.As<Napi::Object>();
    Napi::Function toHexStringFunc = objectId.Get("toHexString").As<Napi::Function>();
    node::String string = toHexStringFunc.Call(value, {}).As<Napi::String>();
    std::string objectIdAsString = string;
    ObjectId result(objectIdAsString.c_str());
    return result;
}

template <>
Napi::Value node::Value::from_uuid(Napi::Env env, const UUID& uuid)
{
    Napi::EscapableHandleScope scope(env);

    Napi::Function realm_constructor = node::RealmClassConstructor.Value();
    Napi::Function uuid_constructor = realm_constructor.Get("_UUID").As<Napi::Function>();

    napi_value args[] = {Napi::Buffer<std::uint8_t>::Copy(env, uuid.to_bytes().data(), UUID::num_bytes)};
    Napi::Value result = uuid_constructor.New(1, args);

    return scope.Escape(result);
}

template <>
inline UUID node::Value::to_uuid(Napi::Env env, const Napi::Value& value)
{
    Napi::HandleScope scope(env);

    Napi::Object uuid = value.As<Napi::Object>();
    // TODO: Temp implementation of JS UUID has a buffer on the "id" key. This is corresponding to the official
    // ObjectId implementation - BUT could change.
    auto buffer = uuid.Get("id").As<Napi::Buffer<std::uint8_t>>();
    UUID::UUIDBytes bytes;
    memcpy(&bytes, buffer.Data(), UUID::num_bytes);

    UUID result(bytes);
    return result;
}

} // namespace js
} // namespace realm
