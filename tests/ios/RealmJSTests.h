/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <XCTest/XCTest.h>

@interface RealmJSTests : XCTestCase

+ (NSArray *)testSuitesFromDictionary:(NSDictionary *)testCaseNames;

- (instancetype)initWithTestName:(NSString *)name;

@end
