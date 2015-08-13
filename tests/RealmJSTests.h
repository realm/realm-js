//
//  RealmJSTests.h
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import <XCTest/XCTest.h>
#import <RealmJS/RealmJS.h>

extern NSString *RealmPathForFile(NSString *fileName);
extern NSString *TestRealmPath();

@interface RealmJSTests : XCTestCase

+ (NSString *)jsSuiteName;

@property JSGlobalContextRef ctx;
@property (readonly) JSContext *context;

- (JSValueRef)performScript:(NSString *)script exception:(JSValueRef *)exception;
- (void)performTestScript:(NSString *)script;

@end
