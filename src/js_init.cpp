/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "js_init.h"
#import "js_realm.hpp"
#import "js_object.hpp"
#import "js_util.hpp"
#import "js_schema.hpp"
#import "platform.hpp"

#include "shared_realm.hpp"
#include <algorithm>

extern "C" {

JSValueRef RJSTypeGet(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    std::string str = RJSStringForJSString(propertyName);
    std::transform(str.begin(), str.end(), str.begin(), ::tolower);
    return RJSValueForString(ctx, str);
}

JSClassRef RJSRealmTypeClass() {
    JSClassDefinition realmTypesDefinition = kJSClassDefinitionEmpty;
    realmTypesDefinition.className = "PropTypes";
    JSStaticValue types[] = {
        { "BOOL",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "INT",    RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "FLOAT",  RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "DOUBLE", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "STRING", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "DATE",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "DATA",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "OBJECT", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "LIST",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { NULL, NULL, NULL, 0 }
    };
    realmTypesDefinition.staticValues = types;
    return JSClassCreate(&realmTypesDefinition);
}

static JSValueRef ClearTestState(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef *exception) {
    RJSClearTestState();
    return NULL;
}

JSObjectRef RJSConstructorCreate(JSContextRef ctx) {
    JSObjectRef realmObject = JSObjectMake(ctx, RJSRealmConstructorClass(), NULL);
    JSObjectRef typesObject = JSObjectMake(ctx, RJSRealmTypeClass(), NULL);

    JSValueRef exception = NULL;
    JSStringRef typeString = JSStringCreateWithUTF8CString("Types");
    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    JSObjectSetProperty(ctx, realmObject, typeString, typesObject, attributes, &exception);
    JSStringRelease(typeString);
    assert(!exception);

    JSStringRef clearTestStateString = JSStringCreateWithUTF8CString("clearTestState");
    JSObjectRef clearTestStateFunction = JSObjectMakeFunctionWithCallback(ctx, clearTestStateString, ClearTestState);
    JSObjectSetProperty(ctx, realmObject, clearTestStateString, clearTestStateFunction, attributes, &exception);
    JSStringRelease(clearTestStateString);
    assert(!exception);

    return realmObject;
}

void RJSInitializeInContext(JSContextRef ctx) {
    JSObjectRef globalObject = JSContextGetGlobalObject(ctx);
    JSObjectRef realmObject = RJSConstructorCreate(ctx);

    JSValueRef exception = NULL;
    JSStringRef nameString = JSStringCreateWithUTF8CString("Realm");
    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;

    JSObjectSetProperty(ctx, globalObject, nameString, realmObject, attributes, &exception);
    JSStringRelease(nameString);
    assert(!exception);
}

void RJSClearTestState() {
    realm::Realm::s_global_cache.clear();
    realm::remove_realm_files_from_directory(realm::default_realm_file_directory());
}

}
