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

#import <realm-js-ios/jsi_init.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTInvalidating.h>
#import <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

#import <arpa/inet.h>
#import <ifaddrs.h>
#import <net/if.h>
#import <netdb.h>
#import <objc/runtime.h>

// the part of the RCTCxxBridge private class we care about
@interface RCTBridge (Realm_RCTCxxBridge)
- (void *)runtime;
// Expose the CallInvoker so that we can call `invokeAsync`
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@interface RealmReact () <RCTBridgeModule, RCTInvalidating>
@end

@implementation RealmReact {
  NSMutableDictionary *_eventHandlers;
  // Keep track of whether we are already waiting for the React Native UI queue
  // to be flushed asynchronously
  bool waitingForUiFlush;
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
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _eventHandlers = [[NSMutableDictionary alloc] init];
    waitingForUiFlush = false;
  }
  return self;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (NSDictionary *)constantsToExport {
  return @{};
}

- (void)addListenerForEvent:(NSString *)eventName
                    handler:(RealmReactEventHandler)handler {
  NSMutableOrderedSet *handlers = _eventHandlers[eventName];
  if (!handlers) {
    handlers = _eventHandlers[eventName] = [[NSMutableOrderedSet alloc] init];
  }
  [handlers addObject:handler];
}

- (void)removeListenerForEvent:(NSString *)eventName
                       handler:(RealmReactEventHandler)handler {
  NSMutableOrderedSet *handlers = _eventHandlers[eventName];
  [handlers removeObject:handler];
}

RCT_REMAP_METHOD(emit, emitEvent
                 : (NSString *)eventName withObject
                 : (id)object) {
  for (RealmReactEventHandler handler in [_eventHandlers[eventName] copy]) {
    handler(object);
  }
}

- (void)invalidate {
#if DEBUG
  // Immediately close any open sync sessions to prevent race condition with new
  // JS thread when hot reloading
  realm_jsi_close_sync_sessions();
#endif

  realm_jsi_invalidate_caches();
}

- (void)dealloc {
  [self performSelectorOnMainThread:@selector(invalidate)
                         withObject:nil
                      waitUntilDone:YES];
}

- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;

  if (objc_lookUpClass("RCTWebSocketExecutor") &&
      [bridge executorClass] == objc_lookUpClass("RCTWebSocketExecutor")) {
    // Skip native initialization when in legacy Chrome debugging mode
#if !DEBUG
    @throw [NSException
        exceptionWithName:@"Invalid Executor"
                   reason:@"Chrome debug mode not supported in Release builds"
                 userInfo:nil];
#endif
  } else if ([bridge isKindOfClass:objc_lookUpClass("RCTCxxBridge")] ||
             [NSStringFromClass([bridge class]) isEqual:@"RCTCxxBridge"]) {
    __weak __typeof__(self) weakSelf = self;
    __weak __typeof__(bridge) weakBridge = bridge;

    [bridge
        dispatchBlock:^{
          __typeof__(self) self = weakSelf;
          __typeof__(bridge) bridge = weakBridge;
          if (!self || !bridge) {
            return;
          }

          // Make sure the previous JS thread is completely finished before
          // continuing.
          static __weak NSThread *s_currentJSThread;
          while (s_currentJSThread && !s_currentJSThread.finished) {
            [NSThread sleepForTimeInterval:0.1];
          }
          s_currentJSThread = [NSThread currentThread];

          auto &rt = *static_cast<facebook::jsi::Runtime *>(bridge.runtime);
          auto exports = jsi::Object(rt);
          realm_jsi_init(rt, exports, ^{
            // Calling jsCallInvokver->invokeAsync tells React Native to execute the lambda passed
            // in on the JS thread, and then flush the internal "microtask queue", which has the
            // effect of flushing any pending UI updates.
            //
            // We call this after we have called into JS from C++, in order to ensure that the RN
            // UI updates in response to any changes from Realm. We need to do this as we bypass
            // the usual RN bridge mechanism for communicating between C++ and JS, so without doing
            // this RN has no way to know that a change has occurred which might require an update
            // (see #4389, facebook/react-native#33006).
            //
            // Calls are debounced using the waitingForUiFlush flag, so if an async flush is already
            // pending when another JS to C++ call happens, we don't call invokeAsync again. This works
            // because the work is performed before the microtask queue is flushed - see sequence
            // diagram at https://bit.ly/3kexhHm. It might be possible to further optimize this,
            // e.g. only flush the queue a maximum of once per frame, but this seems reasonable.
            if (!waitingForUiFlush) {
              waitingForUiFlush = true;
              [bridge jsCallInvoker]->invokeAsync(
                  [&]() { waitingForUiFlush = false; });
            }
          });
        }
                queue:RCTJSThread];
  }
}

@end
