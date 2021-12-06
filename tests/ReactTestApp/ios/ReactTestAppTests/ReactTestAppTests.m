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

#import <RealmJS/RealmReact.h>

#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <React/RCTJavaScriptExecutor.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTJavaScriptLoader.h>
#import <React/RCTReloadCommand.h>
#import "RealmTestEventEmitter.h"

#import "RealmJSTests.h"
#import "AppDelegate.h"


@interface RCTWebSocketExecutor : NSObject
@end

extern NSArray<Class> *RCTGetModuleClasses(void);

@interface RCTBridge ()
+ (instancetype)currentBridge;
- (void)setUp;
- (void *)runtime;
@end


static void sendAppEvent(NSString *name, id body, RCTBridge* bridge) {
    [[bridge moduleForClass:RealmTestEventEmitter.class]
     sendEventWithName:name body:body];
}

@interface RealmReactTests : RealmJSTests
@end

@implementation RealmReactTests

static void noOpIdSetter(id self, SEL sel, id value) { }

+ (void)load {
    RCTAddLogFunction(^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        NSAssert(level < RCTLogLevelError, RCTFormatLog(nil, level, fileName, lineNumber, message));
    });

    // Don't let RCTDevSettings override the executor class as we want to control it for the tests
    Class devSettings = objc_lookUpClass("RCTDevSettings");
    if (devSettings) {
        class_replaceMethod(devSettings, @selector(setExecutorClass:), (IMP)noOpIdSetter, "v@:@");
    }
}

+ (Class)executorClass {
    return nil;
}

+ (NSString *)classNameSuffix {
    return @"";
}

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];

    @autoreleasepool {
        static NSDictionary *testCaseNames;
        AppDelegate *delegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
        RCTBridge* bridge = [delegate sharedBridge];
        
        if (!testCaseNames) {
            RealmTestEventEmitter *eventEmitter = [bridge moduleForClass:RealmTestEventEmitter.class];
            [eventEmitter waitForLoad];
            [eventEmitter sendEventWithName:@"test-names" body:nil];
            testCaseNames = [self waitForEvent:@"realm-test-names"];
        }
        NSAssert(testCaseNames.count, @"No test names were provided by the JS");

        for (XCTestSuite *testSuite in [self testSuitesFromDictionary:testCaseNames]) {
            [suite addTest:testSuite];
        }

    }
    return suite;
}

+ (void)setUp {
    __weak AppDelegate *delegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    RCTBridge* bridge = [delegate sharedBridge];
    RealmTestEventEmitter *oldEmitter = [bridge moduleForClass:RealmTestEventEmitter.class];
    bridge.executorClass = self.executorClass;
    RCTTriggerReloadCommandListeners(@"RealmTest setup");

    // Wait for the bridge to reinitialize our module
    RealmTestEventEmitter *emitter;
    while (!(emitter = [bridge moduleForClass:RealmTestEventEmitter.class]) || emitter == oldEmitter) {
        [NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    }
    // Calling "waitForLoad" too early results in a timeout.
    [NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:5]];
    [emitter waitForLoad];
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
    NSDate *timeout = [NSDate dateWithTimeIntervalSinceNow:120.0];
    AppDelegate *delegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    RCTBridge* bridge = [delegate sharedBridge];

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
            sendAppEvent(@"dummy", nil, bridge); // Ensure RN has an event loop running
        }
    }
}

+ (id)waitForEvent:(NSString *)eventName {
    AppDelegate *delegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    RCTBridge* bridge = [delegate sharedBridge];
    __weak RealmReact *realmModule = [bridge moduleForClass:[RealmReact class]];
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
    AppDelegate *delegate = (AppDelegate*)[[UIApplication sharedApplication] delegate];
    RCTBridge* bridge = [delegate sharedBridge];

    if (suffix.length && [module hasSuffix:suffix]) {
        module = [module substringToIndex:(module.length - suffix.length)];
    }

    sendAppEvent(@"run-test", @{@"suite": module, @"name": method}, bridge);

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
