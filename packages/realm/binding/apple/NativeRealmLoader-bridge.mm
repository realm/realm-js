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

#import "NativeRealmLoader.h"

#import <jsi_init.h>
#import <flush_ui_queue_workaround.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTInvalidating.h>
#import <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

#import <objc/runtime.h>

// the part of the RCTCxxBridge private class we care about
@interface RCTBridge (Realm_RCTCxxBridge)
- (void *)runtime;
// Expose the CallInvoker so that we can call `invokeAsync`
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@interface NativeRealmLoader () <RCTBridgeModule, RCTInvalidating>
@end

@implementation NativeRealmLoader {
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
  if (self != [NativeRealmLoader class]) {
    return;
  }
}

- (instancetype)init {
  self = [super init];
  if (self) {
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

- (void)invalidate {
    realm::js::flush_ui_workaround::reset_js_call_invoker();
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

          realm::js::flush_ui_workaround::inject_js_call_invoker([bridge jsCallInvoker]);

          auto &rt = *static_cast<facebook::jsi::Runtime *>(bridge.runtime);
          auto exports = jsi::Object(rt);
          realm_jsi_init(rt, exports);
          // Exposing this via a global for the JS wrapper to read
          rt.global().setProperty(rt, "__injectedRealmBinding", exports);
        }
                queue:RCTJSThread];
  }
}

@end
