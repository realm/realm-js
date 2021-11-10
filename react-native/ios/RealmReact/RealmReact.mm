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

#import <realm-js-ios/jsi_init.h>

#import <React/RCTBridge+Private.h>
#import <jsi/jsi.h>

#import <objc/runtime.h>
#import <arpa/inet.h>
#import <ifaddrs.h>
#import <netdb.h>
#import <net/if.h>

// the part of the RCTCxxBridge private class we care about
@interface RCTBridge (Realm_RCTCxxBridge)
- (void *)runtime;
@end

@interface RealmReact () <RCTBridgeModule>
@end

@implementation RealmReact {
    NSMutableDictionary *_eventHandlers;
}

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(Realm)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

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
    return @{};
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

- (void)invalidate {
    realm_hermes_invalidate_caches();
}

- (void)dealloc {
    [self performSelectorOnMainThread:@selector(invalidate) withObject:nil waitUntilDone:YES];
}

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    static __weak RealmReact *s_currentModule = nil;
    [s_currentModule invalidate];
    s_currentModule = self;

    if (objc_lookUpClass("RCTWebSocketExecutor") && [bridge executorClass] == objc_lookUpClass("RCTWebSocketExecutor")) {
        @throw [NSException exceptionWithName:@"Invalid Executor" reason:@"Chrome debug mode not supported" userInfo:nil];
    } else if ([bridge isKindOfClass:objc_lookUpClass("RCTCxxBridge")] || [NSStringFromClass([bridge class]) isEqual: @"RCTCxxBridge"]) {
        __weak __typeof__(self) weakSelf = self;
        __weak __typeof__(bridge) weakBridge = bridge;

        [bridge dispatchBlock:^{
            __typeof__(self) self = weakSelf;
            __typeof__(bridge) bridge = weakBridge;
            if (!self || !bridge) {
                return;
            }

            // Make sure the previous JS thread is completely finished before continuing.
            static __weak NSThread *s_currentJSThread;
            while (s_currentJSThread && !s_currentJSThread.finished) {
                [NSThread sleepForTimeInterval:0.1];
            }
            s_currentJSThread = [NSThread currentThread];

            auto& rt = *static_cast<facebook::jsi::Runtime*>(bridge.runtime);
            auto exports = jsi::Object(rt);
            realm_jsi_init(rt, exports);
        } queue:RCTJSThread];
    }
}

@end