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

#import "RealmJSTests.h"
#import "Base/RCTJavaScriptExecutor.h"
#import "Base/RCTBridge.h"

@import RealmReact;

extern void JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions(JSGlobalContextRef ctx, bool includesNativeCallStack);

static id<RCTJavaScriptExecutor> s_currentJavaScriptExecutor;

@interface RealmReactTests : RealmJSTests
@end

@implementation RealmReactTests

+ (XCTestSuite *)defaultTestSuite {
    NSNotification *notification = [self waitForNotification:RCTJavaScriptDidLoadNotification];
    RCTBridge *bridge = notification.userInfo[@"bridge"];

    if (!bridge) {
        NSLog(@"No RCTBridge provided by RCTJavaScriptDidLoadNotification");
        exit(1);
    }

    // Wait for the RCTDevMenu to handle this notification and act upon it.
    [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

    s_currentJavaScriptExecutor = [bridge valueForKey:@"javaScriptExecutor"];

    // FIXME: Remove this nonsense once the crashes go away when a test fails!
    JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(s_currentJavaScriptExecutor, false);
    if (ctx) {
        JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions(ctx, false);
    }

    NSError *error;
    NSDictionary *testCaseNames = [self invokeMethod:@"getTestNames" inModule:@"index" error:&error];

    if (error || !testCaseNames.count) {
        NSLog(@"Error from calling getTestNames() - %@", error ?: @"None returned");
        exit(1);
    }

    XCTestSuite *suite = [super defaultTestSuite];

    for (XCTestSuite *testSuite in [self testSuitesFromDictionary:testCaseNames]) {
        [suite addTest:testSuite];
    }

    return suite;
}

+ (NSNotification *)waitForNotification:(NSString *)notificationName {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    __block BOOL condition = NO;
    __block NSNotification *notification;

    id token = [nc addObserverForName:notificationName object:nil queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification *note) {
        condition = YES;
        notification = note;
    }];

    [self waitForCondition:&condition];
    [nc removeObserver:token];

    return notification;
}

+ (void)waitForCondition:(BOOL *)condition {
    NSRunLoop *runLoop = [NSRunLoop currentRunLoop];

    while (!*condition) {
        @autoreleasepool {
            [runLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
        }
    }
}

+ (id)invokeMethod:(NSString *)method inModule:(NSString *)module error:(NSError * __strong *)outError {
    module = [NSString stringWithFormat:@"realm-tests/%@.js", module];

    __block BOOL condition = NO;
    __block id result;

    [s_currentJavaScriptExecutor executeJSCall:module method:method arguments:@[] callback:^(id json, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            condition = YES;
            result = json;

            if (error && outError) {
                *outError = error;
            }
        });
    }];

    [self waitForCondition:&condition];

    return result;
}

- (void)invokeMethod:(NSString *)method {
    NSError *error;
    [self.class invokeMethod:method inModule:NSStringFromClass(self.class) error:&error];

    if (error) {
        // TODO: Parse and use localizedFailureReason info once we can source map the failure location in JS.
        [self recordFailureWithDescription:error.localizedDescription inFile:@(__FILE__) atLine:__LINE__ expected:YES];
    }
}

@end
