/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "RealmJSTests.h"
#import "RJSModuleLoader.h"

#import <RealmJS/RealmJS.h>

@interface RealmJSCoreTests : RealmJSTests

@property (nonatomic, strong) JSValue *testObject;

@end

@implementation RealmJSCoreTests

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];
    JSContext *context = [[JSContext alloc] init];
    JSValue *realmConstructor = [JSValue valueWithJSValueRef:RJSConstructorCreate(context.JSGlobalContextRef) inContext:context];
    RJSModuleLoader *moduleLoader = [[RJSModuleLoader alloc] initWithContext:context];
    NSURL *scriptURL = [[NSBundle bundleForClass:self] URLForResource:@"index" withExtension:@"js" subdirectory:@"lib"];

    // Expose the Realm constructor as a global 'realm' CommonJS module.
    [moduleLoader addGlobalModuleObject:realmConstructor forName:@"realm"];

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
        NSURL *sourceURL = nil;

        if (source) {
            NSString *path = [NSString pathWithComponents:@[[@(__FILE__) stringByDeletingLastPathComponent], @"..", @"lib", source.lastPathComponent]];
            sourceURL = [NSURL URLWithString:path];
        }

        [self recordFailureWithDescription:message.description
                                    inFile:sourceURL ? sourceURL.absoluteString : @(__FILE__)
                                    atLine:sourceURL ? line : __LINE__
                                  expected:YES];
    }
}

@end
