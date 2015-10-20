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

#import "RealmRPC.h"
#import <JavaScriptCore/JavaScriptCore.h>

#include <dlfcn.h>
#include <map>
#include <string>
#include "RealmJS.h"
#include "RJSObject.hpp"
#include "RJSResults.hpp"
#include "RJSList.hpp"
#include "RJSRealm.hpp"
#include "RJSUtil.hpp"

#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"

using RPCObjectID = u_int64_t;
using RPCRequest = std::function<NSDictionary *(NSDictionary *dictionary)>;

static const char * const RealmObjectTypesFunction = "ObjectTypesFUNCTION";
static const char * const RealmObjectTypesNotification = "ObjectTypesNOTIFICATION";
static const char * const RealmObjectTypesResults = "ObjectTypesRESULTS";

@implementation RJSRPCServer {
    JSGlobalContextRef _context;
    std::map<std::string, RPCRequest> _requests;
    std::map<RPCObjectID, JSObjectRef> _objects;
    RPCObjectID _sessionID;
}

- (void)dealloc {
    for (auto item : _objects) {
        JSValueUnprotect(_context, item.second);
    }

    JSGlobalContextRelease(_context);
    _requests.clear();
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _context = JSGlobalContextCreate(NULL);

        // JavaScriptCore crashes when trying to walk up the native stack to print the stacktrace.
        // FIXME: Avoid having to do this!
        static void (*setIncludesNativeCallStack)(JSGlobalContextRef, bool) = (void (*)(JSGlobalContextRef, bool))dlsym(RTLD_DEFAULT, "JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions");
        if (setIncludesNativeCallStack) {
            setIncludesNativeCallStack(_context, false);
        }

        id _self = self;
        __weak __typeof__(self) self = _self;

        _requests["/create_session"] = [=](NSDictionary *dict) {
            [RealmJS initializeContext:_context];

            JSStringRef realmString = RJSStringForString("Realm");
            JSObjectRef realmConstructor = RJSValidatedObjectProperty(_context, JSContextGetGlobalObject(_context), realmString);
            JSStringRelease(realmString);

            _sessionID = [self storeObject:realmConstructor];
            return @{@"result": @(_sessionID)};
        };
        _requests["/create_realm"] = [=](NSDictionary *dict) {
            JSObjectRef realmConstructor = _sessionID ? _objects[_sessionID] : NULL;
            if (!realmConstructor) {
                throw std::runtime_error("Realm constructor not found!");
            }

            NSArray *args = dict[@"arguments"];
            NSUInteger argCount = args.count;
            JSValueRef argValues[argCount];

            for (NSUInteger i = 0; i < argCount; i++) {
                argValues[i] = [self deserializeDictionaryValue:args[i]];
            }

            JSValueRef exception = NULL;
            JSObjectRef realmObject = JSObjectCallAsConstructor(_context, realmConstructor, argCount, argValues, &exception);

            if (exception) {
                return @{@"error": @(RJSStringForValue(_context, exception).c_str())};
            }

            RPCObjectID realmId = [self storeObject:realmObject];
            return @{@"result": @(realmId)};
        };
        _requests["/begin_transaction"] = [=](NSDictionary *dict) {
            RPCObjectID realmId = [dict[@"realmId"] unsignedLongValue];
            RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->begin_transaction();
            return nil;
        };
        _requests["/cancel_transaction"] = [=](NSDictionary *dict) {
            RPCObjectID realmId = [dict[@"realmId"] unsignedLongValue];
            RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->cancel_transaction();
            return nil;
        };
        _requests["/commit_transaction"] = [=](NSDictionary *dict) {
            RPCObjectID realmId = [dict[@"realmId"] unsignedLongValue];
            RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->commit_transaction();
            return nil;
        };
        _requests["/call_method"] = [=](NSDictionary *dict) {
            return [self performObjectMethod:dict[@"name"]
                                        args:dict[@"arguments"]
                                    objectId:[dict[@"id"] unsignedLongValue]];
        };
        _requests["/get_property"] = [=](NSDictionary *dict) {
            RPCObjectID oid = [dict[@"id"] unsignedLongValue];
            id name = dict[@"name"];
            JSValueRef value = NULL;
            JSValueRef exception = NULL;

            if ([name isKindOfClass:[NSNumber class]]) {
                value = JSObjectGetPropertyAtIndex(_context, _objects[oid], [name unsignedIntValue], &exception);
            }
            else {
                JSStringRef propString = RJSStringForString([name UTF8String]);
                value = JSObjectGetProperty(_context, _objects[oid], propString, &exception);
                JSStringRelease(propString);
            }

            if (exception) {
                return @{@"error": @(RJSStringForValue(_context, exception).c_str())};
            }
            return @{@"result": [self resultForJSValue:value]};
        };
        _requests["/set_property"] = [=](NSDictionary *dict) {
            RPCObjectID oid = [dict[@"id"] unsignedLongValue];
            id name = dict[@"name"];
            JSValueRef value = [self deserializeDictionaryValue:dict[@"value"]];
            JSValueRef exception = NULL;

            if ([name isKindOfClass:[NSNumber class]]) {
                JSObjectSetPropertyAtIndex(_context, _objects[oid], [name unsignedIntValue], value, &exception);
            }
            else {
                JSStringRef propString = RJSStringForString([name UTF8String]);
                JSObjectSetProperty(_context, _objects[oid], propString, value, 0, &exception);
                JSStringRelease(propString);
            }

            if (exception) {
                return @{@"error": @(RJSStringForValue(_context, exception).c_str())};
            }
            return @{};
        };
        _requests["/dispose_object"] = [=](NSDictionary *dict) {
            RPCObjectID oid = [dict[@"id"] unsignedLongValue];
            JSValueUnprotect(_context, _objects[oid]);
            _objects.erase(oid);
            return nil;
        };
        _requests["/clear_test_state"] = [=](NSDictionary *dict) {
            for (auto object : _objects) {
                // The session ID points to the Realm constructor object, which should remain.
                if (object.first == _sessionID) {
                    continue;
                }

                JSValueUnprotect(_context, object.second);
                _objects.erase(object.first);
            }
            JSGarbageCollect(_context);
            [RealmJS clearTestState];
            return nil;
        };
    }
    return self;
}

