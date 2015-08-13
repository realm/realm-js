/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import <objc/runtime.h>
#import "RealmReactModule.h"
#import "../node_modules/react-native/React/Base/RCTLog.h"
#import "../node_modules/react-native/React/Base/RCTBridge.h"

@import RealmJS;
@import JavaScriptCore;

@protocol RCTJavaScriptContext
@property (nonatomic, assign, readonly) JSGlobalContextRef ctx;
- (void)executeBlockOnJavaScriptQueue:(dispatch_block_t)block;
@end

RCT_EXTERN id<RCTJavaScriptExecutor> RCTGetLatestExecutor(void);

@implementation Realm

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

-(void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;

    id contextExecutor = RCTGetLatestExecutor();

    [contextExecutor executeBlockOnJavaScriptQueue:^{
        Ivar ivar = class_getInstanceVariable([contextExecutor class], "_context");
        id<RCTJavaScriptContext> rctJSContext = object_getIvar(contextExecutor, ivar);
        JSContextRef ctx = rctJSContext.ctx;

        [RealmJS initializeContext:ctx];
        RCTLogInfo(@"Realm initialized");
    }];
}

@end

