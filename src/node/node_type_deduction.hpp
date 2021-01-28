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
#include <common/types.hpp>

#include "napi.h"
#include "realm/data_type.hpp"

namespace realm {
namespace js {

struct TypeDeductionImpl {
    using Value = const Napi::Value;
    static bool is_bson_type(Value& value, std::string type) {
        if (!value.IsObject()) {
            return false;
        }

        auto object = value.As<Napi::Object>();

        if (object.Has("_bsontype")) {
            auto bsonType = object.Get("_bsontype");
            return bsonType.ToString().Utf8Value() == type;
        }

        return false;
    }
    static bool is_decimal128(Value& value) {
        return TypeDeductionImpl::is_bson_type(value, "Decimal128");
    }

    static bool is_object_id(Value& value) {
        return TypeDeductionImpl::is_bson_type(value, "ObjectID");
    }

    static std::string to_javascript(types::Type value) {
        std::map<types::Type, std::string> realm_typeof = {
            {types::String, "String"},      {types::Integer, "Int"},
            {types::Float, "Float"},        {types::Double, "Double"},
            {types::Decimal, "Decimal128"}, {types::Boolean, "Boolean"},
            {types::ObjectId, "ObjectId"},  {types::Object, "Object"},
            {types::Link, "Link"}};
        return realm_typeof[value];
    }

    static types::Type typeof(DataType data_type) {
        int realm_type = static_cast<int>(data_type);
        return static_cast<types::Type>(realm_type);
    }

    static types::Type typeof(Value& value) {
        if (value.IsNull()) {
            return types::Null;
        }
        if (value.IsNumber()) {
            return types::Double;
        }
        if (value.IsString()) {
            return types::String;
        }
        if (value.IsBoolean()) {
            return types::Boolean;
        }
        if (value.IsDate()) {
            return types::Timestamp;
        }
        if (value.IsUndefined()) {
            return types::Undefined;
        }
        if (value.IsArrayBuffer() || value.IsTypedArray() ||
            value.IsDataView()) {
            return types::Binary;
        }
        if (TypeDeductionImpl::is_decimal128(value)) {
            return types::Decimal;
        }
        if (TypeDeductionImpl::is_object_id(value)) {
            return types::ObjectId;
        }
        if (value.IsObject()) {
            return types::Object;
        }

        return types::NotImplemented;
    }

    static bool is_boolean(Value& value) { return value.IsBoolean(); }

    static bool is_null(Value& value) { return value.IsNull(); }

    static bool is_number(Value& value) { return value.IsNumber(); }

    static bool is_string(Value& value) { return value.IsString(); }

    static bool is_undefined(Value& value) { return value.IsUndefined(); }
};

}  // namespace js
}  // namespace realm
