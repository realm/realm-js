/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <XCTest/XCTest.h>
#import <RealmJS/RealmJS.h>
#import "parser.hpp"

@interface GrammerTests : XCTestCase
@end

@implementation GrammerTests

- (void)testGrammer {
    realm::parser::analyzeGrammer();
    XCTAssertTrue(realm::parser::testGrammer());
}

@end
