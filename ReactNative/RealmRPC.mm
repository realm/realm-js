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

#include <map>
#include <string>
#include "RealmJS.h"
#include "RJSObject.hpp"
#include "RJSResults.hpp"
#include "RJSArray.hpp"
#include "RJSRealm.hpp"
#include "RJSUtil.hpp"

#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"

using RPCObjectID = long;
using RPCRequest = std::function<NSDictionary *(NSDictionary *dictionary)>;
static std::map<std::string, RPCRequest> s_requests;
static std::map<RPCObjectID, JSObjectRef> s_objects;

static JSGlobalContextRef s_context;

@implementation RJSRPCServer

+ (void)start {
    // Create server
    GCDWebServer* webServer = [[GCDWebServer alloc] init];
    s_context = JSGlobalContextCreate(NULL);

    s_requests["/create_realm"] = [=](NSDictionary *dict) {
        JSValueRef value = [[JSValue valueWithObject:dict
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        RPCObjectID realmId = [self storeObject:RealmConstructor(s_context, NULL, 1, &value, NULL)];
        return @{@"result": @(realmId)};
    };
    s_requests["/begin_transaction"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        RJSGetInternal<realm::SharedRealm *>(s_objects[realmId])->get()->begin_transaction();
        return @{};
    };
    s_requests["/cancel_transaction"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        RJSGetInternal<realm::SharedRealm *>(s_objects[realmId])->get()->cancel_transaction();
        return @{};
    };
    s_requests["/commit_transaction"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        RJSGetInternal<realm::SharedRealm *>(s_objects[realmId])->get()->commit_transaction();
        return @{};
    };
    s_requests["/create_object"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueRef value = [[JSValue valueWithObject:dict[@"value"]
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        JSValueRef exception = NULL;
        RPCObjectID oid = [self storeObject:(JSObjectRef)RealmCreateObject(s_context, NULL, s_objects[realmId], 1, &value, &exception)];
        return @{@"result": @{@"type": @"PropTypesOBJECT", @"id": @(oid)}};
    };
    s_requests["/dispose_realm"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueUnprotect(s_context, s_objects[realmId]);
        s_objects.erase(realmId);
        return @{};
    };
    s_requests["/get_property"] = [=](NSDictionary *dict) {
        JSValueRef exception = NULL;
        NSString *name = dict[@"name"];
        JSStringRef propString = RJSStringForString(name.UTF8String);
        RPCObjectID objectId = [dict[@"objectId"] longValue];
        JSValueRef propertyValue = ObjectGetProperty(s_context, s_objects[objectId], propString, &exception);
        JSStringRelease(propString);

        if (exception) {
            return @{@"error": @(RJSStringForValue(s_context, exception).c_str())};
        }
        return @{@"result": [self resultForJSValue:propertyValue]};
    };
    s_requests["/set_property"] = [=](NSDictionary *dict) {
        JSValueRef exception = NULL;
        JSStringRef propString = RJSStringForString([dict[@"name"] UTF8String]);
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueRef value = [[JSValue valueWithObject:dict[@"value"]
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        ObjectSetProperty(s_context, s_objects[realmId], propString, value, &exception);
        JSStringRelease(propString);

        return exception ? @{@"error": @(RJSStringForValue(s_context, exception).c_str())} : @{};
    };
    s_requests["/dispose_object"] = [=](NSDictionary *dict) {
        RPCObjectID oid = [dict[@"realmId"] longValue];
        JSValueUnprotect(s_context, s_objects[oid]);
        s_objects.erase(oid);
        return @{};
    };
    s_requests["/get_objects"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];

        JSValueRef arguments[2];
        long argumentCount = 1;
        arguments[0] = RJSValueForString(s_context, [dict[@"type"] UTF8String]);

        NSString *query = dict[@"predicate"];
        if (query) {
            arguments[1] = RJSValueForString(s_context, query.UTF8String);
        }

        JSValueRef exception = NULL;
        JSValueRef results = RealmObjects(s_context, NULL, s_objects[realmId], argumentCount, arguments, &exception);
        RPCObjectID resultsId = [self storeObject:(JSObjectRef)results];
        size_t size = RJSGetInternal<realm::Results *>((JSObjectRef)results)->size();
        return @{@"result": @{@"resultsId": @(resultsId), @"size": @(size)}};
    };
    s_requests["/get_results_size"] = [=](NSDictionary *dict) {
        RPCObjectID resultsId = [dict[@"resultsId"] longValue];

        JSValueRef exception = NULL;
        static JSStringRef lengthPropertyName = JSStringCreateWithUTF8CString("length");
        JSValueRef lengthValue = ResultsGetProperty(s_context, s_objects[resultsId], lengthPropertyName, &exception);
        return @{@"result": @(JSValueToNumber(s_context, lengthValue, &exception))};
    };
    s_requests["/get_results_item"] = [=](NSDictionary *dict) {
        RPCObjectID resultsId = [dict[@"resultsId"] longValue];
        long index = [dict[@"index"] longValue];

        JSValueRef exception = NULL;
        JSStringRef indexPropertyName = JSStringCreateWithUTF8CString(std::to_string(index).c_str());
        JSValueRef objectValue = ResultsGetProperty(s_context, s_objects[resultsId], indexPropertyName, &exception);
        JSStringRelease(indexPropertyName);

        if (exception) {
            return @{@"error": @(RJSStringForValue(s_context, exception).c_str())};
        }

        return @{@"result": [self resultForJSValue:objectValue]};
    };
    s_requests["/get_list_size"] = [=](NSDictionary *dict) {
        RPCObjectID listId = [dict[@"listId"] longValue];

        JSValueRef exception = NULL;
        static JSStringRef lengthPropertyName = JSStringCreateWithUTF8CString("length");
        JSValueRef lengthValue = ArrayGetProperty(s_context, s_objects[listId], lengthPropertyName, &exception);
        return @{@"result": @(JSValueToNumber(s_context, lengthValue, &exception))};
    };
    s_requests["/get_list_item"] = [=](NSDictionary *dict) {
        RPCObjectID listId = [dict[@"listId"] longValue];
        long index = [dict[@"index"] longValue];

        JSValueRef exception = NULL;
        JSStringRef indexPropertyName = JSStringCreateWithUTF8CString(std::to_string(index).c_str());
        JSValueRef objectValue = ArrayGetProperty(s_context, s_objects[listId], indexPropertyName, &exception);
        JSStringRelease(indexPropertyName);

        if (exception) {
            return @{@"error": @(RJSStringForValue(s_context, exception).c_str())};
        }

        return @{@"result": [self resultForJSValue:objectValue]};
    };
    s_requests["/call_list_method"] = [=](NSDictionary *dict) {
        NSString *name = dict[@"name"];
        RPCObjectID listId = [dict[@"listId"] longValue];
        JSValueRef exception = NULL;

        NSArray *arguments = dict[@"arguments"];
        JSValueRef argumentValues[arguments.count];
        JSContext *context = [JSContext contextWithJSGlobalContextRef:s_context];
        for (int i = 0; i < arguments.count; i++) {
            argumentValues[i] = [JSValue valueWithObject:arguments[i] inContext:context].JSValueRef;
        }

        JSValueRef ret;
        if ([name isEqualToString:@"push"]) {
            ret = ArrayPush(s_context, NULL, s_objects[listId], arguments.count, argumentValues, &exception);
        }
        else if ([name isEqualToString:@"pop"]) {
            ret = ArrayPop(s_context, NULL, s_objects[listId], arguments.count, argumentValues, &exception);
        }
        else if ([name isEqualToString:@"shift"]) {
            ret = ArrayShift(s_context, NULL, s_objects[listId], arguments.count, argumentValues, &exception);
        }
        else if ([name isEqualToString:@"unshift"]) {
            ret = ArrayUnshift(s_context, NULL, s_objects[listId], arguments.count, argumentValues, &exception);
        }
        else if ([name isEqualToString:@"splice"]) {
            ret = ArraySplice(s_context, NULL, s_objects[listId], arguments.count, argumentValues, &exception);
        }
        else {
            return @{@"error": @"invalid command"};
        }

        if (exception) {
            return @{@"error": @(RJSStringForValue(s_context, exception).c_str())};
        }
        return @{@"result": [self resultForJSValue:ret]};
    };

    // Add a handler to respond to GET requests on any URL
    [webServer addDefaultHandlerForMethod:@"POST"
                             requestClass:[GCDWebServerDataRequest class]
                             processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {
        RPCRequest action = s_requests[request.path.UTF8String];
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:[(GCDWebServerDataRequest *)request data] options:0 error:nil];

        // perform all realm ops on the main thread
        __block GCDWebServerDataResponse *response;
        dispatch_sync(dispatch_get_main_queue(), ^{
            response = [GCDWebServerDataResponse responseWithJSONObject:action(json)];
        });
        [response setValue:@"http://localhost:8081" forAdditionalHeader:@"Access-Control-Allow-Origin"];
        return response;
    }];

    [webServer startWithPort:8082 bonjourName:nil];
}

+ (RPCObjectID)storeObject:(JSObjectRef)object {
    static RPCObjectID s_next_id = 0;
    RPCObjectID next_id = s_next_id++;
    JSValueProtect(s_context, object);
    s_objects[next_id] = object;
    return next_id;
}

+ (NSDictionary *)resultForJSValue:(JSValueRef)value {
    switch (JSValueGetType(s_context, value)) {
        case kJSTypeUndefined:
            return @{};
        case kJSTypeNull:
            return @{@"value": [NSNull null]};
        case kJSTypeBoolean:
            return @{@"value": @(JSValueToBoolean(s_context, value))};
        case kJSTypeNumber:
            return @{@"value": @(JSValueToNumber(s_context, value, NULL))};
        case kJSTypeString:
            return @{@"value": @(RJSStringForValue(s_context, value).c_str())};
        case kJSTypeObject:
            break;
    }

    JSObjectRef jsObject = JSValueToObject(s_context, value, NULL);
    RPCObjectID oid = [self storeObject:jsObject];

    if (JSValueIsObjectOfClass(s_context, value, RJSObjectClass())) {
        realm::Object *object = RJSGetInternal<realm::Object *>(jsObject);
        return @{
             @"type": @(RJSTypeGet(realm::PropertyTypeObject).c_str()),
             @"id": @(oid),
             @"schema": [self objectSchemaToJSONObject:object->object_schema]
        };
    }
    else if (JSValueIsObjectOfClass(s_context, value, RJSArrayClass())) {
        realm::ObjectArray *array = RJSGetInternal<realm::ObjectArray *>(jsObject);
        return @{
             @"type": @(RJSTypeGet(realm::PropertyTypeArray).c_str()),
             @"id": @(oid),
             @"schema": [self objectSchemaToJSONObject:array->object_schema]
         };
    }
    else if (RJSIsValueArray(s_context, value)) {
        assert(0);
    }
    else {
        assert(0);
    }
}

+ (NSDictionary *)objectSchemaToJSONObject:(realm::ObjectSchema &)objectSchema {
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

@end
