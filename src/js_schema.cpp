/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "js_schema.hpp"
#include "object_store.hpp"

namespace realm {
    struct SchemaWrapper {
        Schema *schema;
        bool owned;
        ~SchemaWrapper() {
            if (owned) {
                delete schema;
            }
        }
    };
}

using namespace realm;

JSClassRef RJSSchemaClass() {
    static JSClassRef s_schemaClass = RJSCreateWrapperClass<SchemaWrapper *>("Schema");
    return s_schemaClass;
}

JSObjectRef RJSSchemaCreate(JSContextRef ctx, Schema &schema) {
    SchemaWrapper *wrapper = new SchemaWrapper();
    wrapper->schema = &schema;
    wrapper->owned = false;
    return RJSWrapObject(ctx, RJSSchemaClass(), wrapper);
}

static inline Property RJSParseProperty(JSContextRef ctx, JSObjectRef propertyObject) {
    static JSStringRef nameString = JSStringCreateWithUTF8CString("name");
    static JSStringRef typeString = JSStringCreateWithUTF8CString("type");
    static JSStringRef objectTypeString = JSStringCreateWithUTF8CString("objectType");
    static JSStringRef optionalString = JSStringCreateWithUTF8CString("optional");

    Property prop;
    prop.name = RJSValidatedStringProperty(ctx, propertyObject, nameString);

    prop.is_nullable = false;
    JSValueRef optionalValue = JSObjectGetProperty(ctx, propertyObject, optionalString, NULL);
    if (!JSValueIsUndefined(ctx, optionalValue)) {
        if (!JSValueIsBoolean(ctx, optionalValue)) {
            throw std::runtime_error("'optional' designation expected to be of type boolean");
        }
        prop.is_nullable = JSValueToBoolean(ctx, optionalValue);
    }

    std::string type = RJSValidatedStringProperty(ctx, propertyObject, typeString);
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
        prop.type = PropertyTypeArray;
        prop.object_type =  RJSValidatedStringProperty(ctx, propertyObject, objectTypeString);
    }
    else {
        prop.type = PropertyTypeObject;
        prop.is_nullable = true;
        prop.object_type = type == "object" ? RJSValidatedStringProperty(ctx, propertyObject, objectTypeString) : type;
    }
    return prop;
}

static inline ObjectSchema RJSParseObjectSchema(JSContextRef ctx, JSObjectRef objectSchemaObject, std::map<std::string, realm::ObjectDefaults> &defaults, std::map<std::string, JSValueRef> &prototypes) {
    static JSStringRef schemaString = JSStringCreateWithUTF8CString("schema");
    static JSStringRef prototypeString = JSStringCreateWithUTF8CString("prototype");
    JSObjectRef prototypeObject = NULL;
    JSValueRef prototypeValue = RJSValidatedPropertyValue(ctx, objectSchemaObject, prototypeString);
    if (!JSValueIsUndefined(ctx, prototypeValue)) {
        prototypeObject = RJSValidatedValueToObject(ctx, prototypeValue);
        objectSchemaObject = RJSValidatedObjectProperty(ctx, prototypeObject, schemaString, "Realm object prototype must have a 'schema' property.");
    }
    else {
        JSValueRef subSchemaValue = RJSValidatedPropertyValue(ctx, objectSchemaObject, schemaString);
        if (!JSValueIsUndefined(ctx, subSchemaValue)) {
            objectSchemaObject = RJSValidatedValueToObject(ctx, subSchemaValue);
        }
    }

    static JSStringRef propertiesString = JSStringCreateWithUTF8CString("properties");
    JSObjectRef propertiesObject = RJSValidatedObjectProperty(ctx, objectSchemaObject, propertiesString, "ObjectSchema object must have a 'properties' array.");

    ObjectSchema objectSchema;
    ObjectDefaults objectDefaults;
    static JSStringRef nameString = JSStringCreateWithUTF8CString("name");
    objectSchema.name = RJSValidatedStringProperty(ctx, objectSchemaObject, nameString);

    size_t numProperties = RJSValidatedListLength(ctx, propertiesObject);
    for (unsigned int p = 0; p < numProperties; p++) {
        JSObjectRef property = RJSValidatedObjectAtIndex(ctx, propertiesObject, p);
        objectSchema.properties.emplace_back(RJSParseProperty(ctx, property));

        static JSStringRef defaultString = JSStringCreateWithUTF8CString("default");
        JSValueRef defaultValue = JSObjectGetProperty(ctx, property, defaultString, NULL);
        if (!JSValueIsUndefined(ctx, defaultValue)) {
            JSValueProtect(ctx, defaultValue);
            objectDefaults.emplace(objectSchema.properties.back().name, defaultValue);
        }
    }
    defaults.emplace(objectSchema.name, std::move(objectDefaults));

    static JSStringRef primaryString = JSStringCreateWithUTF8CString("primaryKey");
    JSValueRef primaryValue = RJSValidatedPropertyValue(ctx, objectSchemaObject, primaryString);
    if (!JSValueIsUndefined(ctx, primaryValue)) {
        objectSchema.primary_key = RJSValidatedStringForValue(ctx, primaryValue);
        Property *property = objectSchema.primary_key_property();
        if (!property) {
            throw std::runtime_error("Missing primary key property '" + objectSchema.primary_key + "'");
        }
        property->is_primary = true;
    }

    // store prototype
    if (prototypeObject) {
        JSValueProtect(ctx, prototypeObject);
        prototypes[objectSchema.name] = std::move(prototypeObject);
    }

    return objectSchema;
}

realm::Schema RJSParseSchema(JSContextRef ctx, JSObjectRef jsonObject, std::map<std::string, realm::ObjectDefaults> &defaults, std::map<std::string, JSValueRef> &prototypes) {
    std::vector<ObjectSchema> schema;
    size_t length = RJSValidatedListLength(ctx, jsonObject);
    for (unsigned int i = 0; i < length; i++) {
        JSObjectRef jsonObjectSchema = RJSValidatedObjectAtIndex(ctx, jsonObject, i);
        ObjectSchema objectSchema = RJSParseObjectSchema(ctx, jsonObjectSchema, defaults, prototypes);
        schema.emplace_back(std::move(objectSchema));
     }

    return Schema(schema);
}

