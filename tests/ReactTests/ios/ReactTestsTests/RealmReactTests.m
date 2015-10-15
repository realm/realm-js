/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RealmJSTests.h"
#import "Base/RCTJavaScriptExecutor.h"
#import "Base/RCTBridge.h"

@import RealmReact;

@interface RealmReactTests : RealmJSTests
@end


@implementation RealmReactTests

+ (NSURL *)scriptURL {
    return [[NSBundle bundleForClass:self] URLForResource:@"index" withExtension:@"js"];
}

- (void)invokeMethod:(NSString *)method {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        [self expectationForNotification:RCTJavaScriptDidLoadNotification object:nil handler:^(NSNotification *notification) {
            return YES;
        }];
        [self waitForExpectationsWithTimeout:10000000 handler:NULL];
    });

    dispatch_group_t group = dispatch_group_create();
    dispatch_group_enter(group);

    id<RCTJavaScriptExecutor> executor = [RealmReact executor];
    NSString *module = [NSString stringWithFormat:@"realm-tests/%@.js", NSStringFromClass(self.class)];

    [executor executeJSCall:module method:method arguments:@[] callback:^(id json, NSError *error) {
        XCTAssertNil(error, @"%@", [error description]);
        dispatch_group_leave(group);
    }];

    dispatch_group_wait(group, DISPATCH_TIME_FOREVER);
}

@end
