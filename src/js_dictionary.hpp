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

#ifndef REALMJS_JS_DICTIONARY_HPP
#define REALMJS_JS_DICTIONARY_HPP

#pragma once

#include <map>
#include <regex>

#include "realm/object-store/property.hpp"

namespace realm {
namespace js {

class DictionarySchema {
private:
    const std::string DICT_SCHEMA = R"((\w+)?(\{\}))";

    std::string type;
    std::smatch matches;
    bool valid_schema;
public:
    std::map<std::string, realm::PropertyType> schema_properties = {
        {"string", realm::PropertyType::String}, {"int", realm::PropertyType::Int}};

    DictionarySchema(std::string _schema) {
        std::regex dict_schm_regex{DICT_SCHEMA, std::regex_constants::ECMAScript};
        valid_schema = std::regex_search(_schema, matches, dict_schm_regex);
        if (valid_schema) {
            type = matches[1];
        }
    }

    realm::PropertyType get_schemaless() {
        return realm::PropertyType::Dictionary | realm::PropertyType::Mixed;
    }

    realm::PropertyType schema_definition() {
        if (type.empty()) {
            return get_schemaless();
        }

        if (schema_properties.find(type) == schema_properties.end()) {
            throw("Type: " + type + " not supported for Dictionary.");
        }

        auto dictionary_type_value = schema_properties[type];
        return (realm::PropertyType::Dictionary | dictionary_type_value);
    }

    bool is_dictionary() { return valid_schema; }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
