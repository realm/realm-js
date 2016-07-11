////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#import "RealmReact.h"
#import "RealmAnalytics.h"
#import "RCTBridge.h"

#import "jsc_init.h"
#import "shared_realm.hpp"
#import "realm_coordinator.hpp"

#import <arpa/inet.h>
#import <ifaddrs.h>
#import <netdb.h>
#import <net/if.h>

#if DEBUG
#import "GCDWebServer.h"
#import "GCDWebServerDataRequest.h"
#import "GCDWebServerDataResponse.h"
#import "GCDWebServerErrorResponse.h"
#import "rpc.hpp"

#define WEB_SERVER_PORT 8082

using namespace realm::rpc;
#endif

@interface NSObject ()
- (instancetype)initWithJSContext:(JSContext *)context;
- (instancetype)initWithJSContext:(JSContext *)context onThread:(NSThread *)thread;
- (JSGlobalContextRef)ctx;
@end

extern "C" JSGlobalContextRef RealmReactGetJSGlobalContextForExecutor(id executor, bool create) {
    Ivar contextIvar = class_getInstanceVariable([executor class], "_context");
    if (!contextIvar) {
        return NULL;
    }

    id rctJSContext = object_getIvar(executor, contextIvar);
    if (!rctJSContext && create) {
        Class RCTJavaScriptContext = NSClassFromString(@"RCTJavaScriptContext");

        NSMethodSignature *signature = [RCTJavaScriptContext instanceMethodSignatureForSelector:@selector(initWithJSContext:onThread:)];
        if (signature) {
            // for RN 0.28.0+
            rctJSContext = [executor context];
        }
        else {
            // for RN < 0.28.0
            NSMethodSignature *oldSignature = [RCTJavaScriptContext instanceMethodSignatureForSelector:@selector(initWithJSContext:)];
            assert(oldSignature);

            rctJSContext = [[RCTJavaScriptContext alloc] initWithJSContext:[[JSContext alloc] init]];
            object_setIvar(executor, contextIvar, rctJSContext);
        }

    }

    return [rctJSContext ctx];
}

@interface RealmReact () <RCTBridgeModule>
@end

@implementation RealmReact {
    NSMutableDictionary *_eventHandlers;

#if DEBUG
    GCDWebServer *_webServer;
    std::unique_ptr<RPCServer> _rpcServer;
#endif
}

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(Realm)

+ (void)initialize {
    if (self != [RealmReact class]) {
        return;
    }

    RLMSendAnalytics();
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _eventHandlers = [[NSMutableDictionary alloc] init];
    }
    return self;
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

- (NSDictionary *)constantsToExport {
#if DEBUG
#if TARGET_IPHONE_SIMULATOR
    NSArray *hosts = @[@"localhost"];
#else
    NSArray *hosts = [self getIPAddresses];
#endif

    return @{
        @"debugHosts": hosts,
        @"debugPort": @(WEB_SERVER_PORT),
    };
#else
    return @{};
#endif
}

- (void)addListenerForEvent:(NSString *)eventName handler:(RealmReactEventHandler)handler {
    NSMutableOrderedSet *handlers = _eventHandlers[eventName];
    if (!handlers) {
        handlers = _eventHandlers[eventName] = [[NSMutableOrderedSet alloc] init];
    }
    [handlers addObject:handler];
}

- (void)removeListenerForEvent:(NSString *)eventName handler:(RealmReactEventHandler)handler {
    NSMutableOrderedSet *handlers = _eventHandlers[eventName];
    [handlers removeObject:handler];
}

RCT_REMAP_METHOD(emit, emitEvent:(NSString *)eventName withObject:(id)object) {
    for (RealmReactEventHandler handler in [_eventHandlers[eventName] copy]) {
        handler(object);
    }
}

