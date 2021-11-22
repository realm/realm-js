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
#include <iostream>
#include <map>

#include "js_types.hpp"
#include "types.hpp"


namespace realm {
namespace js {

class GenericTypeDeductionImpl {
private:
    std::map<types::Type, std::string> realm_to_js_map;
    std::map<std::string, types::Type> js_to_realm_map;

    auto reverse_deduction_types_map()
    {
        std::map<std::string, types::Type> ret;
        for (auto& [type, key] : realm_to_js_map) {
            ret[key] = type; // camel_case version.
            std::string lower_case_key;
            // in-place lower case, we want to support multiple variation of the
            // types written names.
            std::transform(key.begin(), key.end(), key.begin(), [](unsigned char chr) {
                return std::tolower(chr);
            });
            ret[key] = type;
        }
        return ret;
    }

public:
    GenericTypeDeductionImpl()
    {
        realm_to_js_map = {{types::String, "String"},     {types::Integer, "Int"},         {types::Float, "Float"},
                           {types::Double, "Double"},     {types::Decimal, "Decimal128"},  {types::Boolean, "Bool"},
                           {types::ObjectId, "ObjectId"}, {types::Object, "Object"},       {types::UUID, "UUID"},
                           {types::Object, "Object"},     {types::Undefined, "Undefined"}, {types::Null, "Null"}};
        js_to_realm_map = reverse_deduction_types_map();
    }

    static GenericTypeDeductionImpl& get_instance()
    {
        static GenericTypeDeductionImpl instance;
        return instance;
    }

    bool realm_type_exist(std::string const& type)
    {
        return js_to_realm_map.find(type) != js_to_realm_map.end();
    }

    types::Type realm_type(std::string const& type)
    {
        return js_to_realm_map[type];
    }

    std::string javascript_type(types::Type value)
    {
        return realm_to_js_map[value];
    }

    template <typename MixedValue>
    types::Type from(MixedValue mixed)
    {
        if (mixed.is_null())
            return types::Type::Null;

        int realm_type = static_cast<int>(mixed.get_type());
        return static_cast<types::Type>(realm_type);
    }

    types::Type from(DataType data_type)
    {
        int realm_type = static_cast<int>(data_type);
        return static_cast<types::Type>(realm_type);
    }

    template <typename T, typename Ctx, typename Val>
    types::Type typeof(Ctx context, Val& value)
    {
        using Value = js::Value<T>;

        if (Value::is_null(context, value)) {
            return types::Null;
        }
        if (Value::is_number(context, value)) {
            return types::Double;
        }
        if (Value::is_string(context, value)) {
            return types::String;
        }
        if (Value::is_boolean(context, value)) {
            return types::Boolean;
        }
        if (Value::is_date(context, value)) {
            return types::Timestamp;
        }
        if (Value::is_undefined(context, value)) {
            return types::Undefined;
        }
        if (Value::is_array_buffer(context, value) || Value::is_array_buffer(context, value)) {
            return types::Binary;
        }
        if (Value::is_decimal128(context, value)) {
            return types::Decimal;
        }
        if (Value::is_object_id(context, value)) {
            return types::ObjectId;
        }
        if (Value::is_uuid(context, value)) {
            return types::UUID;
        }
        if (Value::is_object(context, value)) {
            return types::Object;
        }

        return types::NotImplemented;
    }
};

/*
 * Here we encapsulate some type deduction capabilities for all supported
 * Javascript environments.
 */
struct TypeDeduction : GenericTypeDeductionImpl {
};

} // namespace js
} // namespace realm
