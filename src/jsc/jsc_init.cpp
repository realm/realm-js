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

#include <algorithm>
#include <cassert>

#include "jsc_init.hpp"
#include "jsc_realm.hpp"
#include "jsc_collection.hpp"
#include "jsc_list.hpp"
#include "jsc_util.hpp"
#include "platform.hpp"

#include "shared_realm.hpp"
#include "impl/realm_coordinator.hpp"

extern "C" {

using namespace realm;
using namespace realm::jsc;

JSValueRef RJSTypeGet(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    std::string str = String(propertyName);
    std::transform(str.begin(), str.end(), str.begin(), ::tolower);
    return Value::from_string(ctx, str);
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
    static const String clearTestStateString = "clearTestState";
    static const String collectionString = "Collection";
    static const String listString = "List";
    static const String resultsString = "Results";
    static const String typeString = "Types";

    JSObjectRef realmObject = JSObjectMake(ctx, RJSRealmConstructorClass(), NULL);
    js::PropertyAttributes attributes = js::PropertyAttributes(js::ReadOnly | js::DontEnum | js::DontDelete);

//    JSObjectRef collectionConstructor = JSObjectMakeConstructor(ctx, RJSCollectionClass(), UncallableConstructor);
//    RJSValidatedSetProperty(ctx, realmObject, collectionString, collectionConstructor, attributes);

//    JSObjectRef listConstructor = JSObjectMakeConstructor(ctx, RJSListClass(), UncallableConstructor);
//    RJSValidatedSetProperty(ctx, realmObject, listString, listConstructor, attributes);

//    JSObjectRef resultsContructor = JSObjectMakeConstructor(ctx, RJSResultsClass(), UncallableConstructor);
//    RJSValidatedSetProperty(ctx, realmObject, resultsString, resultsContructor, attributes);

    JSObjectRef typesObject = JSObjectMake(ctx, RJSRealmTypeClass(), NULL);
    RJSValidatedSetProperty(ctx, realmObject, typeString, typesObject, attributes);

    JSObjectRef clearTestStateFunction = JSObjectMakeFunctionWithCallback(ctx, clearTestStateString, ClearTestState);
    jsc::Object::set_property(ctx, realmObject, clearTestStateString, clearTestStateFunction, attributes);

    return realmObject;
}

void RJSInitializeInContext(JSContextRef ctx) {
    static const String nameString = "Realm";

    JSObjectRef globalObject = JSContextGetGlobalObject(ctx);
    JSObjectRef realmObject = RJSConstructorCreate(ctx);

    JSValueRef exception = NULL;
    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;

    JSObjectSetProperty(ctx, globalObject, nameString, realmObject, attributes, &exception);
    assert(!exception);
}

void RJSClearTestState() {
    realm::_impl::RealmCoordinator::clear_all_caches();
    realm::remove_realm_files_from_directory(realm::default_realm_file_directory());
}

}
