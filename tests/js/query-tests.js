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


'use strict';

var Realm = require('realm');
var BaseTest = require('./base-test');
var TestCase = require('./asserts');
var schemas = require('./schemas');
var testCases = require('./query-tests.json');

var typeConverters = {};

function convertValue(value, schema, type) {
    var objSchema = schema.find(function(el) { return el.name == type });
    if (!objSchema) {
        throw "Object schema '" + type + "' not found in test suite.";
    }

    return value.map(function(propValue, index) {
        if (propValue == null) {
            return null;
        }
        var property = objSchema.properties[index];
        var converter = typeConverters[property.type];
        var propType = property.objectType ? property.objectType : property.type;
        return converter ? converter(propValue, schema, propType) : propValue;
    });
}

typeConverters[Realm.Types.DATE] = function(value) { return new Date(value); };
typeConverters[Realm.Types.DATA] = function(value) { return new Uint8Array(value); };
typeConverters[Realm.Types.OBJECT] = convertValue;

function runQuerySuite(suite) {
    var realm = new Realm({schema: suite.schema});
    var objects = suite.objects.map(function(obj) {
        return { type: obj.type, value: convertValue(obj.value, suite.schema, obj.type) };
    });

    realm.write(function() {
        for (var i = 0; i < objects.length; i++) {
            objects[i] = realm.create(objects[i].type, objects[i].value);
        }
    });

    function getArgs(startArg) {
        var args = [test[startArg]];
        for (var i = startArg + 1; i < test.length; i++) {
            var arg = test[i];
            if (Array.isArray(arg)) {
                // aray arguments correspond to [objectAtIndex, propertyName]
                args.push(objects[arg[0]][arg[1]]);
            }
            else {
                args.push(arg);
            }
        }
        return args;
    }

    for (var index in suite.tests) {
        var test = suite.tests[index];
        if (test[0] == "QueryCount") {
            var type = test[2];
            var args = getArgs(3);
            var objects = realm.objects(type);
            var length = objects.filtered.apply(objects, args).length;
            TestCase.assertEqual(test[1], length, "Query '" + args[0] + "' on type '" + type + "' expected " + test[1] + " results, got " + length);
        }
        else if (test[0] == "ObjectSet") {
            var type = test[2];
            var args = getArgs(3);
            var objects = realm.objects(type);
            var results = objects.filtered.apply(objects, args);           
            TestCase.assertEqual(test[1].length, results.length, "Query '" + args[0] + "' on type '" + type+ "' expected " + test[1].length + " results, got " + results.length);

            var objSchema = suite.schema.find(function(el) { return el.name == type });
            var primary = objSchema.primaryKey;
            if (!primary) {
                throw "Primary key required for object comparison";
            }

            TestCase.assertArraysEqual(test[1], results.map(function(el) {
                return el[primary];
            }));
        }
        else if (test[0] == "QueryThrows") {
            TestCase.assertThrows(function() {
                var args = getArgs(2);
                realm.objects.apply(realm, args);
            }, "Expected exception not thrown for query: " + JSON.stringify(args));
        }
        else if (test[0] != "Disabled") {
            throw "Invalid query test '" + test[0] + "'";
        }
    }
}


module.exports = BaseTest.extend({
    testDateQueries: function() { 
        runQuerySuite(testCases.dateTests);
    },
    testBoolQueries: function() { 
        runQuerySuite(testCases.boolTests);
    },
    testIntQueries: function() { 
        runQuerySuite(testCases.intTests);
    },
    testFloatQueries: function() { 
        runQuerySuite(testCases.floatTests);
    },
    testDoubleQueries: function() { 
        runQuerySuite(testCases.doubleTests);
    },
    testStringQueries: function() { 
        runQuerySuite(testCases.stringTests);
    },
    testBinaryQueries: function() { 
        runQuerySuite(testCases.binaryTests);
    },
    testObjectQueries: function() {
        runQuerySuite(testCases.objectTests);
    },
    testCompoundQueries: function() {
        runQuerySuite(testCases.compoundTests);
    },
    testKeyPathQueries: function() {
        runQuerySuite(testCases.keyPathTests);
    }
});