- (NSDictionary *)performRequest:(NSString *)name args:(NSDictionary *)args {
    // perform all realm ops on the main thread
    RPCRequest action = _requests[name.UTF8String];
    assert(action);

    __block id response;
    dispatch_sync(dispatch_get_main_queue(), ^{
        if (_sessionID != [args[@"sessionId"] unsignedLongValue]) {
            response = @{@"error": @"Invalid session ID"};
            return;
        }

        try {
            response = action(args);
        } catch (std::exception &exception) {
            response = @{@"error": [@"exception thrown: " stringByAppendingString:@(exception.what())]};
        }
    });
    return response ?: @{};
}

- (NSDictionary *)performObjectMethod:(NSString *)method args:(NSArray *)args objectId:(RPCObjectID)oid {
    JSObjectRef object = _objects[oid];
    JSStringRef methodString = RJSStringForString(method.UTF8String);
    JSObjectRef function = RJSValidatedObjectProperty(_context, object, methodString);
    JSStringRelease(methodString);

    NSUInteger argCount = args.count;
    JSValueRef argValues[argCount];
    for (NSUInteger i = 0; i < argCount; i++) {
        argValues[i] = [self deserializeDictionaryValue:args[i]];
    }

    JSValueRef exception = NULL;
    JSValueRef result = JSObjectCallAsFunction(_context, function, object, argCount, argValues, &exception);

    if (exception) {
        return @{@"error": @(RJSStringForValue(_context, exception).c_str())};
    }
    return @{@"result": [self resultForJSValue:result]};
}

- (RPCObjectID)storeObject:(JSObjectRef)object {
    static RPCObjectID s_next_id = 1;
    RPCObjectID next_id = s_next_id++;
    JSValueProtect(_context, object);
    _objects[next_id] = object;
    return next_id;
}

