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
#include "napi.h"
#include "realm/data_type.hpp"

namespace realm {
namespace js {

struct TypeDeductionImpl {
    using Value = const Napi::Value;
    static bool is_bson_type(Value &value, std::string type) {
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
    static bool is_decimal128(Value &value) {
        return TypeDeductionImpl::is_bson_type(value, "Decimal128");
    }

    static bool is_object_id(Value &value) {
        return TypeDeductionImpl::is_bson_type(value, "ObjectID");
    }

    static std::string realm_typeof(DataType value) {
        std::map<DataType, std::string> realm_typeof = {
            {type_String, "string"},      {type_Int, "Int"},
            {type_Float, "Float"},        {type_Double, "Double"},
            {type_Decimal, "Decimal128"}, {type_Bool, "Boolean"},
            {type_ObjectId, "ObjectId"}};
        return realm_typeof[value];
    }

    static DataType typeof(Value &value) {
        if (value.IsNull()) {
            return type_TypedLink;
        }
        if (value.IsNumber()) {
            return type_Double;
        }
        if (value.IsString()) {
            return type_String;
        }
        if (value.IsBoolean()) {
            return type_Bool;
        }
        if (value.IsDate()) {
            return type_Timestamp;
        }
        if (value.IsUndefined()) {
            return type_TypedLink;
        }
        if (value.IsArrayBuffer() || value.IsTypedArray() ||
            value.IsDataView()) {
            return type_Binary;
        }
        if (TypeDeductionImpl::is_decimal128(value)) {
            return type_Decimal;
        }
        if (TypeDeductionImpl::is_object_id(value)) {
            return type_ObjectId;
        }
        if (value.IsObject()) {
            return type_Link;
        }

        return type_Link;
    }

    static bool is_boolean(Value &value) { return value.IsBoolean(); }

    static bool is_null(Value &value) { return value.IsNull(); }

    static bool is_number(Value &value) { return value.IsNumber(); }

    static bool is_string(Value &value) { return value.IsString(); }

    static bool is_undefined(Value &value) { return value.IsUndefined(); }
};

}  // namespace js
}  // namespace realm
