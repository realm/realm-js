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

#include <regex>

#include "common/type_deduction.hpp"

namespace realm {
namespace js {
class DictionarySchema {
   private:
    const std::string DICT_SCHEMA = R"((\w+)?(\{\}))";

    std::string type;
    std::smatch matches;
    bool valid_schema;

   public:
    DictionarySchema(std::string _schema) {
        std::regex dict_schema_regex{DICT_SCHEMA,
                                     std::regex_constants::ECMAScript};
        valid_schema = std::regex_search(_schema, matches, dict_schema_regex);
        if (valid_schema) {
            type = matches[1];
        }
    }

    realm::PropertyType make_generic() {
        return realm::PropertyType::Dictionary | realm::PropertyType::Mixed;
    }

    realm::PropertyType schema() {
        auto type_deduction = TypeDeduction::get_instance();
        if (type.empty()) {
            return make_generic();
        }

        if (!type_deduction.realm_type_exist(type)) {
            throw std::runtime_error("Schema type: " + type +
                                     " not supported for Dictionary.");
        }

        auto dictionary_type_value = type_deduction.realm_type(type);
        return (realm::PropertyType::Dictionary |
                static_cast<realm::PropertyType>(dictionary_type_value));
    }

    bool is_dictionary() { return valid_schema; }
};
}  // namespace js
}  // namespace realm

