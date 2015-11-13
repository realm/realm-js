/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

extern "C" {
#import "RealmReact.h"
#import "Base/RCTBridge.h"

#import <RealmJS/RealmJS.h>
#import <objc/runtime.h>
#import <dlfcn.h>

#if DEBUG
#import <GCDWebServers/GCDWebServers.h>
#endif

@interface NSObject ()
- (instancetype)initWithJSContext:(void *)context;
- (JSGlobalContextRef)ctx;
@end

JSGlobalContextRef RealmReactGetJSGlobalContextForExecutor(id executor, bool create) {
    Ivar contextIvar = class_getInstanceVariable([executor class], "_context");
    if (!contextIvar) {
        return NULL;
    }

    id rctJSContext = object_getIvar(executor, contextIvar);
    if (!rctJSContext && create) {
        Class RCTJavaScriptContext = NSClassFromString(@"RCTJavaScriptContext");
        NSMethodSignature *signature = [RCTJavaScriptContext instanceMethodSignatureForSelector:@selector(initWithJSContext:)];
        assert(signature);

        // React Native 0.14+ expects a JSContext here, but we also support 0.13.x, which takes a JSGlobalContextRef.
        if (!strcmp([signature getArgumentTypeAtIndex:2], "@")) {
            JSContext *context = [[JSContext alloc] init];
            rctJSContext = [[RCTJavaScriptContext alloc] initWithJSContext:(void *)context];
        }
        else {
            JSGlobalContextRef ctx = JSGlobalContextCreate(NULL);
            rctJSContext = [[RCTJavaScriptContext alloc] initWithJSContext:ctx];
        }

        object_setIvar(executor, contextIvar, rctJSContext);
    }

    return [rctJSContext ctx];
}
}

#if DEBUG
#import <GCDWebServers/GCDWebServers.h>
#import <RealmJS/RealmRPC.hpp>
@interface RealmReact () {
    GCDWebServer *_webServer;
    std::unique_ptr<realm_js::RPCServer> _rpcServer;
}
@end

static std::mutex s_rpcMutex;
static __weak RealmReact *s_currentRealmModule = nil;
#endif


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

#if DEBUG
- (void)startRPC {
    std::lock_guard<std::mutex> lock(s_rpcMutex);

    [GCDWebServer setLogLevel:3];
    _webServer = [[GCDWebServer alloc] init];
    _rpcServer = std::make_unique<realm_js::RPCServer>();
    __weak __typeof__(self) weakSelf = self;

    // Add a handler to respond to POST requests on any URL
    [_webServer addDefaultHandlerForMethod:@"POST"
                              requestClass:[GCDWebServerDataRequest class]
                              processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {
        GCDWebServerResponse *response;
        try {
            // perform all realm ops on the main thread
            __block NSData *responseData;
            dispatch_sync(dispatch_get_main_queue(), ^{
                RealmReact *self = weakSelf;
                if (self) {
                    std::lock_guard<std::mutex> lock(s_rpcMutex);
                    if (_rpcServer) {
                        realm_js::json args = realm_js::json::parse([[(GCDWebServerDataRequest *)request text] UTF8String]);
                        std::string responseText = _rpcServer->perform_request(request.path.UTF8String, args).dump();
                        responseData = [NSData dataWithBytes:responseText.c_str() length:responseText.length()];
                        return;
                    }
                }
                // we have been deallocated
                responseData = [NSData data];
            });
            response = [[GCDWebServerDataResponse alloc] initWithData:responseData contentType:@"application/json"];
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

    [_webServer startWithPort:8082 bonjourName:nil];
    return;
}

- (void)shutdownRPC {
    std::lock_guard<std::mutex> lock(s_rpcMutex);
    [_webServer stop];
    [_webServer removeAllHandlers];
    _webServer = nil;
    _rpcServer.reset();
}

- (void)dealloc {
    [self shutdownRPC];
}
#endif

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;
    
    Ivar executorIvar = class_getInstanceVariable([bridge class], "_javaScriptExecutor");
    id executor = object_getIvar(bridge, executorIvar);
    bool isDebugExecutor = [executor isMemberOfClass:NSClassFromString(@"RCTWebSocketExecutor")];

#if DEBUG
    if (s_currentRealmModule) {
        [s_currentRealmModule shutdownRPC];
    }

    s_currentRealmModule = self;
    if (isDebugExecutor) {
        [self startRPC];
        return;
    }
#endif

    if (isDebugExecutor) {
        @throw [NSException exceptionWithName:@"Invalid Executor" reason:@"Chrome debug mode not supported in Release builds" userInfo:nil];
    }

    [executor executeBlockOnJavaScriptQueue:^{
        JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(executor, true);
        RJSInitializeInContext(ctx);
    }];
}

@end
