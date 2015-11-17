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
#import "shared_realm.hpp"

@interface RealmReact () {
    GCDWebServer *_webServer;
    std::unique_ptr<realm_js::RPCServer> _rpcServer;
}
@end
#endif

@interface RealmReact () <RCTBridgeModule> {
    __weak NSThread *_currentJSThread;
    __weak NSRunLoop *_currentJSRunLoop;
}
@end

static __weak RealmReact *s_currentRealmModule = nil;


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
    [_webServer stop];
    [_webServer removeAllHandlers];
    _webServer = nil;
    _rpcServer.reset();
}


#endif

- (void)shutdown {
#if DEBUG
    // shutdown rpc if in chrome debug mode
    [self shutdownRPC];
#endif

    // block until JS thread exits
    NSRunLoop *runLoop = _currentJSRunLoop;
    if (runLoop) {
        CFRunLoopStop([_currentJSRunLoop getCFRunLoop]);
        while (_currentJSThread && !_currentJSThread.finished) {
            [NSThread sleepForTimeInterval:0.01];
        }
    }

    realm::Realm::s_global_cache.clear();
}

- (void)dealloc {
    [self shutdown];
}

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    // shutdown the last instance of this module
    [s_currentRealmModule shutdown];
    s_currentRealmModule = self;

    Ivar executorIvar = class_getInstanceVariable([bridge class], "_javaScriptExecutor");
    id executor = object_getIvar(bridge, executorIvar);
    if ([executor isKindOfClass:NSClassFromString(@"RCTWebSocketExecutor")]) {
#if DEBUG
        [self startRPC];
#else
        @throw [NSException exceptionWithName:@"Invalid Executor" reason:@"Chrome debug mode not supported in Release builds" userInfo:nil];
#endif
    }
    else {
        __weak __typeof__(self) weakSelf = self;
        [executor executeBlockOnJavaScriptQueue:^{
            RealmReact *self = weakSelf;
            if (!self) {
                return;
            }
            self->_currentJSThread = [NSThread currentThread];
            self->_currentJSRunLoop = [NSRunLoop currentRunLoop];
            JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(executor, true);
            RJSInitializeInContext(ctx);
        }];
    }
}

@end
