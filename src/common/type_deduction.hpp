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
#include "types.hpp"
#pragma once


namespace realm {
namespace js {


class GenericTypeDeductionImpl {
   private:
    static std::map<types::Type, std::string> realm_types;

    static auto reverse_deduction_types_map() {
        std::map<std::string, types::Type> ret;
        for (auto& [type, key] : realm_types) {
            ret[key] = type; //camelCase version.
            std::transform(key.begin(), key.end(), key.begin(),
                           [](auto c) { return std::tolower(c); });
            ret[key] = type; //lower_case version.
        }
        return ret;
    }

   public:
    static bool realm_type_exist(std::string const& type) {
        static auto realm_types = reverse_deduction_types_map();
        return realm_types.find(type) == realm_types.end();
    }

    static types::Type realm_type(std::string const& type) {
        static auto realm_types = reverse_deduction_types_map();
        return realm_types[type];
    }

    static std::string javascript_type(types::Type value) {
        return realm_types[value];
    }

    static types::Type from(DataType data_type) {
        int realm_type = static_cast<int>(data_type);
        return static_cast<types::Type>(realm_type);
    }

    template <typename T, typename Ctx, typename Val>
    static types::Type typeof(Ctx context, Val& value) {
        using JS = js::Value<T>;

        if (JS::is_null(context, value)) {
            return types::Null;
        }
        if (JS::is_number(context, value)) {
            return types::Double;
        }
        if (JS::is_string(context, value)) {
            return types::String;
        }
        if (JS::is_boolean(context, value)) {
            return types::Boolean;
        }
        if (JS::is_date(context, value)) {
            return types::Timestamp;
        }
        if (JS::is_undefined(context, value)) {
            return types::Undefined;
        }
        if (JS::is_array_buffer(context, value) || JS::is_array_buffer(context,value)) {
            return types::Binary;
        }
        if (JS::is_decimal128(context, value)) {
            return types::Decimal;
        }
        if (JS::is_object_id(context, value)) {
            return types::ObjectId;
        }
        if (JS::is_object(context, value)) {
            return types::Object;
        }

        return types::NotImplemented;
    }
};

std::map<types::Type, std::string> GenericTypeDeductionImpl::realm_types = {
    {types::String, "String"},       {types::Integer, "Int"},
    {types::Float, "Float"},         {types::Double, "Double"},
    {types::Decimal, "Decimal128"},  {types::Boolean, "Boolean"},
    {types::ObjectId, "ObjectId"},   {types::Object, "Object"},
    {types::Undefined, "Undefined"}, {types::Null, "Null"}};

/*
 * Here we encapsulate some type deduction capabilities for all supported
 * Javascript environments.
 */
    struct TypeDeduction : GenericTypeDeductionImpl {};

}  // namespace js
}  // namespace realm
