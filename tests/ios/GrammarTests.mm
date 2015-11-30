/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <XCTest/XCTest.h>
#import <RealmJS/js_init.h>
#import "parser.hpp"

@interface GrammerTests : XCTestCase
@end

@implementation GrammerTests

- (void)testGrammer {
    realm::parser::analyzeGrammar();
    XCTAssertTrue(realm::parser::testGrammar());
}

@end
