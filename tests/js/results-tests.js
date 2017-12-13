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
var TestCase = require('./asserts');
var schemas = require('./schemas');

module.exports = {
    testResultsConstructor: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');

        TestCase.assertTrue(objects instanceof Realm.Results);
        TestCase.assertTrue(objects instanceof Realm.Collection);

        TestCase.assertThrows(function() {
            new Realm.Results();
        });

        TestCase.assertEqual(typeof Realm.Results, 'function');
        TestCase.assertTrue(Realm.Results instanceof Function);
    },

    testResultsLength: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 0);

        realm.write(function() {
            realm.create('TestObject', {doubleCol: 1});
            TestCase.assertEqual(objects.length, 1);
        });
        TestCase.assertEqual(objects.length, 1);
    },

    testResultsSubscript: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});
        TestCase.assertEqual(realm.objects('PersonObject')[0], undefined);

        realm.write(function() {
            realm.create('PersonObject', {name: 'name1', age: 1});
            realm.create('PersonObject', {name: 'name2', age: 2});
        });

        var people = realm.objects('PersonObject');
        TestCase.assertEqual(people[0].age, 1);
        TestCase.assertEqual(people[1].age, 2);
        TestCase.assertEqual(people[2], undefined);
        TestCase.assertEqual(people[-1], undefined);
        TestCase.assertTrue(Object.getPrototypeOf(people[0]) === schemas.PersonObject.prototype);
        TestCase.assertTrue(people[0] instanceof schemas.PersonObject);
    },

    testResultsReadonly: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');

        realm.write(function() {
            realm.create('TestObject', {doubleCol: 1});
        });

        TestCase.assertThrows(function() {
            objects[-1] = {doubleCol: 0};
        });
        TestCase.assertThrows(function() {
            objects[0] = {doubleCol: 0};
        });
        TestCase.assertThrows(function() {
            objects[1] = {doubleCol: 0};
        });
        TestCase.assertThrows(function() {
            objects.length = 0;
        });
    },

    testResultsInvalidProperty: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');
        TestCase.assertEqual(undefined, objects.ablasdf);
    },

    testResultsInvalidObjectType: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        TestCase.assertThrows(function() {
            realm.objects('NotTestObject');
        });
    },

    testResultsEnumerate: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');
        var index;

        for (index in objects) {
            TestCase.assertTrue(false, "No objects should have been enumerated");
        }

        realm.write(function() {
            realm.create('TestObject', {doubleCol: 1});
            TestCase.assertEqual(objects.length, 1);
        });

        var count = 0;
        var keys = Object.keys(objects);
        for (index in objects) {
            TestCase.assertEqual(count++, +index);
            TestCase.assertEqual(keys[index], index);
        }

        TestCase.assertEqual(count, 1);
        TestCase.assertEqual(keys.length, 1);
    },

    testResultsFiltered: function() {
        var realm = new Realm({schema: [schemas.PersonObject, schemas.DefaultValues, schemas.TestObject]});

        realm.write(function() {
            realm.create('PersonObject', {name: 'Ari', age: 10});
            realm.create('PersonObject', {name: 'Tim', age: 11});
            realm.create('PersonObject', {name: 'Bjarne', age: 12});
            realm.create('PersonObject', {name: 'Alex', age: 12, married: true});
        });

        TestCase.assertEqual(realm.objects('PersonObject').filtered("truepredicate").length, 4);
        TestCase.assertEqual(realm.objects('PersonObject').length, 4);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age = 11').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age = 11')[0].name, 'Tim');
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age = 12').length, 2);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age = 13').length, 0);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age < 12').length, 2);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age > 10 && age < 13').length, 3);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age > 10').filtered('age < 13').length, 3);

        TestCase.assertEqual(realm.objects('PersonObject').filtered('age >= 11 && age < 13').length, 3);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('name = "Tim"').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('name = \'Tim\'').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('married == TRUE').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('married == false').length, 3);

        TestCase.assertEqual(realm.objects('PersonObject').filtered('name = $0', 'Tim').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject').filtered('age > $1 && age < $0', 13, 10).length, 3);

        TestCase.assertThrows(function() {
            realm.objects('PersonObject').filtered('age > $2 && age < $0', 13, 10)
        });
        TestCase.assertThrows(function() {
            realm.objects('PersonObject').filtered("invalidQuery");
        });

        realm.write(function() {
            realm.create('DefaultValuesObject', {'dateCol': new Date(3)});
            realm.create('DefaultValuesObject', {'dateCol': new Date(4)});
            realm.create('DefaultValuesObject', {'dateCol': new Date(5)});
        });

        TestCase.assertEqual(realm.objects('DefaultValuesObject').filtered('dateCol > $0', new Date(4)).length, 1);
        TestCase.assertEqual(realm.objects('DefaultValuesObject').filtered('dateCol <= $0', new Date(4)).length, 2);
    },

    testResultsFilteredByForeignObject: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var realm2 = new Realm({path: '2.realm', schema: realm.schema});
        var object;

        realm2.write(function() {
            object = realm2.create('TestObject', {doubleCol: 1});
        });

        TestCase.assertThrows(function() {
            realm.objects('LinkTypesObject').filtered('objectCol = $0', object);
        });
    },

    testResultsSorted: function() {
        var realm = new Realm({schema: [schemas.IntPrimary]});
        var objects = realm.objects('IntPrimaryObject');

        realm.write(function() {
            realm.create('IntPrimaryObject', {primaryCol: 2, valueCol: 'a'});
            realm.create('IntPrimaryObject', {primaryCol: 3, valueCol: 'a'});
            realm.create('IntPrimaryObject', {primaryCol: 1, valueCol: 'b'});
            realm.create('IntPrimaryObject', {primaryCol: 4, valueCol: 'c'});
            realm.create('IntPrimaryObject', {primaryCol: 0, valueCol: 'c'});
        });

        var primaries = function(results) {
            return results.map(function(object) {
                return object.primaryCol;
            });
        };

        objects = objects.sorted([]);
        TestCase.assertArraysEqual(primaries(objects), [2, 3, 1, 4, 0]);

        objects = objects.sorted('primaryCol');
        TestCase.assertArraysEqual(primaries(objects), [0, 1, 2, 3, 4]);

        objects = objects.sorted('primaryCol', true);
        TestCase.assertArraysEqual(primaries(objects), [4, 3, 2, 1, 0]);

        objects = objects.sorted(['primaryCol', 'valueCol']);
        TestCase.assertArraysEqual(primaries(objects), [0, 1, 2, 3, 4]);

        objects = objects.sorted([['primaryCol', true], ['valueCol', true]]);
        TestCase.assertArraysEqual(primaries(objects), [4, 3, 2, 1, 0]);

        objects = objects.sorted([['primaryCol', false], 'valueCol']);
        TestCase.assertArraysEqual(primaries(objects), [0, 1, 2, 3, 4]);

        objects = objects.sorted(['valueCol', 'primaryCol']);
        TestCase.assertArraysEqual(primaries(objects), [2, 3, 1, 0, 4]);

        objects = objects.sorted([['valueCol', false], ['primaryCol', true]]);
        TestCase.assertArraysEqual(primaries(objects), [3, 2, 1, 4, 0]);

        objects = objects.sorted([['valueCol', true], ['primaryCol', false]]);
        TestCase.assertArraysEqual(primaries(objects), [0, 4, 1, 2, 3]);

        objects = objects.sorted([['valueCol', true], ['primaryCol', true]]);
        TestCase.assertArraysEqual(primaries(objects), [4, 0, 1, 3, 2]);

        TestCase.assertThrows(function() {
            objects.sorted();
        });
        TestCase.assertThrows(function() {
            objects.sorted(1);
        });
        TestCase.assertThrows(function() {
            objects.sorted([1]);
        });
        TestCase.assertThrows(function() {
            objects.sorted('fish');
        });
        TestCase.assertThrows(function() {
            objects.sorted(['valueCol', 'fish']);
        });
        TestCase.assertThrows(function() {
            objects.sorted(['valueCol', 'primaryCol'], true);
        });
    },

    testResultsSortedAllTypes: function() {
        var realm = new Realm({schema: [schemas.BasicTypes]});
        var objects = realm.objects('BasicTypesObject');

        realm.write(function() {
            realm.create('BasicTypesObject', [false, 0, 0, 0, '0', new Date(0), new ArrayBuffer()]);
            realm.create('BasicTypesObject', [true, 2, 2, 2, '2', new Date(2), new ArrayBuffer()]);
            realm.create('BasicTypesObject', [false, 1, 1, 1, '1', new Date(1), new ArrayBuffer()]);
        });

        var numberProps = ['intCol', 'floatCol', 'doubleCol', 'stringCol'];
        for (var i = 0; i < numberProps.length; i++) {
            var prop = numberProps[i];

            objects = objects.sorted(prop, false);
            TestCase.assertEqual('' + objects[0][prop], '0', 'first element ascending for ' + prop);
            TestCase.assertEqual('' + objects[2][prop], '2', 'second element ascending for ' + prop);

            objects = objects.sorted(prop, true);
            TestCase.assertEqual('' + objects[0][prop], '2', 'first element descending for ' + prop);
            TestCase.assertEqual('' + objects[2][prop], '0', 'second element descending for ' + prop);
        }

        objects = objects.sorted('dateCol', false);
        TestCase.assertEqual(objects[0].dateCol.getTime(), 0);
        TestCase.assertEqual(objects[2].dateCol.getTime(), 2);

        objects = objects.sorted('dateCol', true);
        TestCase.assertEqual(objects[0].dateCol.getTime(), 2);
        TestCase.assertEqual(objects[2].dateCol.getTime(), 0);

        objects = objects.sorted('boolCol', false);
        TestCase.assertEqual(objects[0].boolCol, false, 'first element ascending for boolCol');
        TestCase.assertEqual(objects[0].boolCol, false, 'second element ascending for boolCol');
        TestCase.assertEqual(objects[2].boolCol, true, 'third element ascending for boolCol');

        objects = objects.sorted('boolCol', true);
        TestCase.assertEqual(objects[0].boolCol, true, 'first element descending for boolCol');
        TestCase.assertEqual(objects[1].boolCol, false, 'second element descending for boolCol');
        TestCase.assertEqual(objects[2].boolCol, false, 'third element descending for boolCol');
    },

    testResultsInvalidation: function() {
        let realm = new Realm({schema: [schemas.TestObject]});
        realm.write(function() {
            for (var i = 10; i > 0; i--) {
                realm.create('TestObject', [i]);
            }
        });

        var resultsVariants = [
            realm.objects('TestObject'),
            realm.objects('TestObject').filtered('doubleCol > 1'),
            realm.objects('TestObject').filtered('doubleCol > 1').sorted('doubleCol'),
            realm.objects('TestObject').filtered('doubleCol > 1').snapshot()
        ];

        // test isValid
        resultsVariants.forEach(function(objects) {
            TestCase.assertEqual(objects.isValid(), true);
        });

        // close and test invalidated accessors
        realm.close();
        realm = new Realm({
            schemaVersion: 1,
            schema: [schemas.TestObject, schemas.DateObject]
        });

        resultsVariants.forEach(function(objects) {
            TestCase.assertEqual(objects.isValid(), false);
            TestCase.assertThrows(function() { objects[0]; });
            TestCase.assertThrows(function() { objects.filtered('doubleCol < 42'); });
            TestCase.assertThrows(function() { objects.sorted('doubleCol', true); });
            TestCase.assertThrows(function() { objects.snapshot(); });
        });
    },

    testResultsDeletedObjects: function() {
        var realm = new Realm({schema: [schemas.TestObject]});

        var createTestObjects = function(n) {
            for (var i = 0; i < n; i++) {
                realm.create('TestObject', {doubleCol: i});
            }

            return realm.objects('TestObject');
        }

        realm.write(function() {
            var objects = createTestObjects(10);
            var snapshot = objects.snapshot();

            realm.deleteAll();
            TestCase.assertEqual(objects.length, 0);
            TestCase.assertEqual(snapshot.length, 10);
            TestCase.assertEqual(snapshot[0], null);
        });

        realm.write(function() {
            var objects = createTestObjects(10);
            realm.deleteAll();

            var snapshot = objects.snapshot();
            TestCase.assertEqual(objects.length, 0);
            TestCase.assertEqual(snapshot.length, 0);
        });

        realm.write(function() {
            var objects = createTestObjects(10);
            var snapshot = objects.snapshot();

            realm.delete(snapshot);
            TestCase.assertEqual(objects.length, 0);
            TestCase.assertEqual(snapshot.length, 10);
            TestCase.assertEqual(snapshot[0], null);
        });

        realm.write(function() {
            var objects = createTestObjects(10);
            realm.delete(objects);

            var snapshot = objects.snapshot();
            TestCase.assertEqual(objects.length, 0);
            TestCase.assertEqual(snapshot.length, 0);
        });
    },

    testResultsFindIndexOfObject: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
    
        var object1, object2, object3;
        realm.write(function() {
            object1 = realm.create('TestObject', {doubleCol: 1});
            object2 = realm.create('TestObject', {doubleCol: 2});
            object3 = realm.create('TestObject', {doubleCol: 2});
        });
    
        // Search in base table
        const objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.indexOf(object1), 0);
        TestCase.assertEqual(objects.indexOf(object2), 1);
        TestCase.assertEqual(objects.indexOf(object3), 2);
    
        // Search in filtered query
        const results = objects.filtered("doubleCol == 2");
        TestCase.assertEqual(results.indexOf(object1), -1);
        TestCase.assertEqual(results.indexOf(object2), 0);
        TestCase.assertEqual(results.indexOf(object3), 1);
    
        const nonRealmObject = {test: "this is an object"};
        TestCase.assertEqual(objects.indexOf(nonRealmObject), -1);
    
        // Searching for object from the wrong realm
        var realm2 = new Realm({path: '2.realm', schema: realm.schema});
        var object4;
        realm2.write(function() {
            object4 = realm2.create('TestObject', {doubleCol: 1});
        });
    
        TestCase.assertThrows(function() {
            objects.indexOf(object4);
        });
    },

    testAddListener: function() {
        if (typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent)) { // eslint-disable-line no-undef
            // FIXME: async callbacks do not work correctly in Chrome debugging mode
            return Promise.resolve();
        }

        const realm = new Realm({ schema: [schemas.TestObject] });
        realm.write(() => {
            realm.create('TestObject', { doubleCol: 1 });
            realm.create('TestObject', { doubleCol: 2 });
            realm.create('TestObject', { doubleCol: 3 });
        });

        let resolve = () => {};
        let first = true;

        realm.objects('TestObject').addListener((testObjects, changes) => {
            if (first) {
                TestCase.assertEqual(testObjects.length, 3);
                TestCase.assertEqual(changes.insertions.length, 0);
            }
            else {
                TestCase.assertEqual(testObjects.length, 4);
                TestCase.assertEqual(changes.insertions.length, 1);
            }
            first = false;
            resolve();
        });

        return new Promise((r, _reject) => {
            resolve = r;
            realm.write(() => {
                realm.create('TestObject', { doubleCol: 1 });
            });
        });
    },

    testResultsAggregateFunctions: function() {
        var realm = new Realm({ schema: [schemas.NullableBasicTypes] });
        const N = 50;
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    intCol: i+1,
                    floatCol: i+1,
                    doubleCol: i+1,
                    dateCol: new Date(i+1)
                });
            }
        });

        var results = realm.objects('NullableBasicTypesObject');
        TestCase.assertEqual(results.length, N);

        // int, float & double columns support all aggregate functions
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertEqual(results.min(colName), 1);
            TestCase.assertEqual(results.max(colName), N);
            TestCase.assertEqual(results.sum(colName), N*(N+1)/2);
            TestCase.assertEqual(results.avg(colName), (N+1)/2);
        });

        // date columns support only 'min' & 'max'
        TestCase.assertEqual(results.min('dateCol').getTime(), new Date(1).getTime());
        TestCase.assertEqual(results.max('dateCol').getTime(), new Date(N).getTime());
    },

    testResultsAggregateFunctionsWithNullColumnValues: function() {
        var realm = new Realm({ schema: [schemas.NullableBasicTypes] });

        const N = 50;
        const M = 10;

        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    intCol: i+1,
                    floatCol: i+1,
                    doubleCol: i+1,
                    dateCol: new Date(i+1)
                });
            }

            // add some null valued data, which should be ignored by the aggregate functions
            for(var j = 0; j < M; j++) {
                realm.create('NullableBasicTypesObject', {
                    intCol: null,
                    floatCol: null,
                    doubleCol: null,
                    dateCol: null
                });
            }
        });

        var results = realm.objects('NullableBasicTypesObject');

        TestCase.assertEqual(results.length, N + M);

        // int, float & double columns support all aggregate functions
        // the M null valued objects should be ignored
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertEqual(results.min(colName), 1);
            TestCase.assertEqual(results.max(colName), N);
            TestCase.assertEqual(results.sum(colName), N*(N+1)/2);
            TestCase.assertEqual(results.avg(colName), (N+1)/2);
        });

        // date columns support only 'min' & 'max'
        TestCase.assertEqual(results.min('dateCol').getTime(), new Date(1).getTime());
        TestCase.assertEqual(results.max('dateCol').getTime(), new Date(N).getTime());

        // call aggregate functions on empty results
        var emptyResults = realm.objects('NullableBasicTypesObject').filtered('intCol < 0');
        TestCase.assertEqual(emptyResults.length, 0);
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertUndefined(emptyResults.min(colName));
            TestCase.assertUndefined(emptyResults.max(colName));
            TestCase.assertEqual(emptyResults.sum(colName), 0);
            TestCase.assertUndefined(emptyResults.avg(colName));
        });

        TestCase.assertUndefined(emptyResults.min('dateCol'));
        TestCase.assertUndefined(emptyResults.max('dateCol'));
    },

    testResultsAggregateFunctionsUnsupported: function() {
        var realm = new Realm({ schema: [schemas.NullableBasicTypes] });
        realm.write(() => {
            realm.create('NullableBasicTypesObject', {
                boolCol: true,
                stringCol: "hello",
                dataCol: new ArrayBuffer(12),
            });
        });

        var results = realm.objects('NullableBasicTypesObject');

        // bool, string & data columns don't support 'min'
        ['boolCol', 'stringCol', 'dataCol'].forEach(colName => {
            TestCase.assertThrows(function() {
                results.min(colName);
            }
        )});

        // bool, string & data columns don't support 'max'
        ['boolCol', 'stringCol', 'dataCol'].forEach(colName => {
            TestCase.assertThrows(function() {
                results.max(colName);
            }
        )});

        // bool, string, date & data columns don't support 'avg'
        ['boolCol', 'stringCol', 'dateCol', 'dataCol'].forEach(colName => {
            TestCase.assertThrows(function() {
                results.avg(colName);
            }
        )});

        // bool, string, date & data columns don't support 'sum'
        ['boolCol', 'stringCol', 'dateCol', 'dataCol'].forEach(colName => {
            TestCase.assertThrows(function() {
                results.sum(colName);
            }
        )});
    },

    testResultsAggregateFunctionsWrongProperty: function() {
        var realm = new Realm({ schema: [ schemas.TestObject ]});
        realm.write(() => {
            realm.create('TestObject', { doubleCol: 42 });
        });
        var results = realm.objects('TestObject');
        TestCase.assertThrows(function() {
            results.min('foo')
        });
        TestCase.assertThrows(function() {
            results.max('foo')
        });
        TestCase.assertThrows(function() {
            results.sum('foo')
        });
        TestCase.assertThrows(function() {
            results.avg('foo')
        });
    },

    testIterator: function() {
        var realm = new Realm({ schema: [ schemas.TestObject ]});
        realm.write(() => {
            realm.create('TestObject', { doubleCol: 2 });
            realm.create('TestObject', { doubleCol: 3 });
        });

        var results = realm.objects('TestObject').filtered('doubleCol >= 2');
        TestCase.assertEqual(results.length, 2);
        var calls = 0;
        for(let obj of results) {
            realm.write(() => {
                obj.doubleCol = 1;
            });
            calls++;
        }
        TestCase.assertEqual(results.length, 0);
        TestCase.assertEqual(calls, 2);
    },

    testIteratorDeleteObjects: function() {
        var realm = new Realm({ schema: [ schemas.TestObject ]});
        realm.write(() => {
            realm.create('TestObject', { doubleCol: 2 });
            realm.create('TestObject', { doubleCol: 3 });
        });

        var results = realm.objects('TestObject');
        TestCase.assertEqual(results.length, 2);
        var calls = 0;
        for(let obj of results) {
            realm.write(() => {
                realm.delete(obj);
                calls++;
            });
        }
        TestCase.assertEqual(calls, 2);
        TestCase.assertEqual(realm.objects('TestObject').length, 0);
    },

    testResultsUpdate: function() {
        const N = 5;

        var realm = new Realm({schema: [schemas.NullableBasicTypes]});
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', { intCol: 10 });
            }
        });

        // update should work on a basic result set
        var results = realm.objects('NullableBasicTypesObject');
        TestCase.assertEqual(results.length, 5);
        realm.write(() => {
            results.update('intCol', 20);
        });
        TestCase.assertEqual(results.length, 5);
        TestCase.assertEqual(realm.objects('NullableBasicTypesObject').filtered('intCol = 20').length, 5);

        // update should work on a filtered result set
        results = realm.objects('NullableBasicTypesObject').filtered('intCol = 20');
        realm.write(() => {
            results.update('intCol', 10);
        });
        TestCase.assertEqual(results.length, 0);
        TestCase.assertEqual(realm.objects('NullableBasicTypesObject').filtered('intCol = 10').length, 5);

        // update should work on a sorted result set
        results = realm.objects('NullableBasicTypesObject').filtered('intCol == 10').sorted('intCol');
        realm.write(() => {
            results.update('intCol', 20);
        });
        TestCase.assertEqual(results.length, 0);
        TestCase.assertEqual(realm.objects('NullableBasicTypesObject').filtered('intCol = 20').length, 5);

        // update should work on a result snapshot
        results = realm.objects('NullableBasicTypesObject').filtered('intCol == 20').snapshot();
        realm.write(() => {
            results.update('intCol', 10);
        });
        TestCase.assertEqual(results.length, 5); // snapshot length should not change
        TestCase.assertEqual(realm.objects('NullableBasicTypesObject').filtered('intCol = 10').length, 5);

        realm.close();
    },

    testResultsUpdateDataTypes: function() {
        const N = 5;

        var realm = new Realm({schema: [schemas.NullableBasicTypes]});
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    boolCol: false,
                    stringCol: 'hello',
                    intCol: 10,
                    floatCol: 10.0,
                    doubleCol: 10.0,
                    dateCol: new Date(10)
                });
            }
        });

        const testCases = [
            // col name, initial filter, initial filter pre-update count, initial filter post-update count, updated value, updated filter, updated filter post-update count
            [ 'boolCol', 'boolCol = false', N, 0, true, 'boolCol = true', N ],
            [ 'stringCol', 'stringCol = "hello"', N, 0, 'world', 'stringCol = "world"', N ],
            [ 'intCol', 'intCol = 10', N, 0, 20, 'intCol = 20', N ],
            [ 'floatCol', 'floatCol = 10.0', N, 0, 20.0, 'floatCol = 20.0', N ],
            [ 'doubleCol', 'doubleCol = 10.0', N, 0, 20.0, 'doubleCol = 20.0', N ],
        ];

        testCases.forEach(function(testCase) {
            var results = realm.objects('NullableBasicTypesObject').filtered(testCase[1]);
            TestCase.assertEqual(results.length, testCase[2]);

            realm.write(() => {
                results.update(testCase[0], testCase[4]);
            });

            TestCase.assertEqual(results.length, testCase[3]);

            results = realm.objects('NullableBasicTypesObject').filtered(testCase[5]);
            TestCase.assertEqual(results.length, testCase[6]);
        });

        realm.close();
    },

    testResultUpdateDateColumn: function() {
        const N = 5;

        var realm = new Realm({schema: [schemas.NullableBasicTypes]});

        // date column
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    dateCol: new Date(1000)
                });
            }
        });

        var results = realm.objects('NullableBasicTypesObject').filtered('dateCol = $0', new Date(1000));
        TestCase.assertEqual(results.length, N);

        realm.write(() => {
            results.update('dateCol', new Date(2000));
        });

        TestCase.assertEqual(results.length, 0);
        results = realm.objects('NullableBasicTypesObject').filtered('dateCol = $0', new Date(2000));
        TestCase.assertEqual(results.length, N);

        realm.close();
    },

    testResultsUpdateDataColumn: function() {
        const N = 5;

        var RANDOM_DATA = new Uint8Array([
            0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9,
            0x67, 0x1e, 0x40, 0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
        ]);

        var realm = new Realm({schema: [schemas.NullableBasicTypes]});

            // date column
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    dataCol: null
                });
            }
        });

        var results = realm.objects('NullableBasicTypesObject');
        TestCase.assertEqual(results.length, N);

        realm.write(() => {
            results.update('dataCol', RANDOM_DATA);
        });

        for(var i = 0; i < results.length; i++) {
            TestCase.assertArraysEqual(new Uint8Array(results[i].dataCol), RANDOM_DATA);
        }

        realm.close();
    },

    testResultsUpdateEmpty() {
        var realm = new Realm({schema: [schemas.NullableBasicTypes]});

        var emptyResults = realm.objects('NullableBasicTypesObject').filtered('stringCol = "hello"');
        TestCase.assertEqual(emptyResults.length, 0);

        realm.write(() => {
            emptyResults.update('stringCol', 'no-op');
        });

        TestCase.assertEqual(emptyResults.length, 0);
        TestCase.assertEqual(realm.objects('NullableBasicTypesObject').filtered('stringCol = "no-op"').length, 0);

        realm.close();
    },

    testResultsUpdateInvalidated() {
        var realm = new Realm({schema: [schemas.TestObject]});
        realm.write(function() {
            for (var i = 10; i > 0; i--) {
                realm.create('TestObject', [i]);
            }
        });

        var resultsVariants = [
            realm.objects('TestObject'),
            realm.objects('TestObject').filtered('doubleCol > 1'),
            realm.objects('TestObject').filtered('doubleCol > 1').sorted('doubleCol'),
            realm.objects('TestObject').filtered('doubleCol > 1').snapshot()
        ];

        // test isValid
        resultsVariants.forEach(function(objects) {
            TestCase.assertEqual(objects.isValid(), true);
        });

        // close and test update
        realm.close();
        realm = new Realm({
            schemaVersion: 1,
            schema: [schemas.TestObject, schemas.BasicTypes]
        });

        resultsVariants.forEach(function(objects) {
            TestCase.assertEqual(objects.isValid(), false);
            TestCase.assertThrows(function() { objects.update('doubleCol', 42); });
        });
    },

    testResultsUpdateWrongProperty() {
        var realm = new Realm({schema: [schemas.NullableBasicTypes]});

        const N = 5;
        realm.write(() => {
            for(var i = 0; i < N; i++) {
                realm.create('NullableBasicTypesObject', {
                    stringCol: 'hello'
                });
            }
        });

        var results = realm.objects('NullableBasicTypesObject').filtered('stringCol = "hello"');
        TestCase.assertEqual(results.length, N);

        TestCase.assertThrows(function() {
            realm.write(() => {
                results.update('unknownCol', 'world');
            });
        });

        TestCase.assertThrows(function() {
            results.update('stringCol', 'world');
        });

        realm.close();
    }
};
