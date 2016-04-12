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
#include "platform.hpp"

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

JSObjectRef RJSConstructorCreate(JSContextRef ctx) {
    JSObjectRef realm_constructor = js::Realm<Types>::create_constructor(ctx);
    JSObjectRef types_object = JSObjectMake(ctx, RJSRealmTypeClass(), nullptr);

    // TODO: Either remove this (preferable) or move implementation to JS.
    jsc::Object::set_property(ctx, realm_constructor, "Types", types_object, js::PropertyAttributes(js::ReadOnly | js::DontEnum | js::DontDelete));

    return realm_constructor;
}

void RJSInitializeInContext(JSContextRef ctx) {
    static const String realm_string = "Realm";

    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    JSObjectRef realm_constructor = RJSConstructorCreate(ctx);

    jsc::Object::set_property(ctx, global_object, realm_string, realm_constructor, js::PropertyAttributes(js::ReadOnly | js::DontEnum | js::DontDelete));
}

} // extern "C"
