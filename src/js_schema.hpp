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
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    using ObjectDefaults = std::map<std::string, Protected<ValueType>>;
    using ObjectDefaultsMap = std::map<std::string, ObjectDefaults>;
    using ConstructorMap = std::map<std::string, Protected<FunctionType>>;

    static ObjectType dict_for_property_array(ContextType, const ObjectSchema &, ObjectType);
    static Property parse_property(ContextType, ValueType, StringData, std::string, ObjectDefaults &);
    static ObjectSchema parse_object_schema(ContextType, ObjectType, ObjectDefaultsMap &, ConstructorMap &);
    static realm::Schema parse_schema(ContextType, ObjectType, ObjectDefaultsMap &, ConstructorMap &);

    static ObjectType object_for_schema(ContextType, const realm::Schema &);
    static ObjectType object_for_object_schema(ContextType, const ObjectSchema &);
    static ObjectType object_for_property(ContextType, const Property &);
};

template<typename T>
typename T::Object Schema<T>::dict_for_property_array(ContextType ctx, const ObjectSchema &object_schema, ObjectType array) {
    size_t count = object_schema.persisted_properties.size();

    if (count != Object::validated_get_length(ctx, array)) {
        throw std::runtime_error("Array must contain values for all object properties");
    }

    ObjectType dict = Object::create_empty(ctx);

    for (uint32_t i = 0; i < count; i++) {
        ValueType value = Object::get_property(ctx, array, i);
        Property prop = object_schema.persisted_properties[i];
        Object::set_property(ctx, dict, !prop.public_name.empty() ? prop.public_name : prop.name, value);
    }

    return dict;
}

static inline void parse_property_type(StringData object_name, Property& prop, StringData type)
{
    using realm::PropertyType;
    if (!type || !type.size()) {
        throw std::logic_error(util::format("Property '%1.%2' must have a non-empty type", object_name, prop.name));
    }
    if (type.ends_with("[]")) {
        prop.type |= PropertyType::Array;
        type = type.substr(0, type.size() - 2);
    }
    if (type.ends_with("?")) {
        prop.type |= PropertyType::Nullable;
        type = type.substr(0, type.size() - 1);
    }

    if (type == "bool") {
        prop.type |= PropertyType::Bool;
    }
    else if (type == "int") {
        prop.type |= PropertyType::Int;
    }
    else if (type == "float") {
        prop.type |= PropertyType::Float;
    }
    else if (type == "double") {
        prop.type |= PropertyType::Double;
    }
    else if (type == "string") {
        prop.type |= PropertyType::String;
    }
    else if (type == "date") {
        prop.type |= PropertyType::Date;
    }
    else if (type == "data") {
        prop.type |= PropertyType::Data;
    }
    else if (type == "list") {
        if (prop.object_type == "bool") {
            prop.type |= PropertyType::Bool | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "int") {
            prop.type |= PropertyType::Int | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "float") {
            prop.type |= PropertyType::Float | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "double") {
            prop.type |= PropertyType::Double | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "string") {
            prop.type |= PropertyType::String | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "date") {
            prop.type |= PropertyType::Date | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "data") {
            prop.type |= PropertyType::Data | PropertyType::Array;
            prop.object_type = "";
        }
        else {
            if (is_nullable(prop.type)) {
                throw std::logic_error(util::format("List property '%1.%2' cannot be optional", object_name, prop.name));
            }
            if (is_array(prop.type)) {
                throw std::logic_error(util::format("List property '%1.%2' must have a non-list value type", object_name, prop.name));
            }
            prop.type |= PropertyType::Object | PropertyType::Array;
        }
    }
    else if (type == "linkingObjects") {
        prop.type |= PropertyType::LinkingObjects | PropertyType::Array;
    }
    else if (type == "object") {
        prop.type |= PropertyType::Object;
    }
    else {
        // The type could be the name of another object type in the same schema.
        prop.type |= PropertyType::Object;
        prop.object_type = type;
    }

    // Object properties are implicitly optional
    if (prop.type == PropertyType::Object && !is_array(prop.type)) {
        prop.type |= PropertyType::Nullable;
    }
}


