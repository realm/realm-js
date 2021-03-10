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

#include <algorithm>
#include <cctype>

#include <common/types.hpp>
#include "realm/data_type.hpp"

#include "napi.h"

namespace realm {
namespace js {

class TypeDeductionImpl {
private:
    using Value = const Napi::Value;
    static std::map<types::Type, std::string> realm_types;

    static auto reverse_deduction_types_map(){
        std::map<std::string, types::Type> ret;
        for(auto& [type, key] : realm_types ){
            ret[key] = type;
            std::transform(key.begin(), key.end(), key.begin(), [](auto c){ return std::tolower(c); });
            ret[key] = type;
        }
        return ret;
    }

public:
    static bool is_bson_type(Value& value, std::string type)
    {
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
    static bool is_decimal128(Value& value)
    {
        return TypeDeductionImpl::is_bson_type(value, "Decimal128");
    }

    static bool is_object_id(Value& value)
    {
        return TypeDeductionImpl::is_bson_type(value, "ObjectID");
    }

    static bool realm_type_exist(std::string const& type){
        static auto realm_types = reverse_deduction_types_map();
        return realm_types.find(type) == realm_types.end();
    }

    static types::Type realm_type(std::string const& type){
        static auto realm_types = reverse_deduction_types_map();
        return realm_types[type];
    }

    static std::string javascript_type(types::Type value)
    {
        return realm_types[value];
    }

    static types::Type from(DataType data_type)
    {
        int realm_type = static_cast<int>(data_type);
        return static_cast<types::Type>(realm_type);
    }

    static types::Type typeof(Value& value)
    {
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
        if (value.IsArrayBuffer() || value.IsTypedArray() || value.IsDataView()) {
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

    static bool is_boolean(Value& value)
    {
        return value.IsBoolean();
    }

    static bool is_null(Value& value)
    {
        return value.IsNull();
    }

    static bool is_number(Value& value)
    {
        return value.IsNumber();
    }

    static bool is_string(Value& value)
    {
        return value.IsString();
    }

    static bool is_undefined(Value& value)
    {
        return value.IsUndefined();
    }
};

std::map<types::Type, std::string> TypeDeductionImpl::realm_types = {
        {types::String, "String"},     {types::Integer, "Int"},        {types::Float, "Float"},
        {types::Double, "Double"},     {types::Decimal, "Decimal128"}, {types::Boolean, "Boolean"},
        {types::ObjectId, "ObjectId"}, {types::Object, "Object"},      {types::Undefined, "Undefined"},
        {types::Null, "Null"}
};


} // namespace js
} // namespace realm
