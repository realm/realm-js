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

#import "RealmJSTests.h"
#import "RJSModuleLoader.h"

#include "jsc_init.h"

@interface RealmJSCoreTests : RealmJSTests

@property (nonatomic, strong) JSValue *testObject;

@end

@implementation RealmJSCoreTests

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];

    // We need a JS context from a UIWebView so it has setTimeout, Promise, etc.
    UIWebView *webView = [[UIWebView alloc] init];
    JSContext *context = [webView valueForKeyPath:@"documentView.webView.mainFrame.javaScriptContext"];
    RJSModuleLoader *moduleLoader = [[RJSModuleLoader alloc] initWithContext:context];
    NSURL *realmURL = [[NSBundle bundleForClass:self] URLForResource:@"index" withExtension:@"js" subdirectory:@"lib"];
    NSURL *scriptURL = [[NSBundle bundleForClass:self] URLForResource:@"index" withExtension:@"js" subdirectory:@"js"];
    NSError *error;

    // The ES6 global Promise constructor was added in iOS 8.
    if (![context[@"Promise"] isObject]) {
        JSValue *promiseModule = [moduleLoader loadGlobalModule:@"es6-promise" relativeToURL:scriptURL error:&error];
        NSAssert(promiseModule, @"%@", error);

        context[@"Promise"] = promiseModule[@"Promise"];
    }

    context[@"global"] = [JSValue valueWithNewObjectInContext:context];

    // Create Realm constructor in the JS context.
    RJSInitializeInContext(context.JSGlobalContextRef);

    // Load the Realm module so additional functionality is exposed on Realm objects.
    JSValue *realmConstructor = [moduleLoader loadModuleFromURL:realmURL error:&error];
    NSAssert(realmConstructor, @"%@", error);

    // Expose the Realm constructor as a global 'realm' CommonJS module.
    [moduleLoader addGlobalModuleObject:realmConstructor forName:@"realm"];

    JSValue *testObject = [moduleLoader loadModuleFromURL:scriptURL error:&error];
    NSAssert(testObject, @"%@", error);

    NSDictionary *testCaseNames = [[testObject invokeMethod:@"getTestNames" withArguments:nil] toDictionary];
    NSAssert(testCaseNames.count, @"No test names were provided by the JS");

    for (XCTestSuite *testSuite in [self testSuitesFromDictionary:testCaseNames]) {
        for (RealmJSCoreTests *test in testSuite.tests) {
            test.testObject = testObject;
        }

        [suite addTest:testSuite];
    }
    
    return suite;
}

- (JSContext *)context {
    return self.testObject.context;
}

- (void)invokeMethod:(NSString *)method {
    JSValue *testObject = self.testObject;
    JSContext *context = testObject.context;
    context.exception = nil;

    JSValue *promise = [testObject invokeMethod:@"runTest" withArguments:@[NSStringFromClass(self.class), method]];

    if (context.exception) {
        [self recordException:context.exception];
        return;
    }

    if ([promise isObject]) {
        XCTestExpectation *expectation = [self expectationWithDescription:@"Promise resolved or rejected"];

        JSValue *onFulfilled = [JSValue valueWithObject:^() {
            [expectation fulfill];
        } inContext:context];

        JSValue *onRejected = [JSValue valueWithObject:^(JSValue *error) {
            [self recordException:error];
            [expectation fulfill];
        } inContext:context];

        [promise invokeMethod:@"then" withArguments:@[onFulfilled, onRejected]];

        [self waitForExpectationsWithTimeout:5.0 handler:NULL];
    }
}

- (void)recordException:(JSValue *)exception {
    JSValue *message = [exception hasProperty:@"message"] ? exception[@"message"] : exception;
    NSString *source = [exception hasProperty:@"sourceURL"] ? [exception[@"sourceURL"] toString] : nil;
    NSUInteger line = [exception hasProperty:@"line"] ? [exception[@"line"] toUInt32] - 1 : 0;
    NSURL *sourceURL = nil;

    if (source) {
        NSString *path = [NSString pathWithComponents:@[[@(__FILE__) stringByDeletingLastPathComponent], @"..", @"js", source.lastPathComponent]];
        sourceURL = [NSURL URLWithString:path];
    }

    [self recordFailureWithDescription:message.description
                                inFile:sourceURL ? sourceURL.absoluteString : @(__FILE__)
                                atLine:sourceURL ? line : __LINE__
                              expected:YES];
}

@end
