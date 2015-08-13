//
//  RealmJSTests.m
//  RealmJSTests
//
//  Created by Ari Lazier on 4/23/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RealmJSTests.h"
#import "RJSUtil.hpp"
#import "RJSRealm.hpp"

NSString *RealmPathForFile(NSString *fileName) {
#if TARGET_OS_IPHONE
    NSString *path = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
#else
    NSString *path = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];
    path = [path stringByAppendingPathComponent:[[[NSBundle mainBundle] executablePath] lastPathComponent]];
#endif
    return [path stringByAppendingPathComponent:fileName];
}

static NSString *s_testPrefix;

NSString *TestRealmPath() {
    return RealmPathForFile([s_testPrefix stringByAppendingPathComponent:@"test.realm"]);
}

static void DeleteOrThrow(NSString *path) {
    NSError *error;
    if (![[NSFileManager defaultManager] removeItemAtPath:path error:&error]) {
        if (error.code != NSFileNoSuchFileError) {
            @throw [NSException exceptionWithName:@"RLMTestException"
                                           reason:[@"Unable to delete realm: " stringByAppendingString:error.description]
                                         userInfo:nil];
        }
    }
}

static void DeleteRealmFilesAtPath(NSString *path) {
    DeleteOrThrow(path);
    DeleteOrThrow([path stringByAppendingString:@".lock"]);
    DeleteOrThrow([path stringByAppendingString:@".note"]);
}

static JSClassRef s_globalClass;

@implementation RealmJSTests {
    NSString *_jsTestSuite;
}

+ (void)initialize {
    JSClassDefinition globalDefinition = kJSClassDefinitionEmpty;
    globalDefinition.attributes = kJSClassAttributeNoAutomaticPrototype;
    s_globalClass = JSClassCreate(&globalDefinition);
}

- (void)setUp {
    [super setUp];

    s_testPrefix = [[NSUUID UUID] UUIDString];
    NSString *defaultDir = RealmPathForFile(s_testPrefix);
    [[NSFileManager defaultManager] createDirectoryAtPath:defaultDir withIntermediateDirectories:YES attributes:nil error:nil];
    RJSSetDefaultPath([defaultDir stringByAppendingPathComponent:@"default.realm"].UTF8String);

    _ctx = JSGlobalContextCreateInGroup(NULL, s_globalClass);
    [RealmJS initializeContext:_ctx];
}

- (void)tearDown {
    JSGlobalContextRelease(_ctx);

    DeleteRealmFilesAtPath(TestRealmPath());
    DeleteRealmFilesAtPath(@(RJSDefaultPath().c_str()));
    
    [super tearDown];
}

- (void)invokeTest {
    @autoreleasepool {
        [super invokeTest];
    }
}

- (JSContext *)context {
    return [JSContext contextWithJSGlobalContextRef:_ctx];
}

- (JSValueRef)performScript:(NSString *)script exception:(JSValueRef *)exception {
    *exception = NULL;
    JSStringRef jsScript = JSStringCreateWithUTF8CString(script.UTF8String);
    JSValueRef result = JSEvaluateScript(_ctx, jsScript, NULL, NULL, 0, exception);
    JSStringRelease(jsScript);
    return result;
}

- (void)performTestScript:(NSString *)script {
    JSValueRef e = NULL;
    JSStringRef jsScript = JSStringCreateWithUTF8CString(script.UTF8String);
    JSEvaluateScript(_ctx, jsScript, NULL, NULL, 0, &e);
    JSStringRelease(jsScript);

    XCTAssertFalse(e, @"%@", [JSValue valueWithJSValueRef:e inContext:self.context]);
}

+ (NSString *)jsSuiteName {
    return nil;
}

+ (NSString *)jsSuiteScript {
    NSString *testFile = [self jsSuiteName];
    if (!testFile) {
        return NULL;
    }

    testFile = [[NSBundle bundleForClass:self] pathForResource:testFile ofType:@"js"];
    assert(testFile);

    NSString *script = [NSString stringWithContentsOfFile:testFile encoding:NSUTF8StringEncoding error:nil];
    if (!script) {
        NSLog(@"Test file '%@' does not exist", testFile);
        exit(1);
    }
    return script;
}

+ (NSString *)loadScript:(NSString *)name {
    NSString *testFile = [[NSBundle bundleForClass:self] pathForResource:name ofType:@"js"];
    NSString *script = [NSString stringWithContentsOfFile:testFile encoding:NSUTF8StringEncoding error:nil];
    if (!script) {
        NSLog(@"Test objects file '%@' does not exist", testFile);
        exit(1);
    }
    return script;
}

+(XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];

    NSString *script = [self jsSuiteScript];
    if (!script) {
        return suite;
    }

    JSGlobalContextRef context = JSGlobalContextCreate(NULL);
    JSContext *jsContext = [JSContext contextWithJSGlobalContextRef:context];
    JSValueRef e = NULL;

    JSStringRef jsScript = JSStringCreateWithUTF8CString(script.UTF8String);
    JSEvaluateScript(context, jsScript, NULL, NULL, 0, &e);
    JSStringRelease(jsScript);
    if (e) {
        NSLog(@"%@", [JSValue valueWithJSValueRef:e inContext:jsContext]);
        exit(1);
    }

    script = [[self jsSuiteName] stringByAppendingString:@";"];
    jsScript = JSStringCreateWithUTF8CString(script.UTF8String);
    JSValueRef suiteObjectValue = JSEvaluateScript(context, jsScript, NULL, NULL, 0, &e);
    JSStringRelease(jsScript);
    if (e) {
        NSLog(@"%@", [JSValue valueWithJSValueRef:e inContext:jsContext]);
        exit(1);
    }

    JSObjectRef suiteObject = JSValueToObject(context, suiteObjectValue, &e);
    if (e) {
        NSLog(@"%@", [JSValue valueWithJSValueRef:e inContext:jsContext]);
        exit(1);
    }

    JSPropertyNameArrayRef testNames = JSObjectCopyPropertyNames(context, suiteObject);
    size_t count = JSPropertyNameArrayGetCount(testNames);
    for (size_t i = 0; i < count; i++) {
        JSStringRef jsName = JSPropertyNameArrayGetNameAtIndex(testNames, i);
        [suite addTest:[self testCaseWithSelector:NSSelectorFromString(@(RJSStringForJSString(jsName).c_str()))]];
    }
    JSPropertyNameArrayRelease(testNames);

    JSGlobalContextRelease(context);

    return suite;
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
    NSMethodSignature *sig = [super methodSignatureForSelector:aSelector];
    if (sig) {
        return sig;
    }
    return [NSMethodSignature signatureWithObjCTypes:"v@:"];
}

- (void)forwardInvocation:(NSInvocation *)anInvocation {
    [self performTestScript:[NSString stringWithFormat:@"%@;%@;%@;\n%@.%@();",
                             [self.class loadScript:@"TestCase"],
                             [self.class loadScript:@"TestObjects"],
                             self.class.jsSuiteScript,
                             self.class.jsSuiteName,
                             NSStringFromSelector(anInvocation.selector)]];
}

@end

@interface RJSResultsTests : RealmJSTests
@end
@implementation RJSResultsTests
+ (NSString *)jsSuiteName {
    return @"ResultsTests";
}
@end

@interface RJSObjectTests : RealmJSTests
@end
@implementation RJSObjectTests
+ (NSString *)jsSuiteName {
    return @"ObjectTests";
}
@end

@interface RJSRealmTests : RealmJSTests
@end
@implementation RJSRealmTests
+ (NSString *)jsSuiteName {
    return @"RealmTests";
}
@end

