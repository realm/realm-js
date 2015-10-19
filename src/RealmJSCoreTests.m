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
#import "RJSModuleLoader.h"

@interface RealmJSCoreTests : RealmJSTests

@property (nonatomic, strong) JSValue *testObject;

@end

@implementation RealmJSCoreTests

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];
    JSContext *context = [[JSContext alloc] init];
    RJSModuleLoader *moduleLoader = [[RJSModuleLoader alloc] initWithContext:context];
    NSURL *scriptURL = [[NSBundle bundleForClass:self] URLForResource:@"index" withExtension:@"js"];

    [RealmJS initializeContext:context.JSGlobalContextRef];

    // Expose the global Realm object as a global 'realm' CommonJS module.
    [moduleLoader addGlobalModuleObject:context[@"Realm"] forName:@"realm"];

    NSError *error;
    JSValue *testObjects = [moduleLoader loadModuleFromURL:scriptURL error:&error];

    if (!testObjects) {
        NSLog(@"%@", error);
        exit(1);
    }

    NSDictionary *testCaseNames = [[testObjects invokeMethod:@"getTestNames" withArguments:nil] toDictionary];

    if (!testCaseNames.count) {
        NSLog(@"No test case names from getTestNames() JS method!");
        exit(1);
    }

    for (XCTestSuite *testSuite in [self testSuitesFromDictionary:testCaseNames]) {
        for (RealmJSCoreTests *test in testSuite.tests) {
            test.testObject = testObjects[testSuite.name];
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
