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

#import <React/RCTLog.h>
#import <React/RCTRootView.h>

#import <RealmReact/RealmReact.h>

#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <React/RCTJavaScriptExecutor.h>
#import <React/RCTBridge.h>
#import <React/RCTDevMenu.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTJavaScriptLoader.h>

#import "RealmJSTests.h"

extern void JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions(JSGlobalContextRef ctx, bool includesNativeCallStack);
extern NSMutableArray *RCTGetModuleClasses(void);

@interface RCTBridge ()
+ (instancetype)currentBridge;
- (void)setUp;
@end

@interface RCTDevMenuDisabler : RCTDevMenu
@end

@interface RealmReactTests : RealmJSTests
@end

@interface RealmReactChromeTests : RealmReactTests
@end


@implementation RCTDevMenuDisabler

+ (void)load {
    // +[RCTDevMenu load] is guaranteed to have been called since it's the superclass.
    // We remove it since it interferes with us fully controlling the executor class.
    NSMutableArray *moduleClasses = RCTGetModuleClasses();
    [moduleClasses removeObject:[RCTDevMenu class]];
}

@end


@implementation RealmReactTests

+ (void)load {
    RCTAddLogFunction(^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        NSAssert(level < RCTLogLevelError, RCTFormatLog(nil, level, fileName, lineNumber, message));
    });
}

+ (Class)executorClass {
    return NSClassFromString(@"RCTJSCExecutor");
}

+ (NSString *)classNameSuffix {
    return @"";
}

+ (RCTBridge *)currentBridge {
    Class executorClass = [self executorClass];
    if (!executorClass) {
        return nil;
    }

    @autoreleasepool {
        RCTBridge *bridge = [RCTBridge currentBridge];

        if (!bridge.valid) {
            [self waitForNotification:RCTJavaScriptDidLoadNotification];
            bridge = [RCTBridge currentBridge];
        }

        if (bridge.executorClass != executorClass) {
            bridge.executorClass = executorClass;

            RCTBridge *parentBridge = [bridge valueForKey:@"parentBridge"];
            [parentBridge invalidate];
            [parentBridge setUp];

            return [self currentBridge];
        }

        return bridge;
    }
}

+ (id<RCTJavaScriptExecutor>)currentExecutor {
    return [[self currentBridge] valueForKey:@"javaScriptExecutor"];
}

+ (XCTestSuite *)defaultTestSuite {
    @autoreleasepool {
        XCTestSuite *suite = [super defaultTestSuite];
        id<RCTJavaScriptExecutor> executor = [self currentExecutor];

        // The executor may be nil if the executorClass was not found (i.e. release build).
        if (!executor) {
            return suite;
        }

        // FIXME: Remove this nonsense once the crashes go away when a test fails!
        JSGlobalContextRef ctx = RealmReactGetJSGlobalContextForExecutor(executor, false);
        if (ctx) {
            JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions(ctx, false);
        }

        [self.currentBridge.eventDispatcher sendAppEventWithName:@"realm-test-names" body:nil];
        NSDictionary *testCaseNames = [self waitForEvent:@"realm-test-names"];
        NSAssert(testCaseNames.count, @"No test names were provided by the JS");

        NSString *nameSuffix = [self classNameSuffix];
        if (nameSuffix.length) {
            NSMutableDictionary *renamedTestCaseNames = [[NSMutableDictionary alloc] init];
            for (NSString *name in testCaseNames) {
                renamedTestCaseNames[[name stringByAppendingString:nameSuffix]] = testCaseNames[name];
            }
            testCaseNames = renamedTestCaseNames;
        }

        for (XCTestSuite *testSuite in [self testSuitesFromDictionary:testCaseNames]) {
            [suite addTest:testSuite];
        }

        return suite;
    }
}

+ (NSNotification *)waitForNotification:(NSString *)notificationName {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    __block BOOL condition = NO;
    __block NSNotification *notification;

    id token = [nc addObserverForName:notificationName object:nil queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification *note) {
        condition = YES;
        notification = note;
    }];

    @try {
        [self waitForCondition:&condition description:notificationName];
    } @finally {
        [nc removeObserver:token];
    }

    return notification;
}

+ (void)waitForCondition:(BOOL *)condition description:(NSString *)description {
    NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
    NSDate *timeout = [NSDate dateWithTimeIntervalSinceNow:30.0];
    RCTBridge *bridge = [self currentBridge];

    while (!*condition) {
        if ([timeout timeIntervalSinceNow] < 0) {
            @throw [NSException exceptionWithName:@"ConditionTimeout"
                                           reason:[NSString stringWithFormat:@"Timed out waiting for: %@", description]
                                         userInfo:nil];
        }

        @autoreleasepool {
            [runLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
            [runLoop runMode:NSRunLoopCommonModes beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
            [NSThread sleepForTimeInterval:0.01];  // Bad things may happen without some sleep.
            [bridge.eventDispatcher sendAppEventWithName:@"realm-dummy" body:nil]; // Ensure RN has an event loop running
        }
    }
}

+ (id)waitForEvent:(NSString *)eventName {
    __weak RealmReact *realmModule = [[self currentBridge] moduleForClass:[RealmReact class]];
    NSAssert(realmModule, @"RealmReact module not found");

    __block BOOL condition = NO;
    __block id result;
    __block RealmReactEventHandler handler;

    __block __weak RealmReactEventHandler weakHandler = handler = ^(id object) {
        [realmModule removeListenerForEvent:eventName handler:weakHandler];

        condition = YES;
        result = object;
    };

    [realmModule addListenerForEvent:eventName handler:handler];

    [self waitForCondition:&condition description:eventName];
    return result;
}

- (void)invokeTest {
    RCTLogFunction logFunction = RCTGetLogFunction();

    // Fail when React Native logs an error.
    RCTSetLogFunction(^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        RCTDefaultLogFunction(level, source, fileName, lineNumber, message);

        if (level >= RCTLogLevelError) {
            NSString *type = (source == RCTLogSourceJavaScript) ? @"JS" : @"Native";
            XCTFail(@"%@ Error: %@", type, RCTFormatLog(nil, level, fileName, lineNumber, message));
        }
    });

    [super invokeTest];

    RCTSetLogFunction(logFunction);
}

- (void)invokeMethod:(NSString *)method {
    NSString *module = NSStringFromClass(self.class);
    NSString *suffix = [self.class classNameSuffix];

    if (suffix.length && [module hasSuffix:suffix]) {
        module = [module substringToIndex:(module.length - suffix.length)];
    }

    RCTBridge *bridge = [self.class currentBridge];
    [bridge.eventDispatcher sendAppEventWithName:@"realm-run-test" body:@{@"suite": module, @"name": method}];

    id error;
    @try {
        error = [self.class waitForEvent:@"realm-test-finished"];
    } @catch (id exception) {
        error = exception;
    }

    if (error) {
        [self recordFailureWithDescription:[error description] inFile:@(__FILE__) atLine:__LINE__ expected:YES];
    }
}

@end


@implementation RealmReactChromeTests

+ (Class)executorClass {
    return NSClassFromString(@"RCTWebSocketExecutor");
}

+ (NSString *)classNameSuffix {
    return @"_Chrome";
}

@end
