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

#import "RealmJS.h"
#import "RJSRealm.hpp"
#import "RJSObject.hpp"

JSValueRef RJSTypeGet(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    return RJSValueForString(ctx, "RealmType" + RJSStringForJSString(propertyName));
}

JSClassRef RJSRealmTypeClass() {
    JSClassDefinition realmTypesDefinition = kJSClassDefinitionEmpty;
    realmTypesDefinition.className = "RealmType";
    JSStaticValue types[] = {
        { "Bool",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Int",    RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Float",  RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Double", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "String", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Date",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Data",   RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Object", RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { "Array",  RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { NULL, NULL, NULL, 0 }
    };
    realmTypesDefinition.staticValues = types;
    return JSClassCreate(&realmTypesDefinition);
}

@implementation RealmJS

+ (void)initializeContext:(JSContextRef)ctx {
    JSValueRef exception = NULL;
    JSObjectRef globalObject = JSContextGetGlobalObject(ctx);

    JSObjectRef globalRealmObject = RJSRegisterGlobalClass(ctx, globalObject, RJSRealmConstructorClass(), "Realm", &exception);
    JSObjectRef typesObject = JSObjectMake(ctx, RJSRealmTypeClass(), NULL);
    JSStringRef typeString = JSStringCreateWithUTF8CString("Type");
    JSObjectSetProperty(ctx, globalRealmObject, typeString, typesObject, kJSPropertyAttributeNone, &exception);
    JSStringRelease(typeString);

    RJSRegisterGlobalClass(ctx, globalObject, RJSObjectClass(), "RealmObject", &exception);

    assert(!exception);
}

@end
