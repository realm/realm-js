/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <objc/runtime.h>

#import "RealmJSTests.h"

@implementation RealmJSTests

+ (NSArray *)testSuitesFromDictionary:(NSDictionary *)testCaseNames {
    NSMutableArray *testSuites = [[NSMutableArray alloc] init];
    NSSet *specialNames = [NSSet setWithObjects:@"beforeEach", @"afterEach", nil];

    for (NSString *suiteName in testCaseNames) {
        XCTestSuite *testSuite = [[XCTestSuite alloc] initWithName:suiteName];
        Class testClass = objc_allocateClassPair(self, suiteName.UTF8String, 0);

        for (NSString *testName in testCaseNames[suiteName]) {
            if ([specialNames containsObject:testName]) {
                continue;
            }

            XCTestCase *testCase = [[testClass alloc] initWithTestName:testName];
            [testSuite addTest:testCase];
        }

        [testSuites addObject:testSuite];
    }

    return [testSuites copy];
}

- (instancetype)initWithTestName:(NSString *)name {
    return [super initWithSelector:NSSelectorFromString(name)];
}

- (void)setUp {
    [super setUp];

    [self invokeMethod:@"beforeEach"];
}

- (void)tearDown {
    [self invokeMethod:@"afterEach"];

    [super tearDown];
}

- (void)invokeTest {
    @autoreleasepool {
        [super invokeTest];
    }
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
    NSMethodSignature *sig = [super methodSignatureForSelector:aSelector];
    return sig ?: [NSMethodSignature signatureWithObjCTypes:"v@:"];
}

- (void)forwardInvocation:(NSInvocation *)anInvocation {
    [self invokeMethod:NSStringFromSelector(anInvocation.selector)];
}

- (void)invokeMethod:(NSString *)method {
    [self doesNotRecognizeSelector:_cmd];
}

@end
