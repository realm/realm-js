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
#include "RJSObject.hpp"
#include "RJSResults.hpp"
#include "RJSRealm.hpp"
#include "RJSUtil.hpp"

using RPCObjectID = long;
using RPCRequest = std::function<std::string(NSDictionary *dictionary)>;
static std::map<std::string, RPCRequest> s_requests;
static std::map<RPCObjectID, JSObjectRef> s_objects;

static JSGlobalContextRef s_context;
static RPCObjectID s_id_counter = 0;

@implementation RJSRPCServer

+ (void)start {
    // Create server
    GCDWebServer* webServer = [[GCDWebServer alloc] init];
    s_context = JSGlobalContextCreate(NULL);

    s_requests["/create_realm"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = s_id_counter++;
        JSValueRef value = [[JSValue valueWithObject:dict
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        s_objects[realmId] = RealmConstructor(s_context, NULL, 1, &value, NULL);
        return "{\"realmId\":" + std::to_string(realmId) + "}";
    };
    s_requests["/create_object"] = [=](NSDictionary *dict) {
        RPCObjectID newOid = s_id_counter++;
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueRef value = [[JSValue valueWithObject:dict[@"value"]
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        JSValueRef exception = NULL;
        JSValueRef object = RealmCreateObject(s_context, NULL, s_objects[realmId], 1, &value, &exception);
        JSValueProtect(s_context, object);
        s_objects[newOid] = (JSObjectRef)object;
        return std::to_string(newOid);
    };
    s_requests["/dispose_realm"] = [=](NSDictionary *dict) {
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueUnprotect(s_context, s_objects[realmId]);
        s_objects.erase(realmId);
        return "";
    };
    s_requests["/get_property"] = [=](NSDictionary *dict) {
        JSStringRef propString = RJSStringForString([dict[@"name"] UTF8String]);
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueRef propertyValue = ObjectGetProperty(s_context, s_objects[realmId], propString, NULL);
        JSStringRelease(propString);

        return RJSValidatedStringForValue(s_context, propertyValue);
    };
    s_requests["/set_property"] = [=](NSDictionary *dict) {
        JSValueRef exception = NULL;
        JSStringRef propString = RJSStringForString([dict[@"name"] UTF8String]);
        RPCObjectID realmId = [dict[@"realmId"] longValue];
        JSValueRef value = [[JSValue valueWithObject:dict[@"value"]
                                           inContext:[JSContext contextWithJSGlobalContextRef:s_context]] JSValueRef];
        ObjectSetProperty(s_context, s_objects[realmId], propString, value, &exception);
        JSStringRelease(propString);

        return exception ? "exception" : "";
    };
    s_requests["/dispose_object"] = [=](NSDictionary *dict) {
        RPCObjectID oid = [dict[@"realmId"] longValue];
        JSValueUnprotect(s_context, s_objects[oid]);
        s_objects.erase(oid);
        return "";
    };

    // Add a handler to respond to GET requests on any URL
    [webServer addDefaultHandlerForMethod:@"POST"
                             requestClass:[GCDWebServerDataRequest class]
                             processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {
        RPCRequest action = s_requests[request.path.UTF8String];
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:[(GCDWebServerDataRequest *)request data] options:0 error:nil];
        GCDWebServerDataResponse *response = [GCDWebServerDataResponse responseWithHTML:@(action(json).c_str())];
        [response setValue:@"http://localhost:8081" forAdditionalHeader:@"Access-Control-Allow-Origin"];
        return response;
    }];
    [webServer startWithPort:8082 bonjourName:nil];
}

@end



