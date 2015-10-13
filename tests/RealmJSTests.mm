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
#import "RJSUtil.hpp"
#import "RJSRealm.hpp"

#import "shared_realm.hpp"

NSString *RealmPathForFile(NSString *fileName) {
#if TARGET_OS_IPHONE
    NSString *path = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
#else
    NSString *path = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];
    path = [path stringByAppendingPathComponent:[[[NSBundle mainBundle] executablePath] lastPathComponent]];
#endif
    return [path stringByAppendingPathComponent:fileName];
}


NSString *TestRealmPath() {
    return RealmPathForFile(@"test.realm");
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

@interface RealmJSTests ()

@property (nonatomic, strong) JSContext *context;

@end

@implementation RealmJSTests

+ (void)initialize {
    JSClassDefinition globalDefinition = kJSClassDefinitionEmpty;
    globalDefinition.attributes = kJSClassAttributeNoAutomaticPrototype;
    s_globalClass = JSClassCreate(&globalDefinition);
}

- (void)setUp {
    [super setUp];

    NSString *defaultDir = [[NSString stringWithUTF8String:RJSDefaultPath().c_str()] stringByDeletingLastPathComponent];
    [[NSFileManager defaultManager] createDirectoryAtPath:defaultDir withIntermediateDirectories:YES attributes:nil error:nil];

    JSGlobalContextRef ctx = JSGlobalContextCreateInGroup(NULL, s_globalClass);
    self.context = [JSContext contextWithJSGlobalContextRef:ctx];

    [RealmJS initializeContext:ctx];

    [self evaluateScriptWithName:@"TestCase"];
    [self evaluateScriptWithName:@"TestObjects"];
    [self evaluateScriptWithName:self.class.jsSuiteName];
}

- (void)tearDown {
    self.context = nil;

    realm::Realm::s_global_cache.invalidate_all();
    realm::Realm::s_global_cache.clear();

    // FIXME - find all realm files in the docs dir and delete them rather than hardcoding these
    DeleteRealmFilesAtPath(RealmPathForFile(@"test.realm"));
    DeleteRealmFilesAtPath(RealmPathForFile(@"test1.realm"));
    DeleteRealmFilesAtPath(RealmPathForFile(@"test2.realm"));
    DeleteRealmFilesAtPath(@(RJSDefaultPath().c_str()));

    [super tearDown];
}

- (void)invokeTest {
    @autoreleasepool {
        [super invokeTest];
    }
}

- (void)evaluateScriptWithName:(NSString *)name {
    NSURL *url = [self.class scriptURLWithName:name];
    NSString *script = [self.class loadScriptWithURL:url];

    [self evaluateScript:script fromURL:url];
}

- (void)evaluateScript:(NSString *)script fromURL:(NSURL *)url {
    JSValue *exception;
    [self.class evaluateScript:script fromURL:url inContext:self.context exception:&exception];

    if (exception) {
        JSValue *message = [exception hasProperty:@"message"] ? exception[@"message"] : exception;
        NSString *source = [exception hasProperty:@"sourceURL"] ? [exception[@"sourceURL"] toString] : nil;
        NSUInteger line = [exception hasProperty:@"line"] ? [exception[@"line"] toUInt32] : 0;
        NSURL *sourceURL = source ? [NSURL URLWithString:source.lastPathComponent relativeToURL:[NSURL URLWithString:@(__FILE__)]] : nil;
        const char *sourcePath = sourceURL.absoluteString.UTF8String;

        _XCTFailureHandler(self, YES, sourcePath ?: __FILE__, sourcePath ? line : __LINE__, @"JS", @"%@", message);
    }
}

+ (JSValue *)evaluateScript:(NSString *)script fromURL:(NSURL *)url inContext:(JSContext *)context exception:(JSValue **)exception {
    JSStringRef jsScript = JSStringCreateWithUTF8CString(script.UTF8String);
    JSStringRef jsURL = url ? JSStringCreateWithUTF8CString(url.absoluteString.UTF8String) : NULL;
    JSValueRef jsException = NULL;
    JSValueRef jsResult = JSEvaluateScript(context.JSGlobalContextRef, jsScript, NULL, jsURL, 1, &jsException);

    JSStringRelease(jsScript);
    if (jsURL) {
        JSStringRelease(jsURL);
    }

    if (jsException) {
        *exception = [JSValue valueWithJSValueRef:jsException inContext:context];
        return NULL;
    }

    return [JSValue valueWithJSValueRef:jsResult inContext:context];
}

+ (NSURL *)scriptURLWithName:(NSString *)name {
    NSURL *url = [[NSBundle bundleForClass:self] URLForResource:name withExtension:@"js"];
    if (!url) {
        NSLog(@"JS file does not exist: %@", url);
        exit(1);
    }
    return url;
}

+ (NSString *)loadScriptWithURL:(NSURL *)url {
    NSError *error;
    NSString *script = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
    if (!script) {
        NSLog(@"Error reading JS file (%@): %@", url, error);
        exit(1);
    }
    return script;
}

+ (NSString *)jsSuiteName {
    return nil;
}

+ (NSString *)jsSuiteScript {
    NSString *name = [self jsSuiteName];
    return name ? [self loadScriptWithURL:[self scriptURLWithName:name]] : nil;
}

+ (XCTestSuite *)defaultTestSuite {
    XCTestSuite *suite = [super defaultTestSuite];
    NSString *suiteName = [self jsSuiteName];
    NSURL *scriptURL = suiteName ? [self scriptURLWithName:suiteName] : nil;
    NSString *script = scriptURL ? [self loadScriptWithURL:scriptURL] : nil;
    if (!script) {
        return suite;
    }

    JSContext *context = [[JSContext alloc] init];
    JSValue *exception;

    [self evaluateScript:script fromURL:scriptURL inContext:context exception:&exception];
    if (exception) {
        NSLog(@"%@.js - %@", suiteName, exception);
        exit(1);
    }

    JSValue *suiteObject = [self evaluateScript:suiteName fromURL:nil inContext:context exception:&exception];
    if (exception) {
        NSLog(@"%@.js - %@", suiteName, exception);
        exit(1);
    }

    if (![suiteObject isObject]) {
        NSLog(@"%@.js - JS test suite is not an object: %@", suiteName, suiteObject);
        exit(1);
    }

    for (NSString *testName in [suiteObject toDictionary]) {
        [suite addTest:[self testCaseWithSelector:NSSelectorFromString(testName)]];
    }

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
    NSString *script = [NSString stringWithFormat:@"%@.%@();", [self.class jsSuiteName], NSStringFromSelector(anInvocation.selector)];
    [self evaluateScript:script fromURL:nil];
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

@interface RJSArrayTests : RealmJSTests
@end
@implementation RJSArrayTests
+ (NSString *)jsSuiteName {
    return @"ArrayTests";
}
@end

@interface RJSRealmTests : RealmJSTests
@end
@implementation RJSRealmTests
+ (NSString *)jsSuiteName {
    return @"RealmTests";
}
@end

