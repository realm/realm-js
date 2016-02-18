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

#include "js_init.h"
#include "js_realm.hpp"
#include "js_object.hpp"
#include "js_util.hpp"
#include "js_schema.hpp"
#include "platform.hpp"

#include "shared_realm.hpp"
#include <algorithm>
#include <cassert>

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
