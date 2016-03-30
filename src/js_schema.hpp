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

#include "js_util.hpp"
#include "schema.hpp"
#include <map>

namespace realm {
    class Schema;
}

JSClassRef RJSSchemaClass();
JSObjectRef RJSSchemaCreate(JSContextRef ctx, realm::Schema *schema);

namespace realm {
namespace js {
    
template<typename T>
struct Schema
{
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using ReturnType = typename T::Return;
    using StringType = typename T::String;
    using ObjectDefaults = std::map<std::string, ValueType>;
    using ObjectDefaultsMap = std::map<std::string, ObjectDefaults>;
    using ConstructorMap = std::map<std::string, ObjectType>;
    
    static Property parse_property(ContextType ctx, ValueType attributes, std::string propertyame, ObjectDefaults &objectDefaults);
    static ObjectSchema parse_object_schema(ContextType ctx, ObjectType objectSchemaObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors);
    static realm::Schema parse_schema(ContextType ctx, ObjectType jsonObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors);
};
    
template<typename T>
Property Schema<T>::parse_property(ContextType ctx, ValueType attributes, std::string propertyName, ObjectDefaults &objectDefaults) {
    StringType defaultString("default");
    StringType indexedString("indexed");
    StringType typeString("type");
    StringType objectTypeString("objectType");
    StringType optionalString("optional");
    
    Property prop;
    prop.name = propertyName;
    
    JSObjectRef propertyObject = NULL;
    std::string type;
    
    if (ValueIsObject(ctx, attributes)) {
        propertyObject = RJSValidatedValueToObject(ctx, attributes);
        type = RJSValidatedStringProperty(ctx, propertyObject, typeString);
        
        ValueType optionalValue = ObjectGetProperty(ctx, propertyObject, optionalString, NULL);
        if (!ValueIsUndefined(ctx, optionalValue)) {
            prop.is_nullable = RJSValidatedValueToBoolean(ctx, optionalValue, "'optional' designation expected to be of type boolean");
        }
    }
    else {
        type = RJSValidatedStringForValue(ctx, attributes);
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
        if (!propertyObject) {
            throw std::runtime_error("List property must specify 'objectType'");
        }
        prop.type = PropertyTypeArray;
        prop.object_type =  RJSValidatedStringProperty(ctx, propertyObject, objectTypeString);
    }
    else {
        prop.type = PropertyTypeObject;
        prop.is_nullable = true;
        
        // The type could either be 'object' or the name of another object type in the same schema.
        if (type == "object") {
            if (!propertyObject) {
                throw std::runtime_error("Object property must specify 'objectType'");
            }
            prop.object_type = RJSValidatedStringProperty(ctx, propertyObject, objectTypeString);
        }
        else {
            prop.object_type = type;
        }
    }
    
    if (propertyObject) {
        ValueType defaultValue = RJSValidatedPropertyValue(ctx, propertyObject, defaultString);
        if (!ValueIsUndefined(ctx, defaultValue)) {
            ValueProtect(ctx, defaultValue);
            objectDefaults.emplace(prop.name, defaultValue);
        }
        
        ValueType indexedValue = RJSValidatedPropertyValue(ctx, propertyObject, indexedString);
        if (!ValueIsUndefined(ctx, indexedValue)) {
            prop.is_indexed = RJSValidatedValueToBoolean(ctx, indexedValue);
        }
    }
    
    return prop;
}

template<typename T>
ObjectSchema Schema<T>::parse_object_schema(ContextType ctx, ObjectType objectSchemaObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    StringType nameString("name");
    StringType primaryString("primaryKey");
    StringType propertiesString("properties");
    StringType schemaString("schema");
    
    ObjectType objectConstructor = NULL;
    if (ValueIsConstructor(ctx, objectSchemaObject)) {
        objectConstructor = objectSchemaObject;
        objectSchemaObject = RJSValidatedObjectProperty(ctx, objectConstructor, schemaString, "Realm object constructor must have a 'schema' property.");
    }
    
    ObjectDefaults objectDefaults;
    ObjectSchema objectSchema;
    objectSchema.name = RJSValidatedStringProperty(ctx, objectSchemaObject, nameString);
    
    ObjectType propertiesObject = RJSValidatedObjectProperty(ctx, objectSchemaObject, propertiesString, "ObjectSchema must have a 'properties' object.");
    if (RJSIsValueArray(ctx, propertiesObject)) {
        size_t propertyCount = RJSValidatedListLength(ctx, propertiesObject);
        for (size_t i = 0; i < propertyCount; i++) {
            ObjectType propertyObject = RJSValidatedObjectAtIndex(ctx, propertiesObject, (unsigned int)i);
            std::string propertyName = RJSValidatedStringProperty(ctx, propertyObject, nameString);
            objectSchema.properties.emplace_back(parse_property(ctx, propertyObject, propertyName, objectDefaults));
        }
    }
    else {
        auto propertyNames = ObjectGetPropertyNames(ctx, propertiesObject);
        for (auto propertyName : propertyNames) {
            ValueType propertyValue = RJSValidatedPropertyValue(ctx, propertiesObject, StringType(propertyName.c_str()));
            objectSchema.properties.emplace_back(parse_property(ctx, propertyValue, propertyName, objectDefaults));
        }
    }
    
    JSValueRef primaryValue = RJSValidatedPropertyValue(ctx, objectSchemaObject, primaryString);
    if (!JSValueIsUndefined(ctx, primaryValue)) {
        objectSchema.primary_key = RJSValidatedStringForValue(ctx, primaryValue);
        Property *property = objectSchema.primary_key_property();
        if (!property) {
            throw std::runtime_error("Missing primary key property '" + objectSchema.primary_key + "'");
        }
        property->is_primary = true;
    }
    
    // Store prototype so that objects of this type will have their prototype set to this prototype object.
    if (objectConstructor) {
        ValueProtect(ctx, objectConstructor);
        constructors[objectSchema.name] = std::move(objectConstructor);
    }
    
    defaults.emplace(objectSchema.name, std::move(objectDefaults));
    
    return objectSchema;
}
    
template<typename T>
realm::Schema Schema<T>::parse_schema(ContextType ctx, ObjectType jsonObject, ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    std::vector<ObjectSchema> schema;
    size_t length = RJSValidatedListLength(ctx, jsonObject);
    for (unsigned int i = 0; i < length; i++) {
        JSObjectRef jsonObjectSchema = RJSValidatedObjectAtIndex(ctx, jsonObject, i);
        ObjectSchema objectSchema = parse_object_schema(ctx, jsonObjectSchema, defaults, constructors);
        schema.emplace_back(std::move(objectSchema));
    }
    return realm::Schema(schema);
}

}
}