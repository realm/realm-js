////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#ifndef REALM_PROPERTY_HPP
#define REALM_PROPERTY_HPP

#include <string>

namespace realm {
    enum PropertyType {
        PropertyTypeInt    = 0,
        PropertyTypeBool   = 1,
        PropertyTypeFloat  = 9,
        PropertyTypeDouble = 10,
        PropertyTypeString = 2,
        PropertyTypeData   = 4,
        PropertyTypeAny    = 6, // deprecated and will be removed in the future
        PropertyTypeDate   = 8,
        PropertyTypeObject = 12,
        PropertyTypeArray  = 13,
    };

    struct Property {
        std::string name;
        PropertyType type;
        std::string object_type;
        bool is_primary = false;
        bool is_indexed = false;
        bool is_nullable = false;

        size_t table_column = -1;
        bool requires_index() const { return is_primary || is_indexed; }
        bool is_indexable() const
        {
            return type == PropertyTypeInt
                || type == PropertyTypeBool
                || type == PropertyTypeDate
                || type == PropertyTypeString;
        }
    };

    static inline const char *string_for_property_type(PropertyType type) {
        switch (type) {
            case PropertyTypeString:
                return "string";
            case PropertyTypeInt:
                return "int";
            case PropertyTypeBool:
                return "bool";
            case PropertyTypeDate:
                return "date";
            case PropertyTypeData:
                return "data";
            case PropertyTypeDouble:
                return "double";
            case PropertyTypeFloat:
                return "float";
            case PropertyTypeAny:
                return "any";
            case PropertyTypeObject:
                return "object";
            case PropertyTypeArray:
                return "array";
        }
    }
}

#endif /* REALM_PROPERTY_HPP */
