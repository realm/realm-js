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

module.exports = BaseTest.extend({
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
            var objects = realm.objects('NotTestObject');
        });
    },
    testResultsEnumerate: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');

        for (var index in objects) {
            TestCase.assertTrue(false, "No objects should have been enumerated");
        }

        realm.write(function() {
            realm.create('TestObject', {doubleCol: 1});
            TestCase.assertEqual(objects.length, 1);
        });

        var count = 0;
        var keys = Object.keys(objects);
        for (var index in objects) {
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

        realm.write(function() {
            realm.create('DefaultValuesObject', {'dateCol': new Date(3)});
            realm.create('DefaultValuesObject', {'dateCol': new Date(4)});
            realm.create('DefaultValuesObject', {'dateCol': new Date(5)});
        });

        TestCase.assertEqual(realm.objects('DefaultValuesObject').filtered('dateCol > $0', new Date(4)).length, 1);
        TestCase.assertEqual(realm.objects('DefaultValuesObject').filtered('dateCol <= $0', new Date(4)).length, 2);

        TestCase.assertThrows(function() {
            realm.objects('PersonObject').filtered("invalidQuery");
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

        var primaries = function(results, prop) {
            return Array.prototype.map.call(results, function(object) {
                return object.primaryCol;
            });
        };

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
            objects.sorted([]);
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
});