- (NSDictionary *)resultForJSValue:(JSValueRef)value {
    switch (JSValueGetType(_context, value)) {
        case kJSTypeUndefined:
            return @{};
        case kJSTypeNull:
            return @{@"value": [NSNull null]};
        case kJSTypeBoolean:
            return @{@"value": @(JSValueToBoolean(_context, value))};
        case kJSTypeNumber:
            return @{@"value": @(JSValueToNumber(_context, value, NULL))};
        case kJSTypeString:
            return @{@"value": @(RJSStringForValue(_context, value).c_str())};
        case kJSTypeObject:
            break;
    }

    JSObjectRef jsObject = JSValueToObject(_context, value, NULL);

    if (JSValueIsObjectOfClass(_context, value, RJSObjectClass())) {
        realm::Object *object = RJSGetInternal<realm::Object *>(jsObject);
        RPCObjectID oid = [self storeObject:jsObject];
        return @{
             @"type": @(RJSTypeGet(realm::PropertyTypeObject).c_str()),
             @"id": @(oid),
             @"schema": [self objectSchemaToJSONObject:object->object_schema]
        };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSListClass())) {
        realm::List *list = RJSGetInternal<realm::List *>(jsObject);
        RPCObjectID oid = [self storeObject:jsObject];
        return @{
             @"type": @(RJSTypeGet(realm::PropertyTypeArray).c_str()),
             @"id": @(oid),
             @"size": @(list->link_view->size()),
             @"schema": [self objectSchemaToJSONObject:list->object_schema]
         };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSResultsClass())) {
        realm::Results *results = RJSGetInternal<realm::Results *>(jsObject);
        RPCObjectID oid = [self storeObject:jsObject];
        return @{
             @"type": @(RealmObjectTypesResults),
             @"id": @(oid),
             @"size": @(results->size()),
             @"schema": [self objectSchemaToJSONObject:results->object_schema]
        };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSNotificationClass())) {
        RPCObjectID oid = [self storeObject:jsObject];
        return @{
            @"type": @(RealmObjectTypesNotification),
            @"id": @(oid),
        };
    }
    else if (RJSIsValueArray(_context, value)) {
        size_t length = RJSValidatedListLength(_context, jsObject);
        NSMutableArray *array = [NSMutableArray new];
        for (unsigned int i = 0; i < length; i++) {
            [array addObject:[self resultForJSValue:JSObjectGetPropertyAtIndex(_context, jsObject, i, NULL)]];
        }
        return @{@"value": array};
    }
    else if (RJSIsValueDate(_context, value)) {
        return @{
            @"type": @(RJSTypeGet(realm::PropertyTypeDate).c_str()),
            @"value": @(RJSValidatedValueToNumber(_context, value)),
        };
    }
    else {
        assert(0);
    }
}

- (NSDictionary *)objectSchemaToJSONObject:(realm::ObjectSchema &)objectSchema {
    NSMutableArray *properties = [[NSMutableArray alloc] init];

    for (realm::Property prop : objectSchema.properties) {
        NSDictionary *dict = @{
            @"name": @(prop.name.c_str()),
            @"type": @(RJSTypeGet(prop.type).c_str()),
        };

        [properties addObject:dict];
    }

    return @{
        @"name": @(objectSchema.name.c_str()),
        @"properties": properties,
    };
}

- (JSValueRef)deserializeDictionaryValue:(NSDictionary *)dict {
    RPCObjectID oid = [dict[@"id"] longValue];
    if (oid) {
        return _objects[oid];
    }

    NSString *type = dict[@"type"];
    id value = dict[@"value"];

    if ([type isEqualToString:@(RealmObjectTypesFunction)]) {
        // FIXME: Make this actually call the function by its id once we need it to.
        JSStringRef jsBody = JSStringCreateWithUTF8CString("");
        JSObjectRef jsFunction = JSObjectMakeFunction(_context, NULL, 0, NULL, jsBody, NULL, 1, NULL);
        JSStringRelease(jsBody);

        return jsFunction;
    }
    else if ([type isEqualToString:@(RJSTypeGet(realm::PropertyTypeDate).c_str())]) {
        JSValueRef exception = NULL;
        JSValueRef time = JSValueMakeNumber(_context, [value doubleValue]);
        JSObjectRef date = JSObjectMakeDate(_context, 1, &time, &exception);

        if (exception) {
            throw RJSException(_context, exception);
        }
        return date;
    }

    if (!value) {
        return JSValueMakeUndefined(_context);
    }
    else if ([value isKindOfClass:[NSNull class]]) {
        return JSValueMakeNull(_context);
    }
    else if ([value isKindOfClass:[@YES class]]) {
        return JSValueMakeBoolean(_context, [value boolValue]);
    }
    else if ([value isKindOfClass:[NSNumber class]]) {
        return JSValueMakeNumber(_context, [value doubleValue]);
    }
    else if ([value isKindOfClass:[NSString class]]) {
        return RJSValueForString(_context, std::string([value UTF8String]));
    }
    else if ([value isKindOfClass:[NSArray class]]) {
        NSUInteger count = [value count];
        JSValueRef jsValues[count];

        for (NSUInteger i = 0; i < count; i++) {
            jsValues[i] = [self deserializeDictionaryValue:value[i]];
        }

        return JSObjectMakeArray(_context, count, jsValues, NULL);
    }
    else if ([value isKindOfClass:[NSDictionary class]]) {
        JSObjectRef jsObject = JSObjectMake(_context, NULL, NULL);

        for (NSString *key in value) {
            JSValueRef jsValue = [self deserializeDictionaryValue:value[key]];
            JSStringRef jsKey = JSStringCreateWithCFString((__bridge CFStringRef)key);

            JSObjectSetProperty(_context, jsObject, jsKey, jsValue, 0, NULL);
            JSStringRelease(jsKey);
        }

        return jsObject;
    }

    return JSValueMakeUndefined(_context);
}

@end
