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

#include "hermes_string.hpp"
#include "hermes_types.hpp"
//#include "node_buffer.hpp"

namespace realm {
namespace js {

template <>
inline const char *hermes::Value::typeof(JsiEnv env, const JsiVal &value) {
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
inline bool hermes::Value::is_array(JsiEnv env, const JsiVal &value) {
  return value->isObject() && value->getObject(env).isArray(env);
}

template <>
inline bool hermes::Value::is_array_buffer(JsiEnv env, const JsiVal &value) {
  return value->isObject() && value->getObject(env).isArrayBuffer(env);
}

template <>
inline bool hermes::Value::is_array_buffer_view(JsiEnv env,
                                                const JsiVal &value) {
  auto arrayBuffer = globalType(env, "arrayBuffer");
  return arrayBuffer.getPropertyAsFunction(env, "isView")
      .call(env, value)
      .getBool();
}

template <>
inline bool hermes::Value::is_date(JsiEnv env, const JsiVal &value) {
  return value->isObject() &&
         value->getObject(env).instanceOf(
             env, env->global().getPropertyAsFunction(env, "Date"));
}

template <>
inline bool hermes::Value::is_boolean(JsiEnv env, const JsiVal &value) {
  return value->isBool();
}

template <>
inline bool hermes::Value::is_constructor(JsiEnv env, const JsiVal &value) {
  return value->isObject() && value->getObject(env).isFunction(env);
}

template <>
inline bool hermes::Value::is_error(JsiEnv env, const JsiVal &value) {
  return value->isObject() &&
         value->getObject(env).instanceOf(
             env, env->global().getPropertyAsFunction(env, "Error"));
}

template <>
inline bool hermes::Value::is_function(JsiEnv env, const JsiVal &value) {
  return value->isObject() && value->getObject(env).isFunction(env);
}

template <>
inline bool hermes::Value::is_null(JsiEnv env, const JsiVal &value) {
  return value->isNull();
}

template <>
inline bool hermes::Value::is_number(JsiEnv env, const JsiVal &value) {
  return value->isNumber();
}

inline bool is_bson_type(JsiEnv env, const JsiVal &value, std::string type) {
  if (value->isNull() || value->isUndefined() || !value->isObject()) {
    return false;
  }

  auto bsonType = value->getObject(env).getProperty(env, "_bsontype");
  if (bsonType.isUndefined()) {
    return false;
  }

  return jsi::Value::strictEquals(env, bsonType, JsiVal(str(env, type)));
}

template <>
inline bool hermes::Value::is_decimal128(JsiEnv env, const JsiVal &value) {
  return is_bson_type(env, value, "Decimal128");
}

template <>
inline bool hermes::Value::is_object_id(JsiEnv env, const JsiVal &value) {
  return is_bson_type(env, value, "ObjectID");
}

template <>
inline bool hermes::Value::is_object(JsiEnv env, const JsiVal &value) {
  return value->isObject();
}

template <>
inline bool hermes::Value::is_string(JsiEnv env, const JsiVal &value) {
  return value->isString();
}

template <>
inline bool hermes::Value::is_undefined(JsiEnv env, const JsiVal &value) {
  return value->isUndefined();
}

template <>
inline bool hermes::Value::is_binary(JsiEnv env, const JsiVal &value) {
  return Value::is_array_buffer(env, value) ||
         Value::is_array_buffer_view(env, value);
}

template <>
inline bool hermes::Value::is_valid(const JsiVal &value) {
  return true; // XXX
}

template<>
inline bool hermes::Value::is_uuid(JsiEnv env, const JsiVal &value) {
  return is_bson_type(env, value, "UUID");
}

template <>
inline JsiVal hermes::Value::from_boolean(JsiEnv env, bool boolean) {
  return JsiVal(env, boolean);
}

template <> inline JsiVal hermes::Value::from_null(JsiEnv env) {
  return env.null();
}

template <>
inline JsiVal hermes::Value::from_number(JsiEnv env, double number) {
  return JsiVal(env, number);
}

template <>
inline JsiVal hermes::Value::from_nonnull_string(JsiEnv env,
                                                 const hermes::String &string) {
  return str(env, StringData(string));
}

template <>
inline JsiVal hermes::Value::from_nonnull_binary(JsiEnv env, BinaryData data) {
  jsi::ArrayBuffer buffer = globalType(env, "ArrayBuffer")
                                .callAsConstructor(env, double(data.size()))
                                .getObject(env)
                                .getArrayBuffer(env);

  if (data.size()) {
    memcpy(buffer.data(env), data.data(), data.size());
  }

  return env(std::move(buffer));
}

template <> inline JsiVal hermes::Value::from_undefined(JsiEnv env) {
  return env.undefined();
}

template <>
inline JsiVal hermes::Value::from_uuid(JsiEnv env, const UUID& uuid) {
  return env(globalType(env, "Realm")
                 .getPropertyAsFunction(env, "_UUID")
                 .callAsConstructor(env, str(env, uuid.to_string())));
}

template <>
inline bool hermes::Value::to_boolean(JsiEnv env, const JsiVal &value) {
  return value->getBool(); // XXX should do conversion.
}

template <>
inline hermes::String hermes::Value::to_string(JsiEnv env,
                                               const JsiVal &value) {
  return value->toString(env).utf8(env);
}

template <>
inline double hermes::Value::to_number(JsiEnv env, const JsiVal &value) {
  double number = value->asNumber(); // XXX should do conversion
  if (std::isnan(number)) {
    throw std::invalid_argument(
        util::format("Value '%1' not convertible to a number.",
                     (std::string)to_string(env, value)));
  }

  return number;
}

template <>
inline OwnedBinaryData hermes::Value::to_binary(JsiEnv env,
                                                const JsiVal &value) {
  auto obj = value->asObject(env);
  if (obj.isArrayBuffer(env)) {
    auto buf = std::move(obj).getArrayBuffer(env);
    return OwnedBinaryData(reinterpret_cast<const char *>(buf.data(env)),
                           buf.length(env));
  }

  if (is_array_buffer_view(env, value)) {
    // XXX TODO
    throw std::runtime_error("Can only convert ArrayBuffer objects to binary");
  }

  throw std::runtime_error(
      "Can only convert ArrayBuffer and ArrayBufferView objects to binary");
}

template <>
inline JsiObj hermes::Value::to_object(JsiEnv env, const JsiVal &value) {
  return env(value->asObject(env)); // XXX convert?
}

template <>
inline JsiObj hermes::Value::to_array(JsiEnv env, const JsiVal &value) {
  return to_object(env, value);
}

template <>
inline JsiFunc hermes::Value::to_function(JsiEnv env, const JsiVal &value) {
  return env(value->asObject(env).asFunction(env));
}

template <>
inline JsiFunc hermes::Value::to_constructor(JsiEnv env, const JsiVal &value) {
  return to_function(env, value);
}

template <>
inline JsiObj hermes::Value::to_date(JsiEnv env, const JsiVal &value) {
  if (value->isString()) {
    return env(
        globalType(env, "Date").callAsConstructor(env, value).asObject(env));
  }

  return to_object(env, value);
}

template <>
inline JsiVal hermes::Value::from_decimal128(JsiEnv env,
                                             const Decimal128 &number) {
  if (number.is_null()) {
    return env(jsi::Value::null());
  }

  return env(globalType(env, "Realm")
                 .getPropertyAsObject(env, "_Decimal128")
                 .getPropertyAsFunction(env, "fromString")
                 .call(env, str(env, number.to_string())));
}

template <>
inline Decimal128 hermes::Value::to_decimal128(JsiEnv env,
                                               const JsiVal &value) {
  return Decimal128(value->toString(env).utf8(env));
}

template <>
inline JsiVal hermes::Value::from_object_id(JsiEnv env,
                                            const ObjectId &objectId) {
  return env(globalType(env, "Realm")
                 .getPropertyAsFunction(env, "_ObjectId")
                 .callAsConstructor(env, str(env, objectId.to_string())));
}

template <>
inline ObjectId hermes::Value::to_object_id(JsiEnv env, const JsiVal &value) {
  auto objectId = value->asObject(env);
  return ObjectId(objectId.getPropertyAsFunction(env, "toHexString")
                      .callWithThis(env, objectId)
                      .getString(env)
                      .utf8(env)
                      .c_str());
}

template <>
inline UUID hermes::Value::to_uuid(JsiEnv env, const JsiVal &value) {
  auto uuid = value->asObject(env);
  return UUID(uuid.getPropertyAsFunction(env, "toHexString")
                  .callWithThis(env, uuid)
                  .getString(env)
                  .utf8(env)
                  .c_str());
}

} // namespace js
} // namespace realm
