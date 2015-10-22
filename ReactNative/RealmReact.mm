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

extern "C" {
#import "RealmReact.h"
#import "Base/RCTBridge.h"

#import <GCDWebServers/GCDWebServers.h>
#import <RealmJS/RealmJS.h>
#import <objc/runtime.h>
#import <dlfcn.h>

@interface NSObject (RCTJavaScriptContext)
    - (instancetype)initWithJSContext:(JSGlobalContextRef)context;
    - (JSGlobalContextRef)ctx;
@end

JSGlobalContextRef RealmReactGetJSGlobalContextForExecutor(id executor, bool create) {
    Ivar contextIvar = class_getInstanceVariable([executor class], "_context");
    if (!contextIvar) {
        return NULL;
    }

    id rctJSContext = contextIvar ? object_getIvar(executor, contextIvar) : nil;
    if (!rctJSContext && create) {
        Class RCTJavaScriptContext = NSClassFromString(@"RCTJavaScriptContext");
        if (RCTJavaScriptContext) {
            JSGlobalContextRef ctx = JSGlobalContextCreate(NULL);
            rctJSContext = [[RCTJavaScriptContext alloc] initWithJSContext:ctx];
            object_setIvar(executor, contextIvar, rctJSContext);
        }
        else {
            NSLog(@"Failed to load RCTJavaScriptContext class");
        }
    }
    
    return [rctJSContext ctx];
}
}

#import <RealmJS/RealmRPC.hpp>
#import <RealmJS/RJSUtil.hpp>

@interface RealmReact () <RCTBridgeModule>
@end

@implementation RealmReact

@synthesize bridge = _bridge;

+ (void)load {
    void (*RCTRegisterModule)(Class) = (void (*)(Class))dlsym(RTLD_DEFAULT, "RCTRegisterModule");

    if (RCTRegisterModule) {
        RCTRegisterModule(self);
    }
    else {
        NSLog(@"Failed to load RCTRegisterModule symbol - %s", dlerror());
    }
}

+ (NSString *)moduleName {
    return @"Realm";
}

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    static GCDWebServer *s_webServer;
    if (s_webServer) {
        [s_webServer stop];
        [s_webServer removeAllHandlers];
        s_webServer = nil;
    }

    // The executor could be a RCTWebSocketExecutor, in which case it won't have a JS context.
    Ivar executorIvar = class_getInstanceVariable([bridge class], "_javaScriptExecutor");
    id executor = object_getIvar(bridge, executorIvar);
    if ([executor isMemberOfClass:NSClassFromString(@"RCTWebSocketExecutor")]) {
        [GCDWebServer setLogLevel:3];
        GCDWebServer *webServer = [[GCDWebServer alloc] init];
        __block realm_js::RPCServer rpcServer;

        // Add a handler to respond to POST requests on any URL
        [webServer addDefaultHandlerForMethod:@"POST"
                                 requestClass:[GCDWebServerDataRequest class]
                                 processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {

            GCDWebServerResponse *response;
            try {
                realm_js::json args = realm_js::json::parse([[(GCDWebServerDataRequest *)request text] UTF8String]);
                std::string response_text = rpcServer.perform_request(request.path.UTF8String, args).dump();
                response = [[GCDWebServerDataResponse alloc] initWithData:[NSData dataWithBytes:response_text.c_str() length:response_text.length()] contentType:@"application/json"];
            }
            catch(std::exception &ex) {
                NSLog(@"Invalid RPC request - %@", [(GCDWebServerDataRequest *)request text]);
                response = [GCDWebServerErrorResponse responseWithClientError:kGCDWebServerHTTPStatusCode_UnprocessableEntity
                                                              underlyingError:nil
                                                                      message:@"Invalid RPC request"];
            }


            [response setValue:@"http://localhost:8081" forAdditionalHeader:@"Access-Control-Allow-Origin"];
            return response;
        }];

        [webServer startWithPort:8082 bonjourName:nil];

        s_webServer = webServer;
        return;
    }

    [executor executeBlockOnJavaScriptQueue:^{
        JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(executor, true);
        [RealmJS initializeContext:ctx];
    }];
}

@end
