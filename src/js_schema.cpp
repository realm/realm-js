/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "js_schema.hpp"
#import "object_store.hpp"

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

static inline Property RJSParseProperty(JSContextRef ctx, JSValueRef propertyAttributes, std::string propertyName, ObjectDefaults &objectDefaults) {
    static JSStringRef defaultString = JSStringCreateWithUTF8CString("default");
    static JSStringRef typeString = JSStringCreateWithUTF8CString("type");
    static JSStringRef objectTypeString = JSStringCreateWithUTF8CString("objectType");
    static JSStringRef optionalString = JSStringCreateWithUTF8CString("optional");

    Property prop;
    prop.name = propertyName;

    JSObjectRef propertyObject = NULL;
    std::string type;

    if (JSValueIsObject(ctx, propertyAttributes)) {
        propertyObject = RJSValidatedValueToObject(ctx, propertyAttributes);
        type = RJSValidatedStringProperty(ctx, propertyObject, typeString);

        JSValueRef optionalValue = JSObjectGetProperty(ctx, propertyObject, optionalString, NULL);
        if (!JSValueIsUndefined(ctx, optionalValue)) {
            if (!JSValueIsBoolean(ctx, optionalValue)) {
                throw std::runtime_error("'optional' designation expected to be of type boolean");
            }
            prop.is_nullable = JSValueToBoolean(ctx, optionalValue);
        }
    }
    else {
        type = RJSValidatedStringForValue(ctx, propertyAttributes);
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
        JSValueRef defaultValue = RJSValidatedPropertyValue(ctx, propertyObject, defaultString);
        if (!JSValueIsUndefined(ctx, defaultValue)) {
            JSValueProtect(ctx, defaultValue);
            objectDefaults.emplace(prop.name, defaultValue);
        }
    }

    return prop;
}

static inline ObjectSchema RJSParseObjectSchema(JSContextRef ctx, JSObjectRef objectSchemaObject, std::map<std::string, realm::ObjectDefaults> &defaults, std::map<std::string, JSValueRef> &prototypes) {
    static JSStringRef nameString = JSStringCreateWithUTF8CString("name");
    static JSStringRef primaryString = JSStringCreateWithUTF8CString("primaryKey");
    static JSStringRef prototypeString = JSStringCreateWithUTF8CString("prototype");
    static JSStringRef propertiesString = JSStringCreateWithUTF8CString("properties");
    static JSStringRef schemaString = JSStringCreateWithUTF8CString("schema");

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

    ObjectDefaults objectDefaults;
    ObjectSchema objectSchema;
    objectSchema.name = RJSValidatedStringProperty(ctx, objectSchemaObject, nameString);

    JSObjectRef propertiesObject = RJSValidatedObjectProperty(ctx, objectSchemaObject, propertiesString, "ObjectSchema must have a 'properties' object.");
    if (RJSIsValueArray(ctx, propertiesObject)) {
        size_t propertyCount = RJSValidatedListLength(ctx, propertiesObject);
        for (size_t i = 0; i < propertyCount; i++) {
            JSObjectRef propertyObject = RJSValidatedObjectAtIndex(ctx, propertiesObject, (unsigned int)i);
            std::string propertyName = RJSValidatedStringProperty(ctx, propertyObject, nameString);
            objectSchema.properties.emplace_back(RJSParseProperty(ctx, propertyObject, propertyName, objectDefaults));
        }
    }
    else {
        JSPropertyNameArrayRef propertyNames = JSObjectCopyPropertyNames(ctx, propertiesObject);
        size_t propertyCount = JSPropertyNameArrayGetCount(propertyNames);
        for (size_t i = 0; i < propertyCount; i++) {
            JSStringRef propertyName = JSPropertyNameArrayGetNameAtIndex(propertyNames, i);
            JSValueRef propertyValue = RJSValidatedPropertyValue(ctx, propertiesObject, propertyName);
            objectSchema.properties.emplace_back(RJSParseProperty(ctx, propertyValue, RJSStringForJSString(propertyName), objectDefaults));
        }
        JSPropertyNameArrayRelease(propertyNames);
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
    if (prototypeObject) {
        JSValueProtect(ctx, prototypeObject);
        prototypes[objectSchema.name] = std::move(prototypeObject);
    }

    defaults.emplace(objectSchema.name, std::move(objectDefaults));

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

