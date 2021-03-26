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


"use strict";

var Realm = require("realm");
var TestCase = require("./asserts");
var testCases = require("./query-tests.json");
var schemas = require("./schemas");
const {Decimal128, ObjectId} = require("bson");
const {UUID} = require("../../lib/temp/uuid"); // TODO: replace with the one from bson, once updated.

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

typeConverters["date"] = (value) => new Date(value);
typeConverters["data"] = (value) => new Uint8Array(value);
typeConverters["object"] = convertValue;
typeConverters["objectId"] = (value) => new ObjectId(value);
typeConverters["uuid"] = (value) => new UUID(value);

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
        var type;
        var args;
        var results;

        if (test[0] == "QueryCount") {
            type = test[2];
            args = getArgs(3);
            results = realm.objects(type);

            var length = results.filtered.apply(results, args).length;
            TestCase.assertEqual(test[1], length, "Query '" + args[0] + "' on type '" + type + "' expected " + test[1] + " results, got " + length);
        }
        else if (test[0] == "ObjectSet") {
            type = test[2];
            args = getArgs(3);
            results = realm.objects(type);
            results = results.filtered.apply(results, args);

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
            type = test[1];
            args = getArgs(2);
            results = realm.objects(type);

            TestCase.assertThrows(function() {
                results.filtered.apply(results, args);
            }, "Expected exception not thrown for query: " + JSON.stringify(args));
        }
        else if (test[0] != "Disabled") {
            throw "Invalid query test '" + test[0] + "'";
        }
    }
}


module.exports = {
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
    testObjectIdQueries: function() {
        runQuerySuite(testCases.objectIdTests);
    },
    testUUIDQueries: function() {
        runQuerySuite(testCases.uuidTests);
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
    },
    testOptionalQueries: function() {
        runQuerySuite(testCases.optionalTests);
    },
    testOrderingQueries: function() {
        runQuerySuite(testCases.orderingTests);
    },
    testListOfPrimitiveQueries: function() {
        runQuerySuite(testCases.primitiveListTests);
    },
    testMalformedQueries: function() {
        var realm = new Realm({ schema: [schemas.StringOnly] });
        TestCase.assertThrowsContaining(function() {
            realm.objects(schemas.StringOnly.name).filtered("stringCol = $0");
        }, "Request for argument at index 0 but no arguments are provided");
    },
    testOrQueries_Float: function() {
        var realm = new Realm({ schema: [schemas.FloatOnly] });
        realm.write(function() {
            realm.create(schemas.FloatOnly.name, { floatCol: 1.0 });
            realm.create(schemas.FloatOnly.name, { floatCol: 2.0 });
        });

        var objects_1 = realm.objects(schemas.FloatOnly.name).filtered("floatCol = 1.0 || floatCol = 2.0");
        TestCase.assertEqual(objects_1.length, 2);

        var objects_2 = realm.objects(schemas.FloatOnly.name).filtered("floatCol = 1.0 || floatCol = 3.0");
        TestCase.assertEqual(objects_2.length, 1);

        var objects_3 = realm.objects(schemas.FloatOnly.name).filtered("floatCol = 0.0 || floatCol = 3.0");
        TestCase.assertEqual(objects_3.length, 0);

        realm.close();
    },

    testOrQueries_Double: function() {
        var realm = new Realm({ schema: [schemas.DoubleOnly] });
        realm.write(function() {
            realm.create(schemas.DoubleOnly.name, { doubleCol: 1.0 });
            realm.create(schemas.DoubleOnly.name, { doubleCol: 2.0 });
            realm.create(schemas.DoubleOnly.name, {});
        });

        var objects_1 = realm.objects(schemas.DoubleOnly.name).filtered("doubleCol = 1.0 || doubleCol = 2.0");
        TestCase.assertEqual(objects_1.length, 2);

        var objects_2 = realm.objects(schemas.DoubleOnly.name).filtered("doubleCol = 1.0 || doubleCol = 3.0");
        TestCase.assertEqual(objects_2.length, 1);

        var objects_3 = realm.objects(schemas.DoubleOnly.name).filtered("doubleCol = 0.0 || doubleCol = 3.0");
        TestCase.assertEqual(objects_3.length, 0);

        var objects_4 = realm.objects(schemas.DoubleOnly.name).filtered("doubleCol = null || doubleCol = 3.0");
        TestCase.assertEqual(objects_4.length, 1);

        realm.close();
    },

    testInQuery: function() {
        var realm = new Realm({ schema: [schemas.StringOnly, schemas.IntOnly] });
        realm.write(function() {
            [1, 2, 3, 5, 8, 13].forEach(v => {
                realm.create(schemas.IntOnly.name, { intCol: v });
                realm.create(schemas.StringOnly.name, { stringCol: `${v}` });
            });
        });

        TestCase.assertEqual(realm.objects(schemas.IntOnly.name).filtered([2, 3, 8].map(v => `intCol == ${v}`).join(" OR ")).length, 3);
        TestCase.assertEqual(realm.objects(schemas.StringOnly.name).filtered([2, 3, 8].map(v => `stringCol == '${v}'`).join(" OR ")).length, 3);

        TestCase.assertEqual(realm.objects(schemas.IntOnly.name).filtered([3, 7, 8].map(v => `intCol == ${v}`).join(" OR ")).length, 2);
        TestCase.assertEqual(realm.objects(schemas.StringOnly.name).filtered([3, 7, 8].map(v => `stringCol == '${v}'`).join(" OR ")).length, 2);

        TestCase.assertEqual(realm.objects(schemas.IntOnly.name).filtered([0, 14].map(v => `intCol == ${v}`).join(" OR ")).length, 0);
        TestCase.assertEqual(realm.objects(schemas.StringOnly.name).filtered([0, 14].map(v => `stringCol == '${v}'`).join(" OR ")).length, 0);
    },

    testQueryDecimal: function() {
        var realm = new Realm({ schema: [schemas.Decimal128Object] });
        realm.write(function () {
            [0, 1, 2].forEach(v => {
                realm.create(schemas.Decimal128Object.name, { decimal128Col: Decimal128.fromString(`1000${v}`) });
            });
        });

        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col <  10002").length, 2);
        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col <= 10002").length, 3);
        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col >  10001").length, 1);
        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col >= 10001").length, 2);
        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col == 10002").length, 1);
        TestCase.assertEqual(realm.objects(schemas.Decimal128Object.name).filtered("decimal128Col != 10002").length, 2);

        realm.close();
    }
};