template<typename T>
Property Schema<T>::parse_property(ContextType ctx, ValueType attributes, StringData object_name,
                                   std::string property_name, ObjectDefaults &object_defaults) {
    static const String default_string = "default";
    static const String indexed_string = "indexed";
    static const String type_string = "type";
    static const String object_type_string = "objectType";
    static const String optional_string = "optional";
    static const String property_string = "property";
    static const String internal_name_string = "mapTo";

    Property prop;
    prop.name = std::move(property_name);

    ObjectType property_object = {};
    std::string type;

    using realm::PropertyType;

    if (Value::is_object(ctx, attributes)) {
        property_object = Value::validated_to_object(ctx, attributes);
        std::string property_type = Object::validated_get_string(ctx, property_object, type_string);
        ValueType object_type_value = Object::get_property(ctx, property_object, object_type_string);
        if (!Value::is_undefined(ctx, object_type_value)) {
            prop.object_type = Value::validated_to_string(ctx, object_type_value, "objectType");
        }
        parse_property_type(object_name, prop, property_type);

        ValueType optional_value = Object::get_property(ctx, property_object, optional_string);
        if (!Value::is_undefined(ctx, optional_value) && Value::validated_to_boolean(ctx, optional_value, "optional")) {
            prop.type |= PropertyType::Nullable;
        }

        ValueType default_value = Object::get_property(ctx, property_object, default_string);
        if (!Value::is_undefined(ctx, default_value)) {
            object_defaults.emplace(prop.name, Protected<ValueType>(ctx, default_value));
        }

        ValueType indexed_value = Object::get_property(ctx, property_object, indexed_string);
        if (!Value::is_undefined(ctx, indexed_value)) {
            prop.is_indexed = Value::validated_to_boolean(ctx, indexed_value);
        }

        ValueType internal_name_value = Object::get_property(ctx, property_object, internal_name_string);
        if (!Value::is_undefined(ctx, internal_name_value)) {
            std::string internal_name = Value::validated_to_string(ctx, internal_name_value);
            if (internal_name != prop.name) {
                prop.public_name = prop.name;
                prop.name = internal_name;
            }
        }
    }
    else {
        std::string property_type = Value::validated_to_string(ctx, attributes);
        parse_property_type(object_name, prop, property_type);
    }

    if (prop.type == PropertyType::Object && prop.object_type.empty()) {
        if (!Value::is_valid(property_object)) {
            throw std::logic_error(util::format("%1 property %2.%3 must specify 'objectType'",
                                                is_array(prop.type) ? "List" : "Object", object_name, prop.name));
        }
        prop.object_type = Object::validated_get_string(ctx, property_object, object_type_string);
    }

    if (prop.type == PropertyType::LinkingObjects) {
        if (!Value::is_valid(property_object)) {
            throw std::logic_error(util::format("Linking objects property %1.%2 must specify 'objectType'",
                                                object_name, prop.name));
        }
        prop.object_type = Object::validated_get_string(ctx, property_object, object_type_string);
        prop.link_origin_property_name = Object::validated_get_string(ctx, property_object, property_string);
    }

    return prop;
}

template<typename T>
ObjectSchema Schema<T>::parse_object_schema(ContextType ctx, ObjectType object_schema_object, ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    static const String name_string = "name";
    static const String primary_string = "primaryKey";
    static const String properties_string = "properties";
    static const String schema_string = "schema";

    FunctionType object_constructor = {};
    if (Value::is_constructor(ctx, object_schema_object)) {
        object_constructor = Value::to_constructor(ctx, object_schema_object);
        object_schema_object = Object::validated_get_object(ctx, object_constructor, schema_string, "Realm object constructor must have a 'schema' property.");
    }

    ObjectDefaults object_defaults;
    ObjectSchema object_schema;
    object_schema.name = Object::validated_get_string(ctx, object_schema_object, name_string, "ObjectSchema");

    ObjectType properties_object = Object::validated_get_object(ctx, object_schema_object, properties_string, "ObjectSchema");
    if (Value::is_array(ctx, properties_object)) {
        uint32_t length = Object::validated_get_length(ctx, properties_object);
        for (uint32_t i = 0; i < length; i++) {
            ObjectType property_object = Object::validated_get_object(ctx, properties_object, i);
            std::string property_name = Object::validated_get_string(ctx, property_object, name_string);
            Property property = parse_property(ctx, property_object, object_schema.name, std::move(property_name), object_defaults);
            if (property.type == realm::PropertyType::LinkingObjects) {
                object_schema.computed_properties.emplace_back(std::move(property));
            }
            else {
                object_schema.persisted_properties.emplace_back(std::move(property));
            }

        }
    }
    else {
        auto property_names = Object::get_property_names(ctx, properties_object);
        for (auto& property_name : property_names) {
            ValueType property_value = Object::get_property(ctx, properties_object, property_name);
            Property property = parse_property(ctx, property_value, object_schema.name, property_name, object_defaults);
            if (property.type == realm::PropertyType::LinkingObjects) {
                object_schema.computed_properties.emplace_back(std::move(property));
            }
            else {
                object_schema.persisted_properties.emplace_back(std::move(property));
            }
        }
    }

    ValueType primary_value = Object::get_property(ctx, object_schema_object, primary_string);
    if (!Value::is_undefined(ctx, primary_value)) {
        object_schema.primary_key = Value::validated_to_string(ctx, primary_value);
        Property *property = object_schema.primary_key_property();
        if (!property) {
            throw std::runtime_error("Schema named '" + object_schema.name + "' specifies primary key of '" + object_schema.primary_key + "' but does not declare a property of that name.");
        }
        property->is_primary = true;
    }

    // Store prototype so that objects of this type will have their prototype set to this prototype object.
    if (Value::is_valid(object_constructor)) {
        constructors.emplace(object_schema.name, Protected<FunctionType>(ctx, object_constructor));
    }

    defaults.emplace(object_schema.name, std::move(object_defaults));

    return object_schema;
}

