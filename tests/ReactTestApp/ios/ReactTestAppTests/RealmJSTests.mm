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

#import <objc/runtime.h>

#import "RealmJSTests.h"

@implementation RealmJSTests

+ (NSArray *)testSuitesFromDictionary:(NSDictionary *)testCaseNames {
    NSMutableArray *testSuites = [[NSMutableArray alloc] init];
    NSSet *specialNames = [NSSet setWithObjects:@"beforeEach", @"afterEach", nil];

    for (NSString *suiteName in testCaseNames) {
        XCTestSuite *testSuite = [[XCTestSuite alloc] initWithName:suiteName];
        Class testClass = objc_allocateClassPair(self, suiteName.UTF8String, 0);
        objc_registerClassPair(testClass);
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
