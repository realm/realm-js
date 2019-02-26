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
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTJavaScriptLoader.h>

#import "RealmJSTests.h"

@interface RCTWebSocketExecutor : NSObject
@end

extern NSMutableArray *RCTGetModuleClasses(void);

@interface RCTBridge ()
+ (instancetype)currentBridge;
- (void)setUp;
- (void *)runtime;
@end

@interface RealmTestEventEmitter : RCTEventEmitter <RCTBridgeModule>
@end
@implementation RealmTestEventEmitter {
    dispatch_group_t _group;
}
RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (instancetype)init {
    if ((self = [super init])) {
        _group = dispatch_group_create();
        dispatch_group_enter(_group);
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"test-names", @"dummy", @"run-test"];
}

- (void)waitForLoad {
    if (dispatch_group_wait(_group, dispatch_time(DISPATCH_TIME_NOW, 60.0 * NSEC_PER_SEC))) {
        @throw [NSException exceptionWithName:@"ConditionTimeout"
                                       reason:[NSString stringWithFormat:@"Timed out waiting for script load"]
                                     userInfo:nil];
    }
}

- (void)startObserving {
    dispatch_group_leave(_group);
}

- (void)stopObserving {
    dispatch_group_enter(_group);
}
@end

static void sendAppEvent(NSString *name, id body) {
    [[RCTBridge.currentBridge moduleForClass:RealmTestEventEmitter.class]
     sendEventWithName:name body:body];
}

@interface RealmReactTests : RealmJSTests
@end

@interface RealmReactChromeTests : RealmReactTests
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
        if (!testCaseNames) {
            RealmTestEventEmitter *eventEmitter = [RCTBridge.currentBridge moduleForClass:RealmTestEventEmitter.class];
            [eventEmitter waitForLoad];
            [eventEmitter sendEventWithName:@"test-names" body:nil];
            testCaseNames = [self waitForEvent:@"realm-test-names"];
        }
        NSAssert(testCaseNames.count, @"No test names were provided by the JS");

        NSString *nameSuffix = [self classNameSuffix];
        NSDictionary *renamedTestCases = testCaseNames;
        if (nameSuffix.length) {
            NSMutableDictionary *renamedTestCaseNames = [[NSMutableDictionary alloc] init];
            for (NSString *name in testCaseNames) {
                renamedTestCaseNames[[name stringByAppendingString:nameSuffix]] = testCaseNames[name];
            }
            renamedTestCases = renamedTestCaseNames;
        }

        for (XCTestSuite *testSuite in [self testSuitesFromDictionary:renamedTestCases]) {
            [suite addTest:testSuite];
        }

    }
    return suite;
}

+ (void)setUp {
    [super setUp];

    RCTBridge *bridge = [RCTBridge currentBridge];
    RealmTestEventEmitter *oldEmitter = [bridge moduleForClass:RealmTestEventEmitter.class];
    bridge.executorClass = self.executorClass;
    [bridge reload];

    // Wait for the bridge to reinitialize our module
    RealmTestEventEmitter *emitter;
    while (!(emitter = [RCTBridge.currentBridge moduleForName:@"RealmTestEventEmitter" lazilyLoadIfNecessary:NO]) || emitter == oldEmitter) {
        [NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    }
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
    NSDate *timeout = [NSDate dateWithTimeIntervalSinceNow:60.0];

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
            sendAppEvent(@"dummy", nil); // Ensure RN has an event loop running
        }
    }
}

+ (id)waitForEvent:(NSString *)eventName {
    __weak RealmReact *realmModule = [RCTBridge.currentBridge moduleForClass:[RealmReact class]];
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

    sendAppEvent(@"run-test", @{@"suite": module, @"name": method});

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

#if RCT_DEV
@implementation RealmReactChromeTests

+ (Class)executorClass {
    return [RCTWebSocketExecutor class];
}

+ (NSString *)classNameSuffix {
    return @"_Chrome";
}

@end
#endif