template<typename T>
realm::Schema Schema<T>::parse_schema(ContextType ctx, ObjectType schema_object,
                                      ObjectDefaultsMap &defaults, ConstructorMap &constructors) {
    std::vector<ObjectSchema> schema;
    uint32_t length = Object::validated_get_length(ctx, schema_object);

    for (uint32_t i = 0; i < length; i++) {
        ObjectType object_schema_object = Object::validated_get_object(ctx, schema_object, i, "ObjectSchema");
        ObjectSchema object_schema = parse_object_schema(ctx, object_schema_object, defaults, constructors);
        schema.emplace_back(std::move(object_schema));
    }

    return realm::Schema(schema);
}

template<typename T>
typename T::Object Schema<T>::object_for_schema(ContextType ctx, const realm::Schema &schema) {
    ObjectType object = Object::create_array(ctx);
    uint32_t count = 0;
    for (auto& object_schema : schema) {
        Object::set_property(ctx, object, count++, object_for_object_schema(ctx, object_schema));
    }
    return object;
}

template<typename T>
typename T::Object Schema<T>::object_for_object_schema(ContextType ctx, const ObjectSchema &object_schema) {
    ObjectType object = Object::create_empty(ctx);

    static const String name_string = "name";
    Object::set_property(ctx, object, name_string, Value::from_string(ctx, object_schema.name));

    ObjectType properties = Object::create_empty(ctx);
    for (auto& property : object_schema.persisted_properties) {
        auto property_key = property.public_name.empty() ? property.name : property.public_name;
        Object::set_property(ctx, properties, property_key, object_for_property(ctx, property));
    }
    for (auto& property : object_schema.computed_properties) {
        auto property_key = property.public_name.empty() ? property.name : property.public_name;
        Object::set_property(ctx, properties, property_key, object_for_property(ctx, property));
    }

    static const String properties_string = "properties";
    Object::set_property(ctx, object, properties_string, properties);

    static const String primary_key_string = "primaryKey";
    if (object_schema.primary_key.size()) {
        Object::set_property(ctx, object, primary_key_string, Value::from_string(ctx, object_schema.primary_key));
    }

    return object;
}

template<typename T>
typename T::Object Schema<T>::object_for_property(ContextType ctx, const Property &property) {
    ObjectType object = Object::create_empty(ctx);

    static const String name_string = "name";
    Object::set_property(ctx, object, name_string, Value::from_string(ctx, property.public_name.empty() ? property.name : property.public_name));

    static const String type_string = "type";
    if (is_array(property.type)) {
        if  (property.type == realm::PropertyType::LinkingObjects) {
            Object::set_property(ctx, object, type_string, Value::from_string(ctx, "linkingObjects"));
        }
        else {
            Object::set_property(ctx, object, type_string, Value::from_string(ctx, "list"));
        }
    }
    else {
        Object::set_property(ctx, object, type_string, Value::from_string(ctx, string_for_property_type(property.type)));
    }

    static const String object_type_string = "objectType";
    if (property.object_type.size()) {
        Object::set_property(ctx, object, object_type_string, Value::from_string(ctx, property.object_type));
    }
    else if (is_array(property.type)) {
        Object::set_property(ctx, object, object_type_string, Value::from_string(ctx, string_for_property_type(property.type & ~realm::PropertyType::Flags)));
    }

    static const String property_string = "property";
    if (property.type == realm::PropertyType::LinkingObjects) {
        Object::set_property(ctx, object, property_string, Value::from_string(ctx, property.link_origin_property_name));
    }

    static const String indexed_string = "indexed";
    Object::set_property(ctx, object, indexed_string, Value::from_boolean(ctx, property.is_indexed));

    static const String optional_string = "optional";
    Object::set_property(ctx, object, optional_string, Value::from_boolean(ctx, is_nullable(property.type)));

    static const String map_to_string =  "mapTo";
    Object::set_property(ctx, object, map_to_string, Value::from_string(ctx, property.name));

    return object;
}

} // js
} // realm
