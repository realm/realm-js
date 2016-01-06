/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "RealmJSTests.h"
#import "RCTJavaScriptExecutor.h"
#import "RCTBridge.h"
#import "RCTDevMenu.h"
#import "RCTEventDispatcher.h"

@import RealmReact;

extern void JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions(JSGlobalContextRef ctx, bool includesNativeCallStack);
extern NSMutableArray *RCTGetModuleClasses(void);

@interface RCTBridge ()
+ (instancetype)currentBridge;
- (void)setUp;
@end

@interface RealmReactTests : RealmJSTests
@end

@interface RealmReactChromeTests : RealmReactTests
@end

@implementation RealmReactTests

+ (void)load {
    NSMutableArray *moduleClasses = RCTGetModuleClasses();
    [moduleClasses removeObject:[RCTDevMenu class]];
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

+ (id<RCTJavaScriptExecutor>)currentExecutor {
    return [[self currentBridge] valueForKey:@"javaScriptExecutor"];
}

+ (XCTestSuite *)defaultTestSuite {
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

    NSDictionary *testCaseNames = [self waitForEvent:@"realm-test-names"];
    if (!testCaseNames.count) {
        NSLog(@"ERROR: No test names were provided by the JS");
        exit(1);
    }

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

+ (id)waitForEvent:(NSString *)eventName {
    __weak RealmReact *realmModule = [[self currentBridge] moduleForClass:[RealmReact class]];
    assert(realmModule);

    __block BOOL condition = NO;
    __block id result;
    __block RealmReactEventHandler handler;

    __block __weak RealmReactEventHandler weakHandler = handler = ^(id object) {
        [realmModule removeListenerForEvent:eventName handler:weakHandler];

        condition = YES;
        result = object;
    };

    [realmModule addListenerForEvent:eventName handler:handler];

    [self waitForCondition:&condition];
    return result;
}

- (void)invokeMethod:(NSString *)method {
    NSString *module = NSStringFromClass(self.class);
    NSString *suffix = [self.class classNameSuffix];

    if (suffix.length && [module hasSuffix:suffix]) {
        module = [module substringToIndex:(module.length - suffix.length)];
    }

    RCTBridge *bridge = [self.class currentBridge];
    [bridge.eventDispatcher sendAppEventWithName:@"realm-run-test" body:@{@"suite": module, @"name": method}];

    id error = [self.class waitForEvent:@"realm-test-finished"];
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
