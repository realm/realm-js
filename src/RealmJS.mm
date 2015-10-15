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
#import "RJSUtil.hpp"

#include "shared_realm.hpp"

JSValueRef RJSTypeGet(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    return RJSValueForString(ctx, RJSTypeGet(RJSStringForJSString(propertyName)));
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
        { "LIST",  RJSTypeGet, NULL, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontDelete },
        { NULL, NULL, NULL, 0 }
    };
    realmTypesDefinition.staticValues = types;
    return JSClassCreate(&realmTypesDefinition);
}

NSString *RealmPathForFile(NSString *fileName) {
#if TARGET_OS_IPHONE
    NSString *path = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
#else
    NSString *path = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];
    path = [path stringByAppendingPathComponent:[[[NSBundle mainBundle] executablePath] lastPathComponent]];
#endif
    return [path stringByAppendingPathComponent:fileName];
}

static void DeleteOrThrow(NSString *path) {
    NSError *error;
    if (![[NSFileManager defaultManager] removeItemAtPath:path error:&error]) {
        if (error.code != NSFileNoSuchFileError) {
            @throw [NSException exceptionWithName:@"RLMTestException"
                                           reason:[@"Unable to delete realm: " stringByAppendingString:error.description]
                                         userInfo:nil];
        }
    }
}

static void DeleteRealmFilesAtPath(NSString *path) {
    DeleteOrThrow(path);
    DeleteOrThrow([path stringByAppendingString:@".lock"]);
    DeleteOrThrow([path stringByAppendingString:@".note"]);
}

static JSValueRef DeleteTestFiles(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef *exception) {
    [RealmJS deleteTestFiles];
    return NULL;
}

@implementation RealmJS

+ (void)initializeContext:(JSContextRef)ctx {
    JSValueRef exception = NULL;
    JSObjectRef globalObject = JSContextGetGlobalObject(ctx);

    JSObjectRef globalRealmObject = RJSRegisterGlobalClass(ctx, globalObject, RJSRealmConstructorClass(), "Realm", &exception);
    JSObjectRef typesObject = JSObjectMake(ctx, RJSRealmTypeClass(), NULL);
    JSStringRef typeString = JSStringCreateWithUTF8CString("Types");
    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    JSObjectSetProperty(ctx, globalRealmObject, typeString, typesObject, attributes, &exception);
    JSStringRelease(typeString);

    JSStringRef deleteTestFilesString = JSStringCreateWithUTF8CString("deleteTestFiles");
    JSObjectRef deleteTestFilesFunction = JSObjectMakeFunctionWithCallback(ctx, deleteTestFilesString, DeleteTestFiles);
    JSObjectSetProperty(ctx, globalRealmObject, deleteTestFilesString, deleteTestFilesFunction, attributes, &exception);
    JSStringRelease(deleteTestFilesString);

    assert(!exception);
}

+ (void)deleteTestFiles {
    realm::Realm::s_global_cache.invalidate_all();
    realm::Realm::s_global_cache.clear();

    // FIXME - find all realm files in the docs dir and delete them rather than hardcoding these
    
    DeleteRealmFilesAtPath(RealmPathForFile(@"test.realm"));
    DeleteRealmFilesAtPath(RealmPathForFile(@"test1.realm"));
    DeleteRealmFilesAtPath(RealmPathForFile(@"test2.realm"));
    DeleteRealmFilesAtPath(@(RJSDefaultPath().c_str()));
}

@end
