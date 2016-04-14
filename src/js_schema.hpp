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

#include <map>

#include "js_types.hpp"
#include "schema.hpp"

namespace realm {
namespace js {

template<typename T>
struct Schema {
    using TContext = typename T::Context;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;
    using String = String<T>;
    using Object = Object<T>;
    using Value = Value<T>;

    using ObjectDefaults = std::map<std::string, Protected<TValue>>;
    using ObjectDefaultsMap = std::map<std::string, ObjectDefaults>;
    using ConstructorMap = std::map<std::string, Protected<TFunction>>;

    static TObject dict_for_property_array(TContext, const ObjectSchema &, TObject);
    static Property parse_property(TContext, TValue, std::string, ObjectDefaults &);
    static ObjectSchema parse_object_schema(TContext, TObject, ObjectDefaultsMap &, ConstructorMap &);
    static realm::Schema parse_schema(TContext, TObject, ObjectDefaultsMap &, ConstructorMap &);
};

template<typename T>
typename T::Object Schema<T>::dict_for_property_array(TContext ctx, const ObjectSchema &object_schema, TObject array) {
    size_t count = object_schema.properties.size();
    
    if (count != Object::validated_get_length(ctx, array)) {
        throw std::runtime_error("Array must contain values for all object properties");
    }

    TObject dict = Object::create_empty(ctx);

    for (uint32_t i = 0; i < count; i++) {
        TValue value = Object::get_property(ctx, array, i);
        Object::set_property(ctx, dict, object_schema.properties[i].name, value);
    }

    return dict;
}

template<typename T>
Property Schema<T>::parse_property(TContext ctx, TValue attributes, std::string propertyName, ObjectDefaults &objectDefaults) {
    static const String defaultString = "default";
    static const String indexedString = "indexed";
    static const String typeString = "type";
    static const String objectTypeString = "objectType";
    static const String optionalString = "optional";
    
    Property prop;
    prop.name = propertyName;
    
    TObject propertyObject = {};
    std::string type;
    
    if (Value::is_object(ctx, attributes)) {
        propertyObject = Value::validated_to_object(ctx, attributes);
        type = Object::validated_get_string(ctx, propertyObject, typeString);
        
        TValue optionalValue = Object::get_property(ctx, propertyObject, optionalString);
        if (!Value::is_undefined(ctx, optionalValue)) {
            prop.is_nullable = Value::validated_to_boolean(ctx, optionalValue, "optional");
        }
    }
    else {
        type = Value::validated_to_string(ctx, attributes);
    }
    
    if (type == "bool") {
        prop.type = PropertyTypeBool;
    }
    else if (type == "int") {
        prop.type = PropertyTypeInt;
    }
    else if (type == "float") {
        prop.type = PropertyTypeFloat;
    }
    else if (type == "double") {
        prop.type = PropertyTypeDouble;
    }
    else if (type == "string") {
        prop.type = PropertyTypeString;
    }
    else if (type == "date") {
        prop.type = PropertyTypeDate;
    }
    else if (type == "data") {
        prop.type = PropertyTypeData;
    }
    else if (type == "list") {
        if (!Value::is_valid(propertyObject)) {
            throw std::runtime_error("List property must specify 'objectType'");
        }
        prop.type = PropertyTypeArray;
        prop.object_type = Object::validated_get_string(ctx, propertyObject, objectTypeString);
    }
    else {
        prop.type = PropertyTypeObject;
        prop.is_nullable = true;
        
        // The type could either be 'object' or the name of another object type in the same schema.
        if (type == "object") {
            if (!Value::is_valid(propertyObject)) {
                throw std::runtime_error("Object property must specify 'objectType'");
            }
            prop.object_type = Object::validated_get_string(ctx, propertyObject, objectTypeString);
        }
        else {
            prop.object_type = type;
        }
    }
    
    if (Value::is_valid(propertyObject)) {
        TValue defaultValue = Object::get_property(ctx, propertyObject, defaultString);
        if (!Value::is_undefined(ctx, defaultValue)) {
            objectDefaults.emplace(prop.name, Protected<TValue>(ctx, defaultValue));
        }
        
        TValue indexedValue = Object::get_property(ctx, propertyObject, indexedString);
        if (!Value::is_undefined(ctx, indexedValue)) {
            prop.is_indexed = Value::validated_to_boolean(ctx, indexedValue);
        }
    }
    
    return prop;
}

template<typename T>
ObjectSchema Schema<T>::parse_object_schema(TContext ctx, TObject objectSchemaObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    static const String nameString = "name";
    static const String primaryString = "primaryKey";
    static const String propertiesString = "properties";
    static const String schemaString = "schema";
    
    TFunction objectConstructor = {};
    if (Value::is_constructor(ctx, objectSchemaObject)) {
        objectConstructor = Value::to_constructor(ctx, objectSchemaObject);
        objectSchemaObject = Object::validated_get_object(ctx, objectConstructor, schemaString, "Realm object constructor must have a 'schema' property.");
    }
    
    ObjectDefaults objectDefaults;
    ObjectSchema objectSchema;
    objectSchema.name = Object::validated_get_string(ctx, objectSchemaObject, nameString);
    
    TObject propertiesObject = Object::validated_get_object(ctx, objectSchemaObject, propertiesString, "ObjectSchema must have a 'properties' object.");
    if (Value::is_array(ctx, propertiesObject)) {
        uint32_t length = Object::validated_get_length(ctx, propertiesObject);
        for (uint32_t i = 0; i < length; i++) {
            TObject propertyObject = Object::validated_get_object(ctx, propertiesObject, i);
            std::string propertyName = Object::validated_get_string(ctx, propertyObject, nameString);
            objectSchema.properties.emplace_back(parse_property(ctx, propertyObject, propertyName, objectDefaults));
        }
    }
    else {
        auto propertyNames = Object::get_property_names(ctx, propertiesObject);
        for (auto &propertyName : propertyNames) {
            TValue propertyValue = Object::get_property(ctx, propertiesObject, propertyName);
            objectSchema.properties.emplace_back(parse_property(ctx, propertyValue, propertyName, objectDefaults));
        }
    }

    TValue primaryValue = Object::get_property(ctx, objectSchemaObject, primaryString);
    if (!Value::is_undefined(ctx, primaryValue)) {
        objectSchema.primary_key = Value::validated_to_string(ctx, primaryValue);
        Property *property = objectSchema.primary_key_property();
        if (!property) {
            throw std::runtime_error("Missing primary key property '" + objectSchema.primary_key + "'");
        }
        property->is_primary = true;
    }
    
    // Store prototype so that objects of this type will have their prototype set to this prototype object.
    if (Value::is_valid(objectConstructor)) {
        constructors.emplace(objectSchema.name, Protected<TFunction>(ctx, objectConstructor));
    }
    
    defaults.emplace(objectSchema.name, std::move(objectDefaults));
    
    return objectSchema;
}
    
template<typename T>
realm::Schema Schema<T>::parse_schema(TContext ctx, TObject jsonObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    std::vector<ObjectSchema> schema;
    uint32_t length = Object::validated_get_length(ctx, jsonObject);

    for (uint32_t i = 0; i < length; i++) {
        TObject jsonObjectSchema = Object::validated_get_object(ctx, jsonObject, i);
        ObjectSchema objectSchema = parse_object_schema(ctx, jsonObjectSchema, defaults, constructors);
        schema.emplace_back(std::move(objectSchema));
    }

    return realm::Schema(schema);
}

} // js
} // realm
