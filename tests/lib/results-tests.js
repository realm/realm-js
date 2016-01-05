/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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
            realm.create('TestObject', [1]);
            TestCase.assertEqual(objects.length, 1);
        });
        TestCase.assertEqual(objects.length, 1);
    },
    testResultsSubscript: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});
        realm.write(function() {
            realm.create('PersonObject', ['name1', 1, false]);
            realm.create('PersonObject', ['name2', 2, false]);
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
            realm.create('TestObject', [1]);
        });

        TestCase.assertThrows(function() {
            objects[-1] = [0];
        });
        TestCase.assertThrows(function() {
            objects[0] = [0];
        });
        TestCase.assertThrows(function() {
            objects[1] = [0];
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
        for (var object in objects) {
            TestCase.assertTrue(false, "No objects should have been enumerated");
        }

        realm.write(function() {
            realm.create('TestObject', [1]);
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
    testSort: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var objects = realm.objects('TestObject');
        realm.write(function() {
            realm.create('TestObject', [2]);
            realm.create('TestObject', [3]);
            realm.create('TestObject', [1]);
            realm.create('TestObject', [4]);
            realm.create('TestObject', [0]);
        });

        objects.sortByProperty('doubleCol');
        TestCase.assertEqual(objects[0].doubleCol, 0);
        TestCase.assertEqual(objects[1].doubleCol, 1);
        TestCase.assertEqual(objects[2].doubleCol, 2);
        TestCase.assertEqual(objects[3].doubleCol, 3);
        TestCase.assertEqual(objects[4].doubleCol, 4);

        objects.sortByProperty('doubleCol', false);
        TestCase.assertEqual(objects[0].doubleCol, 4);
        TestCase.assertEqual(objects[1].doubleCol, 3);
        TestCase.assertEqual(objects[2].doubleCol, 2);
        TestCase.assertEqual(objects[3].doubleCol, 1);
        TestCase.assertEqual(objects[4].doubleCol, 0);
    },
});