/*
-(void)testQueryBetween
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    NSDate *date1 = [NSDate date];
    NSDate *date2 = [date1 dateByAddingTimeInterval:1];
    NSDate *date3 = [date2 dateByAddingTimeInterval:1];
    NSDate *date33 = [date3 dateByAddingTimeInterval:1];

    StringObject *stringObj = [StringObject new];
    stringObj.stringCol = @"string";

    [realm beginWriteTransaction];
    [AllTypesObject createInRealm:realm withValue:@[@YES, @1, @1.0f, @1.0, @"a", [@"a" dataUsingEncoding:NSUTF8StringEncoding], date1, @YES, @((long)1), @1, stringObj]];
    [AllTypesObject createInRealm:realm withValue:@[@YES, @2, @2.0f, @2.0, @"b", [@"b" dataUsingEncoding:NSUTF8StringEncoding], date2, @YES, @((long)2), @"mixed", stringObj]];
    [AllTypesObject createInRealm:realm withValue:@[@NO, @3, @3.0f, @3.0, @"c", [@"c" dataUsingEncoding:NSUTF8StringEncoding], date3, @YES, @((long)3), @"mixed", stringObj]];
    [AllTypesObject createInRealm:realm withValue:@[@NO, @33, @3.3f, @3.3, @"cc", [@"cc" dataUsingEncoding:NSUTF8StringEncoding], date33, @NO, @((long)3.3), @"mixed", stringObj]];
    [realm commitWriteTransaction];

    RLMResults *betweenResults = [AllTypesObject objectsWithPredicate:[NSPredicate predicateWithFormat:@"intCol BETWEEN %@", @[@2, @3]]];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");
    betweenResults = [AllTypesObject objectsWithPredicate:[NSPredicate predicateWithFormat:@"floatCol BETWEEN %@", @[@1.0f, @4.0f]]];
    XCTAssertEqual(betweenResults.count, 4U, @"Should equal 4");
    betweenResults = [AllTypesObject objectsWithPredicate:[NSPredicate predicateWithFormat:@"doubleCol BETWEEN %@", @[@3.0, @7.0f]]];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");
    betweenResults = [AllTypesObject objectsWithPredicate:[NSPredicate predicateWithFormat:@"dateCol BETWEEN %@", @[date2,date3]]];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");

    betweenResults = [AllTypesObject objectsWhere:@"intCol BETWEEN {2, 3}"];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");
    betweenResults = [AllTypesObject objectsWhere:@"doubleCol BETWEEN {3.0, 7.0}"];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");

    betweenResults = [AllTypesObject.allObjects objectsWhere:@"intCol BETWEEN {2, 3}"];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");
    betweenResults = [AllTypesObject.allObjects objectsWhere:@"doubleCol BETWEEN {3.0, 7.0}"];
    XCTAssertEqual(betweenResults.count, 2U, @"Should equal 2");
}


- (void)testArrayQuery
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [PersonObject createInRealm:realm withValue:@[@"Fiel", @27]];
    [PersonObject createInRealm:realm withValue:@[@"Tim", @29]];
    [PersonObject createInRealm:realm withValue:@[@"Ari", @33]];
    [realm commitWriteTransaction];

    // query on class
    RLMResults *all = [PersonObject allObjects];
    XCTAssertEqual(all.count, 3U, @"Expecting 3 results");

    RLMResults *some = [[PersonObject objectsWhere:@"age > 28"] sortedResultsUsingProperty:@"age" ascending:YES];

    // query/order on array
    XCTAssertEqual([all objectsWhere:@"age == 27"].count, 1U, @"Expecting 1 result");
    XCTAssertEqual([all objectsWhere:@"age == 28"].count, 0U, @"Expecting 0 results");
    some = [some sortedResultsUsingProperty:@"age" ascending:NO];
    XCTAssertEqualObjects([some[0] name], @"Ari", @"Ari should be first results");
}

- (void)verifySort:(RLMRealm *)realm column:(NSString *)column ascending:(BOOL)ascending expected:(id)val {
    RLMResults *results = [[AllTypesObject allObjectsInRealm:realm] sortedResultsUsingProperty:column ascending:ascending];
    AllTypesObject *obj = results[0];
    XCTAssertEqualObjects(obj[column], val, @"Array not sorted as expected - %@ != %@", obj[column], val);
    
    RLMArray *ar = (RLMArray *)[[[ArrayOfAllTypesObject allObjectsInRealm:realm] firstObject] array];
    results = [ar sortedResultsUsingProperty:column ascending:ascending];
    obj = results[0];
    XCTAssertEqualObjects(obj[column], val, @"Array not sorted as expected - %@ != %@", obj[column], val);
}

- (void)verifySortWithAccuracy:(RLMRealm *)realm column:(NSString *)column ascending:(BOOL)ascending getter:(double(^)(id))getter expected:(double)val accuracy:(double)accuracy {
    // test TableView query
    RLMResults *results = [[AllTypesObject allObjectsInRealm:realm] sortedResultsUsingProperty:column ascending:ascending];
    XCTAssertEqualWithAccuracy(getter(results[0][column]), val, accuracy, @"Array not sorted as expected");
    
    // test LinkView query
    RLMArray *ar = (RLMArray *)[[[ArrayOfAllTypesObject allObjectsInRealm:realm] firstObject] array];
    results = [ar sortedResultsUsingProperty:column ascending:ascending];
    XCTAssertEqualWithAccuracy(getter(results[0][column]), val, accuracy, @"Array not sorted as expected");
}

- (void)testQuerySorting
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    NSDate *date1 = [NSDate date];
    NSDate *date2 = [date1 dateByAddingTimeInterval:1];
    NSDate *date3 = [date2 dateByAddingTimeInterval:1];
    NSDate *date33 = [date3 dateByAddingTimeInterval:1];

    [realm beginWriteTransaction];
    ArrayOfAllTypesObject *arrayOfAll = [ArrayOfAllTypesObject createInRealm:realm withValue:@{}];

    StringObject *stringObj = [StringObject new];
    stringObj.stringCol = @"string";
    
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@YES, @1, @1.0f, @1.0, @"a", [@"a" dataUsingEncoding:NSUTF8StringEncoding], date1, @YES, @1, @1, stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@YES, @2, @2.0f, @2.0, @"b", [@"b" dataUsingEncoding:NSUTF8StringEncoding], date2, @YES, @2, @"mixed", stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@NO, @3, @3.0f, @3.0, @"c", [@"c" dataUsingEncoding:NSUTF8StringEncoding], date3, @YES, @3, @"mixed", stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@NO, @33, @3.3f, @3.3, @"cc", [@"cc" dataUsingEncoding:NSUTF8StringEncoding], date33, @NO, @3, @"mixed", stringObj]]];
    
    [realm commitWriteTransaction];


    //////////// sort by boolCol
    [self verifySort:realm column:@"boolCol" ascending:YES expected:@NO];
    [self verifySort:realm column:@"boolCol" ascending:NO expected:@YES];

    //////////// sort by intCol
    [self verifySort:realm column:@"intCol" ascending:YES expected:@1];
    [self verifySort:realm column:@"intCol" ascending:NO expected:@33];
    
    //////////// sort by dateCol
    double (^dateGetter)(id) = ^(NSDate *d) { return d.timeIntervalSince1970; };
    [self verifySortWithAccuracy:realm column:@"dateCol" ascending:YES getter:dateGetter expected:date1.timeIntervalSince1970 accuracy:1];
    [self verifySortWithAccuracy:realm column:@"dateCol" ascending:NO getter:dateGetter expected:date33.timeIntervalSince1970 accuracy:1];
    
    //////////// sort by doubleCol
    double (^doubleGetter)(id) = ^(NSNumber *n) { return n.doubleValue; };
    [self verifySortWithAccuracy:realm column:@"doubleCol" ascending:YES getter:doubleGetter expected:1.0 accuracy:0.0000001];
    [self verifySortWithAccuracy:realm column:@"doubleCol" ascending:NO getter:doubleGetter expected:3.3 accuracy:0.0000001];

    //////////// sort by floatCol
    [self verifySortWithAccuracy:realm column:@"floatCol" ascending:YES getter:doubleGetter expected:1.0 accuracy:0.0000001];
    [self verifySortWithAccuracy:realm column:@"floatCol" ascending:NO getter:doubleGetter expected:3.3 accuracy:0.0000001];
    
    //////////// sort by stringCol
    [self verifySort:realm column:@"stringCol" ascending:YES expected:@"a"];
    [self verifySort:realm column:@"stringCol" ascending:NO expected:@"cc"];
    
    // sort by mixed column
    RLMAssertThrowsWithReasonMatching([[AllTypesObject allObjects] sortedResultsUsingProperty:@"mixedCol" ascending:YES], @"'mixedCol' .* 'AllTypesObject': sorting is only supported .* type any");
    XCTAssertThrows([arrayOfAll.array sortedResultsUsingProperty:@"mixedCol" ascending:NO]);
    
    // sort invalid name
    RLMAssertThrowsWithReasonMatching([[AllTypesObject allObjects] sortedResultsUsingProperty:@"invalidCol" ascending:YES], @"'invalidCol'.* 'AllTypesObject'.* not found");
    XCTAssertThrows([arrayOfAll.array sortedResultsUsingProperty:@"invalidCol" ascending:NO]);

    // sort on key path
    RLMAssertThrowsWithReasonMatching([[AllTypesObject allObjects] sortedResultsUsingProperty:@"key.path" ascending:YES], @"key paths is not supported");
    XCTAssertThrows([arrayOfAll.array sortedResultsUsingProperty:@"key.path" ascending:NO]);
}

- (void)testSortByMultipleColumns {
    RLMRealm *realm = [RLMRealm defaultRealm];
    [realm beginWriteTransaction];
    DogObject *a1 = [DogObject createInDefaultRealmWithValue:@[@"a", @1]];
    DogObject *a2 = [DogObject createInDefaultRealmWithValue:@[@"a", @2]];
    DogObject *b1 = [DogObject createInDefaultRealmWithValue:@[@"b", @1]];
    DogObject *b2 = [DogObject createInDefaultRealmWithValue:@[@"b", @2]];
    [realm commitWriteTransaction];

    bool (^checkOrder)(NSArray *, NSArray *, NSArray *) = ^bool(NSArray *properties, NSArray *ascending, NSArray *dogs) {
        NSArray *sort = @[[RLMSortDescriptor sortDescriptorWithProperty:properties[0] ascending:[ascending[0] boolValue]],
                          [RLMSortDescriptor sortDescriptorWithProperty:properties[1] ascending:[ascending[1] boolValue]]];
        RLMResults *actual = [DogObject.allObjects sortedResultsUsingDescriptors:sort];
        return [actual[0] isEqualToObject:dogs[0]]
            && [actual[1] isEqualToObject:dogs[1]]
            && [actual[2] isEqualToObject:dogs[2]]
            && [actual[3] isEqualToObject:dogs[3]];
    };

    // Check each valid sort
    XCTAssertTrue(checkOrder(@[@"dogName", @"age"], @[@YES, @YES], @[a1, a2, b1, b2]));
    XCTAssertTrue(checkOrder(@[@"dogName", @"age"], @[@YES, @NO], @[a2, a1, b2, b1]));
    XCTAssertTrue(checkOrder(@[@"dogName", @"age"], @[@NO, @YES], @[b1, b2, a1, a2]));
    XCTAssertTrue(checkOrder(@[@"dogName", @"age"], @[@NO, @NO], @[b2, b1, a2, a1]));
    XCTAssertTrue(checkOrder(@[@"age", @"dogName"], @[@YES, @YES], @[a1, b1, a2, b2]));
    XCTAssertTrue(checkOrder(@[@"age", @"dogName"], @[@YES, @NO], @[b1, a1, b2, a2]));
    XCTAssertTrue(checkOrder(@[@"age", @"dogName"], @[@NO, @YES], @[a2, b2, a1, b1]));
    XCTAssertTrue(checkOrder(@[@"age", @"dogName"], @[@NO, @NO], @[b2, a2, b1, a1]));
}

- (void)testSortedLinkViewWithDeletion {
    RLMRealm *realm = [RLMRealm defaultRealm];

    NSDate *date1 = [NSDate date];
    NSDate *date2 = [date1 dateByAddingTimeInterval:1];
    NSDate *date3 = [date2 dateByAddingTimeInterval:1];
    NSDate *date33 = [date3 dateByAddingTimeInterval:1];

    [realm beginWriteTransaction];
    ArrayOfAllTypesObject *arrayOfAll = [ArrayOfAllTypesObject createInRealm:realm withValue:@{}];

    StringObject *stringObj = [StringObject new];
    stringObj.stringCol = @"string";

    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@YES, @1, @1.0f, @1.0, @"a", [@"a" dataUsingEncoding:NSUTF8StringEncoding], date1, @YES, @1, @1, stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@YES, @2, @2.0f, @2.0, @"b", [@"b" dataUsingEncoding:NSUTF8StringEncoding], date2, @YES, @2, @"mixed", stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@NO, @3, @3.0f, @3.0, @"c", [@"c" dataUsingEncoding:NSUTF8StringEncoding], date3, @YES, @3, @"mixed", stringObj]]];
    [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@NO, @33, @3.3f, @3.3, @"cc", [@"cc" dataUsingEncoding:NSUTF8StringEncoding], date33, @NO, @3, @"mixed", stringObj]]];

    [realm commitWriteTransaction];

    RLMResults *results = [arrayOfAll.array sortedResultsUsingProperty:@"stringCol" ascending:NO];
    XCTAssertEqualObjects([results[0] stringCol], @"cc");

    // delete cc, add d results should update
    [realm transactionWithBlock:^{
        [arrayOfAll.array removeObjectAtIndex:3];
        
        // create extra alltypesobject
        [arrayOfAll.array addObject:[AllTypesObject createInRealm:realm withValue:@[@YES, @1, @1.0f, @1.0, @"d", [@"d" dataUsingEncoding:NSUTF8StringEncoding], date1, @YES, @((long)1), @1, stringObj]]];
    }];
    XCTAssertEqualObjects([results[0] stringCol], @"d");
    XCTAssertEqualObjects([results[1] stringCol], @"c");

    // delete from realm should be removed from results
    [realm transactionWithBlock:^{
        [realm deleteObject:arrayOfAll.array.lastObject];
    }];
    XCTAssertEqualObjects([results[0] stringCol], @"c");
}

- (void)testQueryingSortedQueryPreservesOrder {
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    for (int i = 0; i < 5; ++i) {
        [IntObject createInRealm:realm withValue:@[@(i)]];
    }

    ArrayPropertyObject *array = [ArrayPropertyObject createInRealm:realm withValue:@[@"name", @[], [IntObject allObjects]]];
    [realm commitWriteTransaction];

    RLMResults *asc = [IntObject.allObjects sortedResultsUsingProperty:@"intCol" ascending:YES];
    RLMResults *desc = [IntObject.allObjects sortedResultsUsingProperty:@"intCol" ascending:NO];

    // sanity check; would work even without sort order being preserved
    XCTAssertEqual(2, [[[asc objectsWhere:@"intCol >= 2"] firstObject] intCol]);

    // check query on allObjects and query on query
    XCTAssertEqual(4, [[[desc objectsWhere:@"intCol >= 2"] firstObject] intCol]);
    XCTAssertEqual(3, [[[[desc objectsWhere:@"intCol >= 2"] objectsWhere:@"intCol < 4"] firstObject] intCol]);

    // same thing but on an linkview
    asc = [array.intArray sortedResultsUsingProperty:@"intCol" ascending:YES];
    desc = [array.intArray sortedResultsUsingProperty:@"intCol" ascending:NO];

    XCTAssertEqual(2, [[[asc objectsWhere:@"intCol >= 2"] firstObject] intCol]);
    XCTAssertEqual(4, [[[desc objectsWhere:@"intCol >= 2"] firstObject] intCol]);
    XCTAssertEqual(3, [[[[desc objectsWhere:@"intCol >= 2"] objectsWhere:@"intCol < 4"] firstObject] intCol]);
}

- (void)testPredicateNotSupported
{
    // These are things which are valid predicates, but which we do not support

    // Aggregate operators on non-arrays
    XCTAssertThrows([PersonObject objectsWhere:@"ANY age > 5"]);
    XCTAssertThrows([PersonObject objectsWhere:@"ALL age > 5"]);
    XCTAssertThrows([PersonObject objectsWhere:@"SOME age > 5"]);
    XCTAssertThrows([PersonObject objectsWhere:@"NONE age > 5"]);

    // nil on LHS of comparison with nullable property
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = boolObj"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = intObj"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = floatObj"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = doubleObj"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = string"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = data"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = date"]);

    // comparing two constants
    XCTAssertThrows([PersonObject objectsWhere:@"5 = 5"]);
    XCTAssertThrows([PersonObject objectsWhere:@"nil = nil"]);

    // substring operations with constant on LHS
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"'' CONTAINS string"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"'' BEGINSWITH string"]);
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"'' ENDSWITH string"]);
    XCTAssertThrows(([AllOptionalTypes objectsWhere:@"%@ CONTAINS data", [NSData data]]));

    // data is missing stuff
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"data = data"]);
    XCTAssertThrows(([LinkToAllTypesObject objectsWhere:@"%@ = allTypesCol.binaryCol", [NSData data]]));
    XCTAssertThrows(([LinkToAllTypesObject objectsWhere:@"allTypesCol.binaryCol CONTAINS %@", [NSData data]]));

    // LinkList equality is unsupport since the semantics are unclear
    XCTAssertThrows(([ArrayOfAllTypesObject objectsWhere:@"ANY array = array"]));

    // subquery
    XCTAssertThrows(([ArrayOfAllTypesObject objectsWhere:@"SUBQUERY(array, $obj, $obj.intCol = 5).@count > 1"]));
}

- (void)testPredicateMisuse
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    NSString *className = PersonObject.className;

    // invalid column/property name
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"height > 72"], @"'height' not found in .* 'PersonObject'");

    // wrong/invalid data types
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age != xyz"], @"'xyz' not found in .* 'PersonObject'");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"name == 3"], @"type string .* property 'name' .* 'PersonObject'.*: 3");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age IN {'xyz'}"], @"type int .* property 'age' .* 'PersonObject'.*: xyz");
    XCTAssertThrows([realm objects:className where:@"name IN {3}"], @"invalid type");

    className = AllTypesObject.className;

    XCTAssertThrows([realm objects:className where:@"boolCol == Foo"], @"invalid type");
    XCTAssertThrows([realm objects:className where:@"boolCol == 2"], @"invalid type");
    XCTAssertThrows([realm objects:className where:@"dateCol == 7"], @"invalid type");
    XCTAssertThrows([realm objects:className where:@"doubleCol == The"], @"invalid type");
    XCTAssertThrows([realm objects:className where:@"floatCol == Bar"], @"invalid type");
    XCTAssertThrows([realm objects:className where:@"intCol == Baz"], @"invalid type");

    className = PersonObject.className;

    // compare two constants
    XCTAssertThrows([realm objects:className where:@"3 == 3"], @"comparing 2 constants");

    // invalid strings
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@""], @"Unable to parse");
    XCTAssertThrows([realm objects:className where:@"age"], @"column name only");
    XCTAssertThrows([realm objects:className where:@"sdlfjasdflj"], @"gibberish");
    XCTAssertThrows([realm objects:className where:@"age * 25"], @"invalid operator");
    XCTAssertThrows([realm objects:className where:@"age === 25"], @"invalid operator");
    XCTAssertThrows([realm objects:className where:@","], @"comma");
    XCTAssertThrows([realm objects:className where:@"()"], @"parens");

    // not a link column
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age.age == 25"], @"'age' is not a link .* 'PersonObject'");
    XCTAssertThrows([realm objects:className where:@"age.age.age == 25"]);

    // abuse of BETWEEN
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN 25"], @"type NSArray for BETWEEN");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN Foo"], @"BETWEEN operator must compare a KeyPath with an aggregate");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN {age, age}"], @"must be constant values");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN {age, 0}"], @"must be constant values");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN {0, age}"], @"must be constant values");
    RLMAssertThrowsWithReasonMatching([realm objects:className where:@"age BETWEEN {0, {1, 10}}"], @"must be constant values");

    NSPredicate *pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @[@1]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"exactly two objects");

    pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @[@1, @2, @3]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"exactly two objects");

    pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @[@"Foo", @"Bar"]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"type int for BETWEEN");

    pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @[@1.5, @2.5]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"type int for BETWEEN");

    pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @[@1, @[@2, @3]]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"type int for BETWEEN");

    pred = [NSPredicate predicateWithFormat:@"age BETWEEN %@", @{@25 : @35}];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"type NSArray for BETWEEN");

    pred = [NSPredicate predicateWithFormat:@"height BETWEEN %@", @[@25, @35]];
    RLMAssertThrowsWithReasonMatching([realm objects:className withPredicate:pred], @"'height' not found .* 'PersonObject'");

    // bad type in link IN
    XCTAssertThrows([PersonLinkObject objectsInRealm:realm where:@"person.age IN {'Tim'}"]);
}

- (void)testTwoColumnComparison
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];

    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"a", @"a"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @1, @3, @-5.3f, @4.21f, @1.0,  @4.44, @"a", @"A"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @NO,  @2, @2, @1.0f,  @3.55f, @99.9, @6.66, @"a", @"ab"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @YES, @3, @6, @4.21f, @1.0f,  @1.0,  @7.77, @"a", @"AB"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @4, @5, @23.0f, @23.0f, @7.4,  @8.88, @"a", @"b"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @15, @8, @1.0f,  @66.0f, @1.01, @9.99, @"a", @"ba"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @YES, @15, @15, @1.0f,  @66.0f, @1.01, @9.99, @"a", @"BA"]];

    [realm commitWriteTransaction];

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"bool1 == bool1"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"bool1 == bool2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"bool1 != bool2"].count);

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"int1 == int1"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"int1 == int2"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"int1 != int2"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"int1 > int2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"int1 < int2"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"int1 >= int2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"int1 <= int2"].count);

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"float1 == float1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"float1 == float2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"float1 != float2"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"float1 > float2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"float1 < float2"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"float1 >= float2"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"float1 <= float2"].count);

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"double1 == double1"].count);
    XCTAssertEqual(0U, [self.queryObjectClass objectsWhere:@"double1 == double2"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"double1 != double2"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"double1 > double2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"double1 < double2"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"double1 >= double2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"double1 <= double2"].count);

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 == string1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"string1 == string2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"string1 != string2"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 CONTAINS string1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"string1 CONTAINS string2"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"string2 CONTAINS string1"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 BEGINSWITH string1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"string1 BEGINSWITH string2"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string2 BEGINSWITH string1"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 ENDSWITH string1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"string1 ENDSWITH string2"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string2 ENDSWITH string1"].count);

    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 ==[c] string1"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string1 ==[c] string2"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"string1 !=[c] string2"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 CONTAINS[c] string1"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string1 CONTAINS[c] string2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"string2 CONTAINS[c] string1"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 BEGINSWITH[c] string1"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string1 BEGINSWITH[c] string2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"string2 BEGINSWITH[c] string1"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"string1 ENDSWITH[c] string1"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"string1 ENDSWITH[c] string2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"string2 ENDSWITH[c] string1"].count);

    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"int1 == float1"],
                                      @"Property type mismatch between int and float");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"float2 >= double1"],
                                      @"Property type mismatch between float and double");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"double2 <= int2"],
                                      @"Property type mismatch between double and int");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"int2 != string1"],
                                      @"Property type mismatch between int and string");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"float1 > string1"],
                                      @"Property type mismatch between float and string");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"double1 < string1"],
                                      @"Property type mismatch between double and string");
}

- (void)testKeyPathLocationInComparison
{
    NSExpression *keyPath = [NSExpression expressionForKeyPath:@"intCol"];
    NSExpression *expr = [NSExpression expressionForConstantValue:@0];
    NSPredicate *predicate;

    predicate = [RLMPredicateUtil defaultPredicateGenerator](keyPath, expr);
    XCTAssert([RLMPredicateUtil isEmptyIntColWithPredicate:predicate],
              @"Key path to the left in an integer comparison.");

    predicate = [RLMPredicateUtil defaultPredicateGenerator](expr, keyPath);
    XCTAssert([RLMPredicateUtil isEmptyIntColWithPredicate:predicate],
              @"Key path to the right in an integer comparison.");

    predicate = [RLMPredicateUtil defaultPredicateGenerator](keyPath, keyPath);
    XCTAssert([RLMPredicateUtil isEmptyIntColWithPredicate:predicate],
              @"Key path in both locations in an integer comparison.");

    predicate = [RLMPredicateUtil defaultPredicateGenerator](expr, expr);
    XCTAssertThrowsSpecificNamed([RLMPredicateUtil isEmptyIntColWithPredicate:predicate],
                                 NSException, @"Invalid predicate expressions",
                                 @"Key path in absent in an integer comparison.");
}

- (void)testLiveQueriesInsideTransaction
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    {
        [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"", @""]];

        RLMResults *resultsQuery = [self.queryObjectClass objectsWhere:@"bool1 = YES"];
        RLMResults *resultsTableView = [self.queryObjectClass objectsWhere:@"bool1 = YES"];

        // Force resultsTableView to form the TableView to verify that it syncs
        // correctly, and don't call anything but count on resultsQuery so that
        // it always reruns the query count method
        (void)[resultsTableView firstObject];

        XCTAssertEqual(resultsQuery.count, 1U);
        XCTAssertEqual(resultsTableView.count, 1U);

        // Delete the (only) object in result set
        [realm deleteObject:[resultsTableView lastObject]];
        XCTAssertEqual(resultsQuery.count, 0U);
        XCTAssertEqual(resultsTableView.count, 0U);

        // Add an object that does not match query
        QueryObject *q1 = [self.queryObjectClass createInRealm:realm withValue:@[@NO, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"", @""]];
        XCTAssertEqual(resultsQuery.count, 0U);
        XCTAssertEqual(resultsTableView.count, 0U);

        // Change object to match query
        q1[@"bool1"] = @YES;
        XCTAssertEqual(resultsQuery.count, 1U);
        XCTAssertEqual(resultsTableView.count, 1U);

        // Add another object that matches
        [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @1, @3, @-5.3f, @4.21f, @1.0,  @4.44, @"", @""]];
        XCTAssertEqual(resultsQuery.count, 2U);
        XCTAssertEqual(resultsTableView.count, 2U);
    }
    [realm commitWriteTransaction];
}

- (void)testLiveQueriesBetweenTransactions
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"", @""]];
    [realm commitWriteTransaction];

    RLMResults *resultsQuery = [self.queryObjectClass objectsWhere:@"bool1 = YES"];
    RLMResults *resultsTableView = [self.queryObjectClass objectsWhere:@"bool1 = YES"];

    // Force resultsTableView to form the TableView to verify that it syncs
    // correctly, and don't call anything but count on resultsQuery so that
    // it always reruns the query count method
    (void)[resultsTableView firstObject];

    XCTAssertEqual(resultsQuery.count, 1U);
    XCTAssertEqual(resultsTableView.count, 1U);

    // Delete the (only) object in result set
    [realm beginWriteTransaction];
    [realm deleteObject:[resultsTableView lastObject]];
    [realm commitWriteTransaction];

    XCTAssertEqual(resultsQuery.count, 0U);
    XCTAssertEqual(resultsTableView.count, 0U);

    // Add an object that does not match query
    [realm beginWriteTransaction];
    QueryObject *q1 = [self.queryObjectClass createInRealm:realm withValue:@[@NO, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"", @""]];
    [realm commitWriteTransaction];

    XCTAssertEqual(resultsQuery.count, 0U);
    XCTAssertEqual(resultsTableView.count, 0U);

    // Change object to match query
    [realm beginWriteTransaction];
    q1[@"bool1"] = @YES;
    [realm commitWriteTransaction];

    XCTAssertEqual(resultsQuery.count, 1U);
    XCTAssertEqual(resultsTableView.count, 1U);

    // Add another object that matches
    [realm beginWriteTransaction];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @1, @3, @-5.3f, @4.21f, @1.0,  @4.44, @"", @""]];
    [realm commitWriteTransaction];

    XCTAssertEqual(resultsQuery.count, 2U);
    XCTAssertEqual(resultsTableView.count, 2U);
}

- (void)makeDogWithName:(NSString *)name owner:(NSString *)ownerName {
    RLMRealm *realm = [self realmWithTestPath];

    OwnerObject *owner = [[OwnerObject alloc] init];
    owner.name = ownerName;
    owner.dog = [[DogObject alloc] init];
    owner.dog.dogName = name;

    [realm beginWriteTransaction];
    [realm addObject:owner];
    [realm commitWriteTransaction];
}

- (void)makeDogWithAge:(int)age owner:(NSString *)ownerName {
    RLMRealm *realm = [self realmWithTestPath];

    OwnerObject *owner = [[OwnerObject alloc] init];
    owner.name = ownerName;
    owner.dog = [[DogObject alloc] init];
    owner.dog.dogName = @"";
    owner.dog.age = age;

    [realm beginWriteTransaction];
    [realm addObject:owner];
    [realm commitWriteTransaction];
}

- (void)testLinkQueryString
{
    RLMRealm *realm = [self realmWithTestPath];

    [self makeDogWithName:@"Harvie" owner:@"Tim"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Harvie'"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName != 'Harvie'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'eivraH'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Fido'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'Harvie'}"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'eivraH'}"].count), 0U);

    [self makeDogWithName:@"Harvie" owner:@"Joe"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Harvie'"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName != 'Harvie'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'eivraH'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Fido'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'Harvie'}"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'eivraH'}"].count), 0U);

    [self makeDogWithName:@"Fido" owner:@"Jim"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Harvie'"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName != 'Harvie'"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'eivraH'"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName  = 'Fido'"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'Harvie'}"].count), 3U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName IN {'Fido', 'eivraH'}"].count), 1U);

    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName = 'Harvie' and name = 'Tim'"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.dogName = 'Harvie' and name = 'Jim'"].count), 0U);

    // test invalid operators
    XCTAssertThrows([realm objects:[OwnerObject className] where:@"dog.dogName > 'Harvie'"], @"Invalid operator should throw");
}

- (void)testLinkQueryInt
{
    RLMRealm *realm = [self realmWithTestPath];

    [self makeDogWithAge:5 owner:@"Tim"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 5"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age != 5"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 10"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 8"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {5, 8}"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {8, 10}"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 10}"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 7}"].count), 1U);

    [self makeDogWithAge:5 owner:@"Joe"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 5"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age != 5"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 10"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 8"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {5, 8}"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {8, 10}"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 10}"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 7}"].count), 2U);

    [self makeDogWithAge:8 owner:@"Jim"];
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 5"].count), 2U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age != 5"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 10"].count), 0U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age  = 8"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {5, 8}"].count), 3U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age IN {8, 10}"].count), 1U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 10}"].count), 3U);
    XCTAssertEqual(([OwnerObject objectsInRealm:realm where:@"dog.age BETWEEN {0, 7}"].count), 2U);
}

- (void)testLinkQueryAllTypes
{
    RLMRealm *realm = [self realmWithTestPath];

    NSDate *now = [NSDate dateWithTimeIntervalSince1970:100000];

    LinkToAllTypesObject *linkToAllTypes = [[LinkToAllTypesObject alloc] init];
    linkToAllTypes.allTypesCol = [[AllTypesObject alloc] init];
    linkToAllTypes.allTypesCol.boolCol = YES;
    linkToAllTypes.allTypesCol.intCol = 1;
    linkToAllTypes.allTypesCol.floatCol = 1.1f;
    linkToAllTypes.allTypesCol.doubleCol = 1.11;
    linkToAllTypes.allTypesCol.stringCol = @"string";
    linkToAllTypes.allTypesCol.binaryCol = [NSData dataWithBytes:"a" length:1];
    linkToAllTypes.allTypesCol.dateCol = now;
    linkToAllTypes.allTypesCol.cBoolCol = YES;
    linkToAllTypes.allTypesCol.longCol = 11;
    linkToAllTypes.allTypesCol.mixedCol = @0;
    StringObject *obj = [[StringObject alloc] initWithValue:@[@"string"]];
    linkToAllTypes.allTypesCol.objectCol = obj;

    [realm beginWriteTransaction];
    [realm addObject:linkToAllTypes];
    [realm commitWriteTransaction];

    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.boolCol = YES"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.boolCol = NO"] count], 0U);

    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.intCol = 1"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.intCol != 1"] count], 0U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.intCol > 0"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.intCol > 1"] count], 0U);

    NSPredicate *predEq = [NSPredicate predicateWithFormat:@"allTypesCol.floatCol = %f", 1.1];
    XCTAssertEqual([LinkToAllTypesObject objectsInRealm:realm withPredicate:predEq].count, 1U);
    NSPredicate *predLessEq = [NSPredicate predicateWithFormat:@"allTypesCol.floatCol <= %f", 1.1];
    XCTAssertEqual([LinkToAllTypesObject objectsInRealm:realm withPredicate:predLessEq].count, 1U);
    NSPredicate *predLess = [NSPredicate predicateWithFormat:@"allTypesCol.floatCol < %f", 1.1];
    XCTAssertEqual([LinkToAllTypesObject objectsInRealm:realm withPredicate:predLess].count, 0U);

    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.doubleCol = 1.11"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.doubleCol >= 1.11"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.doubleCol > 1.11"] count], 0U);

    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.longCol = 11"] count], 1U);
    XCTAssertEqual([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.longCol != 11"] count], 0U);

    XCTAssertEqual(([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.dateCol = %@", now] count]), 1U);
    XCTAssertEqual(([[realm objects:[LinkToAllTypesObject className] where:@"allTypesCol.dateCol != %@", now] count]), 0U);
}

- (void)testLinkQueryInvalid {
    XCTAssertThrows([LinkToAllTypesObject objectsWhere:@"allTypesCol.binaryCol = 'a'"], @"Binary data not supported");
    XCTAssertThrows([LinkToAllTypesObject objectsWhere:@"allTypesCol.mixedCol = 'a'"], @"Mixed data not supported");
    XCTAssertThrows([LinkToAllTypesObject objectsWhere:@"allTypesCol.invalidCol = 'a'"], @"Invalid column name should throw");

    XCTAssertThrows([LinkToAllTypesObject objectsWhere:@"allTypesCol.longCol = 'a'"], @"Wrong data type should throw");

    XCTAssertThrows([LinkToAllTypesObject objectsWhere:@"intArray.intCol > 5"], @"RLMArray query without ANY modifier should throw");
}


- (void)testLinkQueryMany
{
    RLMRealm *realm = [self realmWithTestPath];

    ArrayPropertyObject *arrPropObj1 = [[ArrayPropertyObject alloc] init];
    arrPropObj1.name = @"Test";
    for(NSUInteger i=0; i<10; i++) {
        StringObject *sobj = [[StringObject alloc] init];
        sobj.stringCol = [NSString stringWithFormat:@"%lu", (unsigned long)i];
        [arrPropObj1.array addObject:sobj];
        IntObject *iobj = [[IntObject alloc] init];
        iobj.intCol = (int)i;
        [arrPropObj1.intArray addObject:iobj];
    }
    [realm beginWriteTransaction];
    [realm addObject:arrPropObj1];
    [realm commitWriteTransaction];

    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY intArray.intCol > 10"] count], 0U);
    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY intArray.intCol > 5"] count], 1U);
    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY array.stringCol = '1'"] count], 1U);
    XCTAssertEqual([realm objects:[ArrayPropertyObject className] where:@"NONE intArray.intCol == 5"].count, 0U);
    XCTAssertEqual([realm objects:[ArrayPropertyObject className] where:@"NONE intArray.intCol > 10"].count, 1U);

    ArrayPropertyObject *arrPropObj2 = [[ArrayPropertyObject alloc] init];
    arrPropObj2.name = @"Test";
    for(NSUInteger i=0; i<4; i++) {
        StringObject *sobj = [[StringObject alloc] init];
        sobj.stringCol = [NSString stringWithFormat:@"%lu", (unsigned long)i];
        [arrPropObj2.array addObject:sobj];
        IntObject *iobj = [[IntObject alloc] init];
        iobj.intCol = (int)i;
        [arrPropObj2.intArray addObject:iobj];
    }
    [realm beginWriteTransaction];
    [realm addObject:arrPropObj2];
    [realm commitWriteTransaction];
    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY intArray.intCol > 10"] count], 0U);
    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY intArray.intCol > 5"] count], 1U);
    XCTAssertEqual([[realm objects:[ArrayPropertyObject className] where:@"ANY intArray.intCol > 2"] count], 2U);
    XCTAssertEqual([realm objects:[ArrayPropertyObject className] where:@"NONE intArray.intCol == 5"].count, 1U);
    XCTAssertEqual([realm objects:[ArrayPropertyObject className] where:@"NONE intArray.intCol > 10"].count, 2U);
}

- (void)testMultiLevelLinkQuery
{
    RLMRealm *realm = [self realmWithTestPath];

    [realm beginWriteTransaction];
    CircleObject *circle = nil;
    for (int i = 0; i < 5; ++i) {
        circle = [CircleObject createInRealm:realm withValue:@{@"data": [NSString stringWithFormat:@"%d", i],
                                                                @"next": circle ?: NSNull.null}];
    }
    [realm commitWriteTransaction];

    XCTAssertTrue([circle isEqualToObject:[CircleObject objectsInRealm:realm where:@"data = '4'"].firstObject]);
    XCTAssertTrue([circle isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.data = '3'"].firstObject]);
    XCTAssertTrue([circle isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.next.data = '2'"].firstObject]);
    XCTAssertTrue([circle isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.next.next.data = '1'"].firstObject]);
    XCTAssertTrue([circle isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.next.next.next.data = '0'"].firstObject]);
    XCTAssertTrue([circle.next isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.next.next.data = '0'"].firstObject]);
    XCTAssertTrue([circle.next.next isEqualToObject:[CircleObject objectsInRealm:realm where:@"next.next.data = '0'"].firstObject]);

    XCTAssertNoThrow(([CircleObject objectsInRealm:realm where:@"next = %@", circle]));
    XCTAssertThrows(([CircleObject objectsInRealm:realm where:@"next.next = %@", circle]));
    XCTAssertTrue([circle.next.next.next.next isEqualToObject:[CircleObject objectsInRealm:realm where:@"next = nil"].firstObject]);
}

- (void)testArrayMultiLevelLinkQuery
{
    RLMRealm *realm = [self realmWithTestPath];

    [realm beginWriteTransaction];
    CircleObject *circle = nil;
    for (int i = 0; i < 5; ++i) {
        circle = [CircleObject createInRealm:realm withValue:@{@"data": [NSString stringWithFormat:@"%d", i],
                                                                @"next": circle ?: NSNull.null}];
    }
    [CircleArrayObject createInRealm:realm withValue:@[[CircleObject allObjectsInRealm:realm]]];
    [realm commitWriteTransaction];

    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.data = '4'"].count);
    XCTAssertEqual(0U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.next.data = '4'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.next.data = '3'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.data = '3'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"NONE circles.next.data = '4'"].count);

    XCTAssertEqual(0U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.next.next.data = '3'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.next.next.data = '2'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.next.data = '2'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"ANY circles.data = '2'"].count);
    XCTAssertEqual(1U, [CircleArrayObject objectsInRealm:realm where:@"NONE circles.next.next.data = '3'"].count);

    XCTAssertThrows([CircleArrayObject objectsInRealm:realm where:@"ANY data = '2'"]);
    XCTAssertThrows([CircleArrayObject objectsInRealm:realm where:@"ANY circles.next = '2'"]);
    XCTAssertThrows([CircleArrayObject objectsInRealm:realm where:@"ANY data.circles = '2'"]);
    XCTAssertThrows([CircleArrayObject objectsInRealm:realm where:@"circles.data = '2'"]);
    XCTAssertThrows([CircleArrayObject objectsInRealm:realm where:@"NONE data.circles = '2'"]);
}

- (void)testClass:(Class)class
  withNormalCount:(NSUInteger)normalCount
         notCount:(NSUInteger)notCount
            where:(NSString *)predicateFormat, ...
{
    va_list args;
    va_start(args, predicateFormat);
    va_end(args);
    XCTAssertEqual(normalCount, [[class objectsWithPredicate:[NSPredicate predicateWithFormat:predicateFormat arguments:args]] count]);
    predicateFormat = [NSString stringWithFormat:@"NOT(%@)", predicateFormat];
    va_start(args, predicateFormat);
    va_end(args);
    XCTAssertEqual(notCount, [[class objectsWithPredicate:[NSPredicate predicateWithFormat:predicateFormat arguments:args]] count]);
}

- (void)testINPredicate
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    StringObject *so = [StringObject createInRealm:realm withValue:(@[@"abc"])];
    [AllTypesObject createInRealm:realm withValue:@[@YES, @1, @1.0f, @1.0, @"abc", [@"a" dataUsingEncoding:NSUTF8StringEncoding], [NSDate dateWithTimeIntervalSince1970:1], @YES, @1LL, @1, so]];
    [realm commitWriteTransaction];

    // Tests for each type always follow: none, some, more

    ////////////////////////
    // Literal Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"boolCol IN {NO}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"boolCol IN {YES}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"boolCol IN {NO, YES}"];

    // int
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"intCol IN {0, 2, 3}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"intCol IN {1}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"intCol IN {1, 2}"];

    // float
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"floatCol IN {0, 2, 3}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"floatCol IN {1}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"floatCol IN {1, 2}"];

    // double
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"doubleCol IN {0, 2, 3}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"doubleCol IN {1}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"doubleCol IN {1, 2}"];

    // NSString
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"stringCol IN {'abc'}"];
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"stringCol IN {'def'}"];
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"stringCol IN {'ABC'}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"stringCol IN[c] {'abc'}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"stringCol IN[c] {'ABC'}"];

    // NSData
    // Can't represent NSData with NSPredicate literal. See format predicates below

    // NSDate
    // Can't represent NSDate with NSPredicate literal. See format predicates below

    // bool
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"cBoolCol IN {NO}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"cBoolCol IN {YES}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"cBoolCol IN {NO, YES}"];

    // int64_t
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"longCol IN {0, 2, 3}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"longCol IN {1}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"longCol IN {1, 2}"];

    // mixed
    // FIXME: Support IN predicates with mixed properties
    XCTAssertThrows([AllTypesObject objectsWhere:@"mixedCol IN {0, 2, 3}"]);
    XCTAssertThrows([AllTypesObject objectsWhere:@"NOT(mixedCol IN {0, 2, 3})"]);

    // string subobject
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"objectCol.stringCol IN {'abc'}"];
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"objectCol.stringCol IN {'def'}"];
    [self testClass:[AllTypesObject class] withNormalCount:0 notCount:1 where:@"objectCol.stringCol IN {'ABC'}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"objectCol.stringCol IN[c] {'abc'}"];
    [self testClass:[AllTypesObject class] withNormalCount:1 notCount:0 where:@"objectCol.stringCol IN[c] {'ABC'}"];

    ////////////////////////
    // Format Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"boolCol IN %@", @[@NO]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"boolCol IN %@", @[@YES]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"boolCol IN %@", @[@NO, @YES]];

    // int
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"intCol IN %@", @[@0, @2, @3]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"intCol IN %@", @[@1]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"intCol IN %@", @[@1, @2]];

    // float
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"floatCol IN %@", @[@0, @2, @3]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"floatCol IN %@", @[@1]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"floatCol IN %@", @[@1, @2]];

    // double
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"doubleCol IN %@", @[@0, @2, @3]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"doubleCol IN %@", @[@1]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"doubleCol IN %@", @[@1, @2]];

    // NSString
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"stringCol IN %@", @[@"abc"]];
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"stringCol IN %@", @[@"def"]];
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"stringCol IN %@", @[@"ABC"]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"stringCol IN[c] %@", @[@"abc"]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"stringCol IN[c] %@", @[@"ABC"]];

    // NSData
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"binaryCol IN %@", @[[@"" dataUsingEncoding:NSUTF8StringEncoding]]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"binaryCol IN %@", @[[@"a" dataUsingEncoding:NSUTF8StringEncoding]]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"binaryCol IN %@", @[[@"a" dataUsingEncoding:NSUTF8StringEncoding], [@"b" dataUsingEncoding:NSUTF8StringEncoding]]];

    // NSDate
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"dateCol IN %@", @[[NSDate dateWithTimeIntervalSince1970:0]]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"dateCol IN %@", @[[NSDate dateWithTimeIntervalSince1970:1]]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"dateCol IN %@", @[[NSDate dateWithTimeIntervalSince1970:0], [NSDate dateWithTimeIntervalSince1970:1]]];

    // bool
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"cBoolCol IN %@", @[@NO]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"cBoolCol IN %@", @[@YES]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"cBoolCol IN %@", @[@NO, @YES]];

    // int64_t
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"longCol IN %@", @[@0, @2, @3]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"longCol IN %@", @[@1]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"longCol IN %@", @[@1, @2]];

    // mixed
    // FIXME: Support IN predicates with mixed properties
    XCTAssertThrows(([[AllTypesObject objectsWhere:@"mixedCol IN %@", @[@0, @2, @3]] count]));
    XCTAssertThrows(([[AllTypesObject objectsWhere:@"NOT(mixedCol IN %@)", @[@0, @2, @3]] count]));

    // string subobject
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"objectCol.stringCol IN %@", @[@"abc"]];
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"objectCol.stringCol IN %@", @[@"def"]];
    [self testClass:[AllTypesObject class] withNormalCount:0U notCount:1U where:@"objectCol.stringCol IN %@", @[@"ABC"]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"objectCol.stringCol IN[c] %@", @[@"abc"]];
    [self testClass:[AllTypesObject class] withNormalCount:1U notCount:0U where:@"objectCol.stringCol IN[c] %@", @[@"ABC"]];
}

- (void)testArrayIn
{
    RLMRealm *realm = [RLMRealm defaultRealm];
    [realm beginWriteTransaction];

    ArrayPropertyObject *arr = [ArrayPropertyObject createInRealm:realm withValue:@[@"name", @[], @[]]];
    [arr.array addObject:[StringObject createInRealm:realm withValue:@[@"value"]]];
    [realm commitWriteTransaction];


    XCTAssertEqual(0U, ([[ArrayPropertyObject objectsWhere:@"ANY array.stringCol IN %@", @[@"missing"]] count]));
    XCTAssertEqual(1U, ([[ArrayPropertyObject objectsWhere:@"ANY array.stringCol IN %@", @[@"value"]] count]));
    XCTAssertEqual(1U, ([[ArrayPropertyObject objectsWhere:@"NONE array.stringCol IN %@", @[@"missing"]] count]));
    XCTAssertEqual(0U, ([[ArrayPropertyObject objectsWhere:@"NONE array.stringCol IN %@", @[@"value"]] count]));

    XCTAssertEqual(0U, ([[ArrayPropertyObject objectsWhere:@"ANY array IN %@", [StringObject objectsWhere:@"stringCol = 'missing'"]] count]));
    XCTAssertEqual(1U, ([[ArrayPropertyObject objectsWhere:@"ANY array IN %@", [StringObject objectsWhere:@"stringCol = 'value'"]] count]));
    XCTAssertEqual(1U, ([[ArrayPropertyObject objectsWhere:@"NONE array IN %@", [StringObject objectsWhere:@"stringCol = 'missing'"]] count]));
    XCTAssertEqual(0U, ([[ArrayPropertyObject objectsWhere:@"NONE array IN %@", [StringObject objectsWhere:@"stringCol = 'value'"]] count]));
}

- (void)testQueryChaining {
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [PersonObject createInRealm:realm withValue:@[@"Tim", @29]];
    [PersonObject createInRealm:realm withValue:@[@"Ari", @33]];
    [realm commitWriteTransaction];

    XCTAssertEqual(1U, [[PersonObject objectsWhere:@"name == 'Ari'"] count]);
    XCTAssertEqual(0U, [[PersonObject objectsWhere:@"name == 'Ari' and age == 29"] count]);
    XCTAssertEqual(0U, [[[PersonObject objectsWhere:@"name == 'Ari'"] objectsWhere:@"age == 29"] count]);
}

- (void)testLinkViewQuery {
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [CompanyObject createInRealm:realm
                      withValue:@[@"company name", @[@{@"name": @"John", @"age": @30, @"hired": @NO},
                                                      @{@"name": @"Joe",  @"age": @40, @"hired": @YES},
                                                      @{@"name": @"Jill",  @"age": @50, @"hired": @YES}]]];
    [realm commitWriteTransaction];

    CompanyObject *co = [CompanyObject allObjects][0];
    XCTAssertEqual(1U, [co.employees objectsWhere:@"hired = NO"].count);
    XCTAssertEqual(2U, [co.employees objectsWhere:@"hired = YES"].count);
    XCTAssertEqual(1U, [co.employees objectsWhere:@"hired = YES AND age = 40"].count);
    XCTAssertEqual(0U, [co.employees objectsWhere:@"hired = YES AND age = 30"].count);
    XCTAssertEqual(3U, [co.employees objectsWhere:@"hired = YES OR age = 30"].count);
    XCTAssertEqual(1U, [[co.employees objectsWhere:@"hired = YES"] objectsWhere:@"name = 'Joe'"].count);
}

- (void)testLinkViewQueryLifetime {
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [CompanyObject createInRealm:realm
                      withValue:@[@"company name", @[@{@"name": @"John", @"age": @30, @"hired": @NO},
                                                      @{@"name": @"Jill",  @"age": @50, @"hired": @YES}]]];
    [EmployeeObject createInRealm:realm withValue:@{@"name": @"Joe",  @"age": @40, @"hired": @YES}];
    [realm commitWriteTransaction];

    RLMResults *subarray = nil;
    @autoreleasepool {
        __attribute((objc_precise_lifetime)) CompanyObject *co = [CompanyObject allObjects][0];
        subarray = [co.employees objectsWhere:@"age = 40"];
        XCTAssertEqual(0U, subarray.count);
    }

    [realm beginWriteTransaction];
    @autoreleasepool {
        __attribute((objc_precise_lifetime)) CompanyObject *co = [CompanyObject allObjects][0];
        [co.employees addObject:[EmployeeObject createInRealm:realm withValue:@{@"name": @"Joe",  @"age": @40, @"hired": @YES}]];
    }
    [realm commitWriteTransaction];

    XCTAssertEqual(1U, subarray.count);
    XCTAssertEqualObjects(@"Joe", subarray[0][@"name"]);
}

- (void)testLinkViewQueryLiveUpdate {
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [CompanyObject createInRealm:realm
                      withValue:@[@"company name", @[@{@"name": @"John", @"age": @30, @"hired": @NO},
                                                      @{@"name": @"Jill",  @"age": @40, @"hired": @YES}]]];
    EmployeeObject *eo = [EmployeeObject createInRealm:realm withValue:@{@"name": @"Joe",  @"age": @40, @"hired": @YES}];
    [realm commitWriteTransaction];

    CompanyObject *co = CompanyObject.allObjects.firstObject;
    RLMResults *basic = [co.employees objectsWhere:@"age = 40"];
    RLMResults *sort = [co.employees sortedResultsUsingProperty:@"name" ascending:YES];
    RLMResults *sortQuery = [[co.employees sortedResultsUsingProperty:@"name" ascending:YES] objectsWhere:@"age = 40"];
    RLMResults *querySort = [[co.employees objectsWhere:@"age = 40"] sortedResultsUsingProperty:@"name" ascending:YES];

    XCTAssertEqual(1U, basic.count);
    XCTAssertEqual(2U, sort.count);
    XCTAssertEqual(1U, sortQuery.count);
    XCTAssertEqual(1U, querySort.count);

    XCTAssertEqualObjects(@"Jill", [[basic lastObject] name]);
    XCTAssertEqualObjects(@"Jill", [[sortQuery lastObject] name]);
    XCTAssertEqualObjects(@"Jill", [[querySort lastObject] name]);

    [realm beginWriteTransaction];
    [co.employees addObject:eo];
    [realm commitWriteTransaction];

    XCTAssertEqual(2U, basic.count);
    XCTAssertEqual(3U, sort.count);
    XCTAssertEqual(2U, sortQuery.count);
    XCTAssertEqual(2U, querySort.count);

    XCTAssertEqualObjects(@"Joe", [[basic lastObject] name]);
    XCTAssertEqualObjects(@"Joe", [[sortQuery lastObject] name]);
    XCTAssertEqualObjects(@"Joe", [[querySort lastObject] name]);
}

- (void)testConstantPredicates
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [PersonObject createInRealm:realm withValue:@[@"Fiel", @27]];
    [PersonObject createInRealm:realm withValue:@[@"Tim", @29]];
    [PersonObject createInRealm:realm withValue:@[@"Ari", @33]];
    [realm commitWriteTransaction];

    RLMResults *all = [PersonObject objectsWithPredicate:[NSPredicate predicateWithValue:YES]];
    XCTAssertEqual(all.count, 3U, @"Expecting 3 results");

    RLMResults *none = [PersonObject objectsWithPredicate:[NSPredicate predicateWithValue:NO]];
    XCTAssertEqual(none.count, 0U, @"Expecting 0 results");
}

- (void)testEmptyCompoundPredicates
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [PersonObject createInRealm:realm withValue:@[@"Fiel", @27]];
    [PersonObject createInRealm:realm withValue:@[@"Tim", @29]];
    [PersonObject createInRealm:realm withValue:@[@"Ari", @33]];
    [realm commitWriteTransaction];

    RLMResults *all = [PersonObject objectsWithPredicate:[NSCompoundPredicate andPredicateWithSubpredicates:@[]]];
    XCTAssertEqual(all.count, 3U, @"Expecting 3 results");

    RLMResults *none = [PersonObject objectsWithPredicate:[NSCompoundPredicate orPredicateWithSubpredicates:@[]]];
    XCTAssertEqual(none.count, 0U, @"Expecting 0 results");
}

- (void)testComparisonsWithKeyPathOnRHS
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];

    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @1, @2, @23.0f, @1.7f,  @0.0,  @5.55, @"a", @"a"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @1, @3, @-5.3f, @4.21f, @1.0,  @4.44, @"a", @"A"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @NO,  @2, @2, @1.0f,  @3.55f, @99.9, @6.66, @"a", @"ab"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @YES, @3, @6, @4.21f, @1.0f,  @1.0,  @7.77, @"a", @"AB"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @YES, @4, @5, @23.0f, @23.0f, @7.4,  @8.88, @"a", @"b"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@YES, @NO,  @15, @8, @1.0f,  @66.0f, @1.01, @9.99, @"a", @"ba"]];
    [self.queryObjectClass createInRealm:realm withValue:@[@NO,  @YES, @15, @15, @1.0f,  @66.0f, @1.01, @9.99, @"a", @"BA"]];

    [realm commitWriteTransaction];

    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"TRUE == bool1"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"TRUE != bool2"].count);

    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"1 == int1"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"2 != int2"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"2 > int1"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"2 < int1"].count);
    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"2 >= int1"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"2 <= int1"].count);

    XCTAssertEqual(3U, [self.queryObjectClass objectsWhere:@"1.0 == float1"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"1.0 != float2"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"1.0 > float1"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"1.0 < float2"].count);
    XCTAssertEqual(4U, [self.queryObjectClass objectsWhere:@"1.0 >= float1"].count);
    XCTAssertEqual(7U, [self.queryObjectClass objectsWhere:@"1.0 <= float2"].count);

    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"1.0 == double1"].count);
    XCTAssertEqual(5U, [self.queryObjectClass objectsWhere:@"1.0 != double1"].count);
    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"5.0 > double2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"5.0 < double2"].count);
    XCTAssertEqual(2U, [self.queryObjectClass objectsWhere:@"5.55 >= double2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"5.55 <= double2"].count);

    XCTAssertEqual(1U, [self.queryObjectClass objectsWhere:@"'a' == string2"].count);
    XCTAssertEqual(6U, [self.queryObjectClass objectsWhere:@"'a' != string2"].count);

    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"'Realm' CONTAINS string1"].count,
                                      @"Operator 'CONTAINS' is not supported .* right side");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"'Amazon' BEGINSWITH string2"].count,
                                      @"Operator 'BEGINSWITH' is not supported .* right side");
    RLMAssertThrowsWithReasonMatching([self.queryObjectClass objectsWhere:@"'Tuba' ENDSWITH string1"].count,
                                      @"Operator 'ENDSWITH' is not supported .* right side");
}

@end

@interface NullQueryTests : QueryTests
@end

@implementation NullQueryTests
- (Class)queryObjectClass {
    return [NullQueryObject class];
}

- (void)testQueryOnNullableStringColumn {
    void (^testWithStringClass)(Class) = ^(Class stringObjectClass) {
        RLMRealm *realm = [RLMRealm defaultRealm];
        [realm transactionWithBlock:^{
            [stringObjectClass createInRealm:realm withValue:@[@"a"]];
            [stringObjectClass createInRealm:realm withValue:@[NSNull.null]];
            [stringObjectClass createInRealm:realm withValue:@[@"b"]];
            [stringObjectClass createInRealm:realm withValue:@[NSNull.null]];
            [stringObjectClass createInRealm:realm withValue:@[@""]];
        }];

        RLMResults *allObjects = [stringObjectClass allObjectsInRealm:realm];
        XCTAssertEqual(5U, allObjects.count);

        RLMResults *nilStrings = [stringObjectClass objectsInRealm:realm where:@"stringCol = NULL"];
        XCTAssertEqual(2U, nilStrings.count);
        XCTAssertEqualObjects((@[NSNull.null, NSNull.null]), [nilStrings valueForKey:@"stringCol"]);

        RLMResults *nonNilStrings = [stringObjectClass objectsInRealm:realm where:@"stringCol != NULL"];
        XCTAssertEqual(3U, nonNilStrings.count);
        XCTAssertEqualObjects((@[@"a", @"b", @""]), [nonNilStrings valueForKey:@"stringCol"]);

        XCTAssertEqual(3U, [stringObjectClass objectsInRealm:realm where:@"stringCol IN {NULL, 'a'}"].count);

        XCTAssertEqual(1U, [stringObjectClass objectsInRealm:realm where:@"stringCol CONTAINS 'a'"].count);
        XCTAssertEqual(1U, [stringObjectClass objectsInRealm:realm where:@"stringCol BEGINSWITH 'a'"].count);
        XCTAssertEqual(1U, [stringObjectClass objectsInRealm:realm where:@"stringCol ENDSWITH 'a'"].count);

        XCTAssertEqual(0U, [stringObjectClass objectsInRealm:realm where:@"stringCol CONTAINS 'z'"].count);

        XCTAssertEqual(1U, [stringObjectClass objectsInRealm:realm where:@"stringCol = ''"].count);

        RLMResults *sorted = [[stringObjectClass allObjectsInRealm:realm] sortedResultsUsingProperty:@"stringCol" ascending:YES];
        XCTAssertEqualObjects((@[NSNull.null, NSNull.null, @"", @"a", @"b"]), [sorted valueForKey:@"stringCol"]);
        XCTAssertEqualObjects((@[@"b", @"a", @"", NSNull.null, NSNull.null]), [[sorted sortedResultsUsingProperty:@"stringCol" ascending:NO] valueForKey:@"stringCol"]);

        [realm transactionWithBlock:^{
            [realm deleteObject:[stringObjectClass allObjectsInRealm:realm].firstObject];
        }];

        XCTAssertEqual(2U, nilStrings.count);
        XCTAssertEqual(2U, nonNilStrings.count);

        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol CONTAINS ''"] valueForKey:@"stringCol"]);
        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol BEGINSWITH ''"] valueForKey:@"stringCol"]);
        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol ENDSWITH ''"] valueForKey:@"stringCol"]);
        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol CONTAINS[c] ''"] valueForKey:@"stringCol"]);
        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol BEGINSWITH[c] ''"] valueForKey:@"stringCol"]);
        XCTAssertEqualObjects([nonNilStrings valueForKey:@"stringCol"], [[stringObjectClass objectsInRealm:realm where:@"stringCol ENDSWITH[c] ''"] valueForKey:@"stringCol"]);

        XCTAssertEqualObjects(@[], ([[stringObjectClass objectsInRealm:realm where:@"stringCol CONTAINS %@", @"\0"] valueForKey:@"self"]));
        XCTAssertEqualObjects([[stringObjectClass allObjectsInRealm:realm] valueForKey:@"stringCol"], ([[StringObject objectsInRealm:realm where:@"stringCol CONTAINS NULL"] valueForKey:@"stringCol"]));
    };
    testWithStringClass([StringObject class]);
    testWithStringClass([IndexedStringObject class]);
}

- (void)testQueryingOnLinkToNullableStringColumn {
    void (^testWithStringClass)(Class, Class) = ^(Class stringLinkClass, Class stringObjectClass) {
        RLMRealm *realm = [RLMRealm defaultRealm];
        [realm transactionWithBlock:^{
            [stringLinkClass createInRealm:realm withValue:@[[stringObjectClass createInRealm:realm withValue:@[@"a"]]]];
            [stringLinkClass createInRealm:realm withValue:@[[stringObjectClass createInRealm:realm withValue:@[NSNull.null]]]];
            [stringLinkClass createInRealm:realm withValue:@[[stringObjectClass createInRealm:realm withValue:@[@"b"]]]];
            [stringLinkClass createInRealm:realm withValue:@[[stringObjectClass createInRealm:realm withValue:@[NSNull.null]]]];
            [stringLinkClass createInRealm:realm withValue:@[[stringObjectClass createInRealm:realm withValue:@[@""]]]];
        }];

        RLMResults *nilStrings = [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol = NULL"];
        XCTAssertEqual(2U, nilStrings.count);
        XCTAssertEqualObjects((@[NSNull.null, NSNull.null]), [nilStrings valueForKeyPath:@"objectCol.stringCol"]);

        RLMResults *nonNilStrings = [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol != NULL"];
        XCTAssertEqual(3U, nonNilStrings.count);
        XCTAssertEqualObjects((@[@"a", @"b", @""]), [nonNilStrings valueForKeyPath:@"objectCol.stringCol"]);

        XCTAssertEqual(3U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol IN {NULL, 'a'}"].count);

        XCTAssertEqual(1U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol CONTAINS 'a'"].count);
        XCTAssertEqual(1U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol BEGINSWITH 'a'"].count);
        XCTAssertEqual(1U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol ENDSWITH 'a'"].count);

        XCTAssertEqual(0U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol CONTAINS 'z'"].count);

        XCTAssertEqual(1U, [stringLinkClass objectsInRealm:realm where:@"objectCol.stringCol = ''"].count);
    };

    testWithStringClass([LinkStringObject class], [StringObject class]);
    testWithStringClass([LinkIndexedStringObject class], [IndexedStringObject class]);
}

- (void)testSortingColumnsWithNull {
    RLMRealm *realm = [RLMRealm defaultRealm];
    [realm beginWriteTransaction];

    {
        NumberObject *no1 = [NumberObject createInRealm:realm withValue:@[@1, @1.1f, @1.1, @YES]];
        NumberObject *noNull = [NumberObject createInRealm:realm withValue:@[NSNull.null, NSNull.null, NSNull.null, NSNull.null]];
        NumberObject *no0 = [NumberObject createInRealm:realm withValue:@[@0, @0.0f, @0.0, @NO]];
        for (RLMProperty *property in [[NumberObject alloc] init].objectSchema.properties) {
            NSString *name = property.name;
            RLMResults *ascending = [[NumberObject allObjectsInRealm:realm] sortedResultsUsingProperty:name ascending:YES];
            XCTAssertEqualObjects([ascending valueForKey:name], ([@[noNull, no0, no1] valueForKey:name]));

            RLMResults *descending = [[NumberObject allObjectsInRealm:realm] sortedResultsUsingProperty:name ascending:NO];
            XCTAssertEqualObjects([descending valueForKey:name], ([@[no1, no0, noNull] valueForKey:name]));
        }
    }

    {
        DateObject *doPositive = [DateObject createInRealm:realm withValue:@[[NSDate dateWithTimeIntervalSince1970:100]]];
        DateObject *doNegative = [DateObject createInRealm:realm withValue:@[[NSDate dateWithTimeIntervalSince1970:-100]]];
        DateObject *doZero = [DateObject createInRealm:realm withValue:@[[NSDate dateWithTimeIntervalSince1970:0]]];
        DateObject *doNull = [DateObject createInRealm:realm withValue:@[NSNull.null]];

        RLMResults *ascending = [[DateObject allObjectsInRealm:realm] sortedResultsUsingProperty:@"dateCol" ascending:YES];
        XCTAssertEqualObjects([ascending valueForKey:@"dateCol"], ([@[doNull, doNegative, doZero, doPositive] valueForKey:@"dateCol"]));

        RLMResults *descending = [[DateObject allObjectsInRealm:realm] sortedResultsUsingProperty:@"dateCol" ascending:NO];
        XCTAssertEqualObjects([descending valueForKey:@"dateCol"], ([@[doPositive, doZero, doNegative, doNull] valueForKey:@"dateCol"]));
    }

    {
        StringObject *soA = [StringObject createInRealm:realm withValue:@[@"A"]];
        StringObject *soEmpty = [StringObject createInRealm:realm withValue:@[@""]];
        StringObject *soB = [StringObject createInRealm:realm withValue:@[@"B"]];
        StringObject *soNull = [StringObject createInRealm:realm withValue:@[NSNull.null]];
        StringObject *soAB = [StringObject createInRealm:realm withValue:@[@"AB"]];

        RLMResults *ascending = [[StringObject allObjectsInRealm:realm] sortedResultsUsingProperty:@"stringCol" ascending:YES];
        XCTAssertEqualObjects([ascending valueForKey:@"stringCol"], ([@[soNull, soEmpty, soA, soAB, soB] valueForKey:@"stringCol"]));

        RLMResults *descending = [[StringObject allObjectsInRealm:realm] sortedResultsUsingProperty:@"stringCol" ascending:NO];
        XCTAssertEqualObjects([descending valueForKey:@"stringCol"], ([@[soB, soAB, soA, soEmpty, soNull] valueForKey:@"stringCol"]));
    }

    [realm cancelWriteTransaction];
}

- (void)testCountOnCollection {
    RLMRealm *realm = [RLMRealm defaultRealm];
    [realm beginWriteTransaction];

    IntegerArrayPropertyObject *arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @1234, @[]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @456 ]]];

    arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @4567, @[]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @1 ]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @2 ]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @3 ]]];

    arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @4567, @[]]];

    [realm commitWriteTransaction];

    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"array.@count > 0"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@count == 3"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@count < 1"].count));
    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"0 < array.@count"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"3 == array.@count"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"1 >  array.@count"].count));

    // We do not yet handle collection operations with a keypath on the other side of the comparison.
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@count != number"]), @"'array.@count' not found in object");

    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@count.foo.bar != 0"]), @"single level key");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@count.intCol > 0"]), @"@count does not have any properties");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@count != 'Hello'"]), @"@count can only be compared with a numeric value");
}

- (void)testAggregateCollectionOperators {
    RLMRealm *realm = [RLMRealm defaultRealm];
    [realm beginWriteTransaction];

    IntegerArrayPropertyObject *arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @1111, @[] ]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @1234 ]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @2 ]]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @-12345 ]]];

    arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @2222, @[] ]];
    [arr.array addObject:[IntObject createInRealm:realm withValue:@[ @100 ]]];

    arr = [IntegerArrayPropertyObject createInRealm:realm withValue:@[ @3333, @[] ]];

    [realm commitWriteTransaction];

    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol == -12345"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol == 100"].count));
    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol < 1000"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol > -1000"].count));

    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol == 1234"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol == 100"].count));
    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol > -1000"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol > 1000"].count));

    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol == 100"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol == -11109"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol == 0"].count));
    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol > -50"].count));
    XCTAssertEqual(2U, ([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol < 50"].count));

    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol == 100"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol == -3703.0"].count));
    XCTAssertEqual(0U, ([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol == 0"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol < -50"].count));
    XCTAssertEqual(1U, ([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol > 50"].count));

    // We do not yet handle collection operations with a keypath on the other side of the comparison.
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol == number"]), @"'array.@min.intCol' not found in object");

    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol.foo.bar == 1.23"]), @"single level key");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol.foo.bar == 1.23"]), @"single level key");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol.foo.bar == 1.23"]), @"single level key");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@avg.intCol.foo.bar == 1.23"]), @"single level key");

    // Average is omitted from this test as its result is always a double.
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@min.intCol == 1.23"]), @"@min.*type int cannot be compared");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@max.intCol == 1.23"]), @"@max.*type int cannot be compared");
    RLMAssertThrowsWithReasonMatching(([IntegerArrayPropertyObject objectsWhere:@"array.@sum.intCol == 1.23"]), @"@sum.*type int cannot be compared");
}

struct NullTestData {
    __unsafe_unretained NSString *propertyName;
    __unsafe_unretained NSString *nonMatchingStr;
    __unsafe_unretained NSString *matchingStr;
    __unsafe_unretained id nonMatchingValue;
    __unsafe_unretained id matchingValue;
    bool orderable;
    bool substringOperations;
};

- (void)testPrimitiveOperatorsOnAllNullablePropertyTypes {
    RLMRealm *realm = [RLMRealm defaultRealm];

    // nil on LHS is currently not supported by core
    XCTAssertThrows([AllOptionalTypes objectsWhere:@"nil = boolObj"]);

    // These need to be stored in variables because the struct does not retain them
    NSData *matchingData = [@"" dataUsingEncoding:NSUTF8StringEncoding];
    NSData *notMatchingData = [@"a" dataUsingEncoding:NSUTF8StringEncoding];
    NSDate *matchingDate = [NSDate dateWithTimeIntervalSince1970:1];
    NSDate *notMatchingDate = [NSDate dateWithTimeIntervalSince1970:2];

    struct NullTestData data[] = {
        {@"boolObj", @"YES", @"NO", @YES, @NO},
        {@"intObj", @"1", @"0", @1, @0, true},
        {@"floatObj", @"1", @"0", @1, @0, true},
        {@"doubleObj", @"1", @"0", @1, @0, true},
        {@"string", @"'a'", @"''", @"a", @"", false, true},
        {@"data", nil, nil, notMatchingData, matchingData},
        {@"date", nil, nil, notMatchingDate, matchingDate, true},
    };

    // Assert that the query "prop op value" gives expectedCount results when
    // assembled via string formatting
#define RLMAssertCountWithString(expectedCount, op, prop, value) \
    do { \
        NSString *queryStr = [NSString stringWithFormat:@"%@ " #op " %@", prop, value]; \
        NSUInteger actual = [AllOptionalTypes objectsWhere:queryStr].count; \
        XCTAssertEqual(expectedCount, actual, @"%@: expected %@, got %@", queryStr, @(expectedCount), @(actual)); \
    } while (0)

    // Assert that the query "prop op value" gives expectedCount results when
    // assembled via predicateWithFormat
#define RLMAssertCountWithPredicate(expectedCount, op, prop, value) \
    do { \
        NSPredicate *query = [NSPredicate predicateWithFormat:@"%K " #op " %@", prop, value]; \
        NSUInteger actual = [AllOptionalTypes objectsWithPredicate:query].count; \
        XCTAssertEqual(expectedCount, actual, @"%@ " #op " %@: expected %@, got %@", prop, value, @(expectedCount), @(actual)); \
    } while (0)

    // Assert that the given operator gives the expected count for each of the
    // stored value, a different value, and nil
#define RLMAssertOperator(op, matchingCount, notMatchingCount, nilCount) \
    do { \
        if (d.matchingStr) { \
            RLMAssertCountWithString(matchingCount, op, d.propertyName, d.matchingStr); \
            RLMAssertCountWithString(notMatchingCount, op, d.propertyName, d.nonMatchingStr); \
        } \
        RLMAssertCountWithString(nilCount, op, d.propertyName, nil); \
 \
        RLMAssertCountWithPredicate(matchingCount, op, d.propertyName, d.matchingValue); \
        RLMAssertCountWithPredicate(notMatchingCount, op, d.propertyName, d.nonMatchingValue); \
        RLMAssertCountWithPredicate(nilCount, op, d.propertyName, nil); \
    } while (0)

    // First test with the `matchingValue` stored in each property

    [realm beginWriteTransaction];
    [AllOptionalTypes createInRealm:realm withValue:@[@NO, @0, @0, @0, @"", matchingData, matchingDate]];
    [realm commitWriteTransaction];

    for (size_t i = 0; i < sizeof(data) / sizeof(data[0]); ++i) {
        struct NullTestData d = data[i];
        RLMAssertOperator(=,  1U, 0U, 0U);
        RLMAssertOperator(!=, 0U, 1U, 1U);

        if (d.orderable) {
            RLMAssertOperator(<,  0U, 1U, 0U);
            RLMAssertOperator(<=, 1U, 1U, 0U);
            RLMAssertOperator(>,  0U, 0U, 0U);
            RLMAssertOperator(>=, 1U, 0U, 0U);
        }
        if (d.substringOperations) {
            RLMAssertOperator(BEGINSWITH, 1U, 0U, 1U);
            RLMAssertOperator(ENDSWITH, 1U, 0U, 1U);
            RLMAssertOperator(CONTAINS, 1U, 0U, 1U);
        }
    }

    // Retest with all properties nil

    [realm beginWriteTransaction];
    [realm deleteAllObjects];
    [AllOptionalTypes createInRealm:realm withValue:@[NSNull.null, NSNull.null,
                                                      NSNull.null, NSNull.null,
                                                      NSNull.null, NSNull.null,
                                                      NSNull.null]];
    [realm commitWriteTransaction];

    for (size_t i = 0; i < sizeof(data) / sizeof(data[0]); ++i) {
        struct NullTestData d = data[i];
        RLMAssertOperator(=, 0U, 0U, 1U);
        RLMAssertOperator(!=, 1U, 1U, 0U);

        if (d.orderable) {
            RLMAssertOperator(<,  0U, 0U, 0U);
            RLMAssertOperator(<=, 0U, 0U, 1U);
            RLMAssertOperator(>,  0U, 0U, 0U);
            RLMAssertOperator(>=, 0U, 0U, 1U);
        }
        if (d.substringOperations) {
            RLMAssertOperator(BEGINSWITH, 0U, 0U, 1U);
            RLMAssertOperator(ENDSWITH, 0U, 0U, 1U);
            RLMAssertOperator(CONTAINS, 0U, 0U, 1U);
        }
    }
}

- (void)testINPredicateOnNullWithNonNullValues
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [AllOptionalTypes createInRealm:realm withValue:@[@YES, @1, @1, @1, @"abc",
                                                      [@"a" dataUsingEncoding:NSUTF8StringEncoding],
                                                      [NSDate dateWithTimeIntervalSince1970:1]]];
    [realm commitWriteTransaction];

    ////////////////////////
    // Literal Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"boolObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"boolObj IN {YES}"];

    // int
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"intObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"intObj IN {1}"];

    // float
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"floatObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"floatObj IN {1}"];

    // double
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"doubleObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"doubleObj IN {1}"];

    // NSString
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"string IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"string IN {'abc'}"];

    // NSData
    // Can't represent NSData with NSPredicate literal. See format predicates below

    // NSDate
    // Can't represent NSDate with NSPredicate literal. See format predicates below

    ////////////////////////
    // Format Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"boolObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"boolObj IN %@", @[@YES]];

    // int
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"intObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"intObj IN %@", @[@1]];

    // float
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"floatObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"floatObj IN %@", @[@1]];

    // double
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"doubleObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"doubleObj IN %@", @[@1]];

    // NSString
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"string IN %@", @[@"abc"]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"string IN %@", @[NSNull.null]];

    // NSData
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"data IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"data IN %@", @[[@"a" dataUsingEncoding:NSUTF8StringEncoding]]];

    // NSDate
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"date IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"date IN %@", @[[NSDate dateWithTimeIntervalSince1970:1]]];
}

- (void)testINPredicateOnNullWithNullValues
{
    RLMRealm *realm = [RLMRealm defaultRealm];

    [realm beginWriteTransaction];
    [AllOptionalTypes createInRealm:realm withValue:@[NSNull.null, NSNull.null,
                                                      NSNull.null, NSNull.null,
                                                      NSNull.null, NSNull.null,
                                                      NSNull.null]];
    [realm commitWriteTransaction];

    ////////////////////////
    // Literal Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"boolObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"boolObj IN {YES}"];

    // int
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"intObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"intObj IN {1}"];

    // float
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"floatObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"floatObj IN {1}"];

    // double
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"doubleObj IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"doubleObj IN {1}"];

    // NSString
    [self testClass:[AllOptionalTypes class] withNormalCount:1 notCount:0 where:@"string IN {NULL}"];
    [self testClass:[AllOptionalTypes class] withNormalCount:0 notCount:1 where:@"string IN {'abc'}"];

    // NSData
    // Can't represent NSData with NSPredicate literal. See format predicates below

    // NSDate
    // Can't represent NSDate with NSPredicate literal. See format predicates below

    ////////////////////////
    // Format Predicates
    ////////////////////////

    // BOOL
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"boolObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"boolObj IN %@", @[@YES]];

    // int
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"intObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"intObj IN %@", @[@1]];

    // float
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"floatObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"floatObj IN %@", @[@1]];

    // double
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"doubleObj IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"doubleObj IN %@", @[@1]];

    // NSString
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"string IN %@", @[@"abc"]];
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"string IN %@", @[NSNull.null]];

    // NSData
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"data IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"data IN %@", @[[@"a" dataUsingEncoding:NSUTF8StringEncoding]]];

    // NSDate
    [self testClass:[AllOptionalTypes class] withNormalCount:1U notCount:0U where:@"date IN %@", @[NSNull.null]];
    [self testClass:[AllOptionalTypes class] withNormalCount:0U notCount:1U where:@"date IN %@", @[[NSDate dateWithTimeIntervalSince1970:1]]];
}
*/

