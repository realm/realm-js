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

#import "RealmJSTests.h"
#import "RJSModuleLoader.h"

@interface RealmJSTests ()

@property (nonatomic, strong) JSValue *testObject;

@end

@implementation RealmJSTests

- (instancetype)initWithJSTestObject:(JSValue *)testObject methodName:(NSString *)methodName {
    self = [super initWithSelector:NSSelectorFromString(methodName)];
    if (!self) {
        return nil;
    }

    _testObject = testObject;

    return self;
}

- (JSContext *)context {
    return self.testObject.context;
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

+ (NSURL *)scriptURL {
    return nil;
}

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];
    JSContext *context = [[JSContext alloc] init];
    RJSModuleLoader *moduleLoader = [[RJSModuleLoader alloc] initWithContext:context];

    [RealmJS initializeContext:context.JSGlobalContextRef];

    // Expose the global Realm object as a global 'realm' CommonJS module.
    [moduleLoader addGlobalModuleObject:context[@"Realm"] forName:@"realm"];

    NSError *error;

    NSURL *scriptURL = [self scriptURL];
    if (!scriptURL) {
        return suite;
    }

    JSValue *testObjects = [moduleLoader loadModuleFromURL:scriptURL error:&error];
    if (!testObjects) {
        NSLog(@"index.js - %@", error);
        exit(1);
    }

    NSSet *specialMethodNames = [NSSet setWithObjects:@"beforeEach", @"afterEach", nil];

    for (NSString *testName in [testObjects toDictionary]) {
        JSValue *testObject = testObjects[testName];
        XCTestSuite *testSuite = [[XCTestSuite alloc] initWithName:testName];
        Class testClass = objc_allocateClassPair(self, testName.UTF8String, 0);

        for (NSString *methodName in [testObject toDictionary]) {
            if ([specialMethodNames containsObject:methodName]) {
                continue;
            }

            JSObjectRef jsMethod = JSValueToObject(context.JSGlobalContextRef, [testObject[methodName] JSValueRef], NULL);

            if (jsMethod && JSObjectIsFunction(context.JSGlobalContextRef, jsMethod)) {
                XCTestCase *testCase = [[testClass alloc] initWithJSTestObject:testObject methodName:methodName];
                [testSuite addTest:testCase];
            }
        }

        [suite addTest:testSuite];
    }

    return suite;
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
    NSMethodSignature *sig = [super methodSignatureForSelector:aSelector];
    return sig ?: [NSMethodSignature signatureWithObjCTypes:"v@:"];
}

- (void)forwardInvocation:(NSInvocation *)anInvocation {
    [self invokeMethod:NSStringFromSelector(anInvocation.selector)];
}

- (void)invokeMethod:(NSString *)method {
    JSValue *testObject = self.testObject;

    if (![testObject hasProperty:method]) {
        return;
    }

    JSContext *context = testObject.context;
    context.exception = nil;

    [testObject invokeMethod:method withArguments:nil];

    JSValue *exception = context.exception;
    if (exception) {
        JSValue *message = [exception hasProperty:@"message"] ? exception[@"message"] : exception;
        NSString *source = [exception hasProperty:@"sourceURL"] ? [exception[@"sourceURL"] toString] : nil;
        NSUInteger line = [exception hasProperty:@"line"] ? [exception[@"line"] toUInt32] - 1 : 0;
        NSURL *sourceURL = source ? [NSURL URLWithString:source.lastPathComponent relativeToURL:[NSURL URLWithString:@(__FILE__)]] : nil;

        [self recordFailureWithDescription:message.description
                                    inFile:sourceURL ? sourceURL.absoluteString : @(__FILE__)
                                    atLine:sourceURL ? line : __LINE__
                                  expected:YES];
    }
}

@end
