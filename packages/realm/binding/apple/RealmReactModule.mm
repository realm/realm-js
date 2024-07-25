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

#import "RealmReactModule.h"

#import <React/RCTBridge+Private.h>
#import <React/RCTInvalidating.h>
#import <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

#import <arpa/inet.h>
#import <ifaddrs.h>
#import <net/if.h>
#import <netdb.h>
#import <objc/runtime.h>

#import "jsi/jsi_init.h"
#import "jsi/react_scheduler.h"

// the part of the RCTCxxBridge private class we care about
@interface RCTBridge (Realm_RCTCxxBridge)
- (void *)runtime;
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@implementation RealmReactModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(Realm)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (void)invalidate {
    // Reset the scheduler to prevent invocations using an old runtime
    realm::js::react_scheduler::reset_scheduler();
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

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(injectModuleIntoJSGlobal) {
  RCTBridge* bridge = [RCTBridge currentBridge];
  auto &rt = *static_cast<facebook::jsi::Runtime *>(bridge.runtime);

  // Create a scheduler wrapping the call invoker and pass this to realm core
  realm::js::react_scheduler::create_scheduler([bridge jsCallInvoker]);

  auto exports = jsi::Object(rt);
  realm_jsi_init(rt, exports);
  // Exposing this via a global for the JS wrapper to read
  rt.global().setProperty(rt, "__injectedRealmBinding", exports);

  return @true;
}

@end
