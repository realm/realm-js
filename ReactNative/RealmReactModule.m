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

#import <objc/runtime.h>
#import "RealmReactModule.h"
#import "Base/RCTLog.h"
#import "Base/RCTBridge.h"

@import GCDWebServers;
@import RealmJS;
@import JavaScriptCore;

@interface RCTBridge (executor)
@property (weak) id<RCTJavaScriptExecutor> javaScriptExecutor;
@end

@interface RCTJavaScriptContext : NSObject <RCTInvalidating>
@property (nonatomic, assign, readonly) JSGlobalContextRef ctx;
- (void)executeBlockOnJavaScriptQueue:(dispatch_block_t)block;
- (instancetype)initWithJSContext:(JSGlobalContextRef)context;
@end

@implementation Realm

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

-(void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    Ivar executorIvar = class_getInstanceVariable([bridge class], "_javaScriptExecutor");
    id contextExecutor = object_getIvar(bridge, executorIvar);
    Ivar contextIvar = class_getInstanceVariable([contextExecutor class], "_context");

    // The executor could be a RCTWebSocketExecutor, in which case it won't have a JS context.
    if (!contextIvar) {

        [GCDWebServer setLogLevel:3];
        GCDWebServer *webServer = [[GCDWebServer alloc] init];
        RJSRPCServer *rpcServer = [[RJSRPCServer alloc] init];

        // Add a handler to respond to GET requests on any URL
        [webServer addDefaultHandlerForMethod:@"POST"
                                 requestClass:[GCDWebServerDataRequest class]
                                 processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {
             NSDictionary *json = [NSJSONSerialization JSONObjectWithData:[(GCDWebServerDataRequest *)request data] options:0 error:nil];
             GCDWebServerDataResponse *response = [GCDWebServerDataResponse responseWithJSONObject:[rpcServer performRequest:request.path args:json]];
             [response setValue:@"http://localhost:8081" forAdditionalHeader:@"Access-Control-Allow-Origin"];
             return response;
         }];

        [webServer startWithPort:8082 bonjourName:nil];
        return;
    }

    [contextExecutor executeBlockOnJavaScriptQueue:^{
        RCTJavaScriptContext *rctJSContext = object_getIvar(contextExecutor, contextIvar);
        JSGlobalContextRef ctx;
        if (rctJSContext) {
            ctx = rctJSContext.ctx;
        }
        else {
            ctx = JSGlobalContextCreate(NULL);
            object_setIvar(contextExecutor, contextIvar, [[RCTJavaScriptContext alloc] initWithJSContext:ctx]);
        }

        [RealmJS initializeContext:ctx];

        RCTLogInfo(@"Realm initialized");
    }];
}


@end

