//
//  RealmJS.m
//  RealmJS
//
//  Created by Ari Lazier on 4/23/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

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

    RJSRegisterGlobalClass(ctx, globalObject, RJSRealmConstructorClass(), "Realm", &exception);
    RJSRegisterGlobalClass(ctx, globalObject, RJSObjectClass(), "RealmObject", &exception);
    RJSRegisterGlobalClass(ctx, globalObject, RJSRealmTypeClass(), "RealmType", &exception);

    assert(!exception);
}

@end
