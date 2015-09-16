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
    [contextExecutor executeBlockOnJavaScriptQueue:^{
        Ivar ivar = class_getInstanceVariable([contextExecutor class], "_context");
        RCTJavaScriptContext *rctJSContext = object_getIvar(contextExecutor, ivar);
        JSGlobalContextRef ctx;
        if (rctJSContext) {
            ctx = rctJSContext.ctx;
        }
        else {
            ctx = JSGlobalContextCreate(NULL);
            object_setIvar(contextExecutor, ivar, [[RCTJavaScriptContext alloc] initWithJSContext:ctx]);
        }

        [RealmJS initializeContext:ctx];

        RCTLogInfo(@"Realm initialized");
    }];
}


@end

