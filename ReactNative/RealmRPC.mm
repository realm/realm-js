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
    [GCDWebServer setLogLevel:3];

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
    s_requests["/call_realm_method"] = [=](NSDictionary *dict) {
        NSString *name = dict[@"name"];
        return [self performObjectMethod:name.UTF8String
                            classMethods:RJSRealmFuncs
                                    args:dict[@"arguments"]
                                objectId:[dict[@"realmId"] longValue]];
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
        JSStringRef propString = RJSStringForString([dict[@"name"] UTF8String]);
        RPCObjectID realmId = [dict[@"objectId"] longValue];
        JSValueRef value = [self valueFromDictionary:dict[@"value"]];
        JSValueRef exception = NULL;

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
        return [self performObjectMethod:name.UTF8String
                            classMethods:RJSArrayFuncs
                                    args:dict[@"arguments"]
                                objectId:[dict[@"listId"] longValue]];
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

+ (NSDictionary *)performObjectMethod:(const char *)name
                         classMethods:(const JSStaticFunction [])methods
                                 args:(NSArray *)args
                             objectId:(RPCObjectID)oid {
    NSUInteger count = args.count;
    JSValueRef argValues[count];
    for (NSUInteger i = 0; i < count; i++) {
        argValues[i] = [self valueFromDictionary:args[i]];
    }

    size_t index = 0;
    while (methods[index].name) {
        if (!strcmp(methods[index].name, name)) {
            JSValueRef ex = NULL;
            JSValueRef ret = methods[index].callAsFunction(s_context, NULL, s_objects[oid], count, argValues, &ex);
            if (ex) {
                return @{@"error": @(RJSStringForValue(s_context, ex).c_str())};
            }
            return @{@"result": [self resultForJSValue:ret]};
        }
        index++;
    }

    return @{@"error": @"invalid method"};
}

+ (RPCObjectID)storeObject:(JSObjectRef)object {
    static RPCObjectID s_next_id = 1;
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
             @"size": @(array->link_view->size()),
             @"schema": [self objectSchemaToJSONObject:array->object_schema]
         };
    }
    else if (JSValueIsObjectOfClass(s_context, value, RJSResultsClass())) {
        realm::Results *results = RJSGetInternal<realm::Results *>(jsObject);
        return @{
             @"type": @"PrivateTypesRESULTS",
             @"resultsId": @(oid),
             @"size": @(results->size()),
             @"schema": [self objectSchemaToJSONObject:results->object_schema]
        };
    }
    else if (RJSIsValueArray(s_context, value)) {
        JSObjectRef jsObject = JSValueToObject(s_context, value, NULL);
        size_t length = RJSValidatedArrayLength(s_context, jsObject);
        NSMutableArray *array = [NSMutableArray new];
        for (unsigned int i = 0; i < length; i++) {
            [array addObject:[self resultForJSValue:JSObjectGetPropertyAtIndex(s_context, jsObject, i, NULL)]];
        }
        return @{@"value": array};
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

+ (JSValueRef)valueFromDictionary:(NSDictionary *)dict {
    RPCObjectID oid = [dict[@"id"] longValue];
    if (oid) {
        return s_objects[oid];
    }

    id value = dict[@"value"];
    if (!value) {
        return JSValueMakeUndefined(s_context);
    }
    else if ([value isKindOfClass:[NSNull class]]) {
        return JSValueMakeNull(s_context);
    }
    else if ([value isKindOfClass:[@YES class]]) {
        return JSValueMakeBoolean(s_context, [value boolValue]);
    }
    else if ([value isKindOfClass:[NSNumber class]]) {
        return JSValueMakeNumber(s_context, [value doubleValue]);
    }
    else if ([value isKindOfClass:[NSString class]]) {
        return RJSValueForString(s_context, std::string([value UTF8String]));
    }
    else if ([value isKindOfClass:[NSArray class]]) {
        NSUInteger count = [value count];
        JSValueRef jsValues[count];

        for (NSUInteger i = 0; i < count; i++) {
            jsValues[i] = [self valueFromDictionary:value[i]];
        }

        return JSObjectMakeArray(s_context, count, jsValues, NULL);
    }
    else if ([value isKindOfClass:[NSDictionary class]]) {
        JSObjectRef jsObject = JSObjectMake(s_context, NULL, NULL);

        for (NSString *key in value) {
            JSValueRef jsValue = [self valueFromDictionary:value[key]];
            JSStringRef jsKey = JSStringCreateWithCFString((__bridge CFStringRef)key);

            JSObjectSetProperty(s_context, jsObject, jsKey, jsValue, 0, NULL);
            JSStringRelease(jsKey);
        }

        return jsObject;
    }

    return JSValueMakeUndefined(s_context);
}

@end