#if DEBUG
- (NSArray *)getIPAddresses {
    static const char * const wifiInterface = "en0";

    struct ifaddrs *ifaddrs;
    if (getifaddrs(&ifaddrs)) {
        NSLog(@"Failed to get interface addresses: %s", strerror(errno));
        return @[];
    }

    NSMutableArray *ipAddresses = [[NSMutableArray alloc] init];
    char host[INET6_ADDRSTRLEN];

    for (struct ifaddrs *ifaddr = ifaddrs; ifaddr; ifaddr = ifaddr->ifa_next) {
        if ((ifaddr->ifa_flags & IFF_LOOPBACK) || !(ifaddr->ifa_flags & IFF_UP)) {
            // Ignore loopbacks and interfaces that aren't up.
            continue;
        }

        struct sockaddr *addr = ifaddr->ifa_addr;
        if (addr->sa_family == AF_INET) {
            // Ignore link-local ipv4 addresses.
            in_addr_t sin_addr = ((struct sockaddr_in *)addr)->sin_addr.s_addr;
            if (IN_LOOPBACK(sin_addr) || IN_LINKLOCAL(sin_addr) || IN_ZERONET(sin_addr)) {
                continue;
            }
        }
        else if (addr->sa_family == AF_INET6) {
            // Ignore link-local ipv6 addresses.
            struct in6_addr *sin6_addr = &((struct sockaddr_in6 *)addr)->sin6_addr;
            if (IN6_IS_ADDR_LOOPBACK(sin6_addr) || IN6_IS_ADDR_LINKLOCAL(sin6_addr) || IN6_IS_ADDR_UNSPECIFIED(sin6_addr)) {
                continue;
            }
        }
        else {
            // Ignore addresses that are not ipv4 or ipv6.
            continue;
        }

        if (strcmp(ifaddr->ifa_name, wifiInterface)) {
            // Ignore non-wifi addresses.
            continue;
        }
        if (int error = getnameinfo(addr, addr->sa_len, host, sizeof(host), NULL, 0, NI_NUMERICHOST)) {
            NSLog(@"Couldn't resolve host name for address: %s", gai_strerror(error));
            continue;
        }

        [ipAddresses addObject:@(host)];
    }
    
    freeifaddrs(ifaddrs);
    return [ipAddresses copy];
}

- (void)startRPC {
    [GCDWebServer setLogLevel:3];
    _webServer = [[GCDWebServer alloc] init];
    _rpcServer = std::make_unique<RPCServer>();
    __weak __typeof__(self) weakSelf = self;

    // Add a handler to respond to POST requests on any URL
    [_webServer addDefaultHandlerForMethod:@"POST"
                              requestClass:[GCDWebServerDataRequest class]
                              processBlock:^GCDWebServerResponse *(GCDWebServerRequest* request) {
        __typeof__(self) self = weakSelf;
        RPCServer *rpcServer = self ? self->_rpcServer.get() : nullptr;
        GCDWebServerResponse *response;

        try {
            NSData *responseData;

            if (rpcServer) {
                json args = json::parse([[(GCDWebServerDataRequest *)request text] UTF8String]);
                std::string responseText = rpcServer->perform_request(request.path.UTF8String, args).dump();

                responseData = [NSData dataWithBytes:responseText.c_str() length:responseText.length()];
            }
            else {
                // we have been deallocated
                responseData = [NSData data];
            }

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

    [_webServer startWithPort:WEB_SERVER_PORT bonjourName:nil];
    return;
}

- (void)shutdownRPC {
    [_webServer stop];
    [_webServer removeAllHandlers];
    _webServer = nil;
    _rpcServer.reset();
}
#endif

- (void)invalidate {
#if DEBUG
    // shutdown rpc if in chrome debug mode
    [self shutdownRPC];
#endif
}

- (void)dealloc {
    [self performSelectorOnMainThread:@selector(invalidate) withObject:nil waitUntilDone:YES];
}

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    static __weak RealmReact *s_currentModule = nil;
    [s_currentModule invalidate];
    s_currentModule = self;

    id<RCTJavaScriptExecutor> executor = [bridge valueForKey:@"javaScriptExecutor"];

    if ([executor isKindOfClass:NSClassFromString(@"RCTWebSocketExecutor")]) {
#if DEBUG
        [self startRPC];
#else
        @throw [NSException exceptionWithName:@"Invalid Executor" reason:@"Chrome debug mode not supported in Release builds" userInfo:nil];
#endif
    }
    else {
        __weak __typeof__(self) weakSelf = self;
        __weak __typeof__(executor) weakExecutor = executor;

        [executor executeBlockOnJavaScriptQueue:^{
            __typeof__(self) self = weakSelf;
            __typeof__(executor) executor = weakExecutor;
            if (!self || !executor) {
                return;
            }

            // Make sure the previous JS thread is completely finished before continuing.
            static __weak NSThread *s_currentJSThread;
            while (s_currentJSThread && !s_currentJSThread.finished) {
                [NSThread sleepForTimeInterval:0.1];
            }
            s_currentJSThread = [NSThread currentThread];

            // Close all cached Realms from the previous JS thread.
            realm::_impl::RealmCoordinator::clear_all_caches();

            JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(executor, true);
            RJSInitializeInContext(ctx);
        }];
    }
}

@end
