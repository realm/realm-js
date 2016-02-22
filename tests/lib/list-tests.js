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
    testArrayLength: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.length, 1);

            obj.arrayCol = [];
            TestCase.assertEqual(array.length, 0);

            obj.arrayCol = [{doubleCol: 1}, {doubleCol: 2}];
            TestCase.assertEqual(array.length, 2);

            TestCase.assertThrows(function() {
                array.length = 0;
            }, 'cannot set length property on lists');
        });

        TestCase.assertEqual(array.length, 2);
    },

    testArraySubscriptGetters: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
        });

        TestCase.assertEqual(array[0].doubleCol, 3);
        TestCase.assertEqual(array[1].doubleCol, 4);
        TestCase.assertEqual(array[2], undefined);
        TestCase.assertEqual(array[-1], undefined);
    },

    testArraySubscriptSetters: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            array[0] = {doubleCol: 5};
            array[1] = {doubleCol: 6};

            TestCase.assertEqual(array[0].doubleCol, 5);
            TestCase.assertEqual(array[1].doubleCol, 6);

            array[0] = obj.objectCol;
            array[1] = obj.objectCol1;

            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);

            TestCase.assertThrows(function() {
                array[2] = {doubleCol: 1};
            }, 'cannot set list item beyond its bounds');

            TestCase.assertThrows(function() {
                array[-1] = {doubleCol: 1};
            }, 'cannot set list item with negative index');
        });

        TestCase.assertThrows(function() {
            array[0] = {doubleCol: 1};
        }, 'cannot set list item outside write transaction');
    },

    testArrayInvalidProperty: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
        });

        TestCase.assertEqual(undefined, array.ablasdf);
    },

    testArrayEnumerate: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var obj;

        realm.write(function() {
            obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [],
            });
        });

        var index;
        for (index in obj.arrayCol) {
            TestCase.assertTrue(false, "No objects should have been enumerated: " + index);
        }

        realm.write(function() {
            obj.arrayCol = [{doubleCol: 0}, {doubleCol: 1}];
            TestCase.assertEqual(obj.arrayCol.length, 2);
        });

        var count = 0;
        var keys = Object.keys(obj.arrayCol);
        for (index in obj.arrayCol) {
            TestCase.assertEqual(count++, +index);
            TestCase.assertEqual(keys[index], index);
        }

        TestCase.assertEqual(count, 2);
        TestCase.assertEqual(keys.length, 2);
    },

    testPush: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.length, 1);

            TestCase.assertEqual(array.push({doubleCol: 4}), 2);
            TestCase.assertEqual(array.length, 2);
            TestCase.assertEqual(array[1].doubleCol, 4);

            TestCase.assertEqual(array.push(obj.objectCol, obj.objectCol1), 4);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[2].doubleCol, 1);
            TestCase.assertEqual(array[3].doubleCol, 2);

            TestCase.assertThrows(function() {
                array.push();
            });
        });

        TestCase.assertEqual(array.length, 4);
        TestCase.assertThrows(function() {
            array.push([1]);
        }, 'can only push in a write transaction');
    },

    testPop: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.pop().doubleCol, 4);
            TestCase.assertEqual(array.pop().doubleCol, 3);
            TestCase.assertEqual(array.length, 0);

            TestCase.assertEqual(array.pop(), undefined);

            TestCase.assertThrows(function() {
                array.pop(1);
            });
        });

        TestCase.assertThrows(function() {
            array.pop();
        }, 'can only pop in a write transaction');
    },

    testUnshift: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.length, 1);

            TestCase.assertEqual(array.unshift({doubleCol: 5}), 2);
            TestCase.assertEqual(array.length, 2);
            TestCase.assertEqual(array[0].doubleCol, 5);

            TestCase.assertEqual(array.unshift(obj.objectCol, obj.objectCol1), 4);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);
        });   

        TestCase.assertEqual(array.length, 4);
        TestCase.assertThrows(function() {
            array.unshift({doubleCol: 1});
        }, 'can only unshift in a write transaction');
    },

    testShift: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.shift().doubleCol, 3);
            TestCase.assertEqual(array.shift().doubleCol, 4);
            TestCase.assertEqual(array.length, 0);

            TestCase.assertEqual(array.shift(), undefined);

            TestCase.assertThrows(function() {
                array.shift(1);
            });
        });

        TestCase.assertThrows(function() {
            array.shift();
        }, 'can only shift in a write transaction');
    },

    testSplice: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            var removed;

            removed = array.splice(0, 0, obj.objectCol, obj.objectCol1);
            TestCase.assertEqual(removed.length, 0);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);

            removed = array.splice(2, 2, {doubleCol: 5}, {doubleCol: 6});
            TestCase.assertEqual(removed.length, 2);
            TestCase.assertEqual(removed[0].doubleCol, 3);
            TestCase.assertEqual(removed[1].doubleCol, 4);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[2].doubleCol, 5);
            TestCase.assertEqual(array[3].doubleCol, 6);

            removed = array.splice(2, 2);
            TestCase.assertEqual(removed.length, 2);
            TestCase.assertEqual(removed[0].doubleCol, 5);
            TestCase.assertEqual(removed[1].doubleCol, 6);
            TestCase.assertEqual(array.length, 2);
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);

            removed = array.splice(-1, 1);
            TestCase.assertEqual(removed.length, 1);
            TestCase.assertEqual(removed[0].doubleCol, 2);
            TestCase.assertEqual(array.length, 1);
            TestCase.assertEqual(array[0].doubleCol, 1);

            removed = array.splice(0, 2);
            TestCase.assertEqual(removed.length, 1);
            TestCase.assertEqual(removed[0].doubleCol, 1);
            TestCase.assertEqual(array.length, 0);

            removed = array.splice('0', '0', obj.objectCol);
            TestCase.assertEqual(removed.length, 0);
            TestCase.assertEqual(array.length, 1);

            TestCase.assertThrows(function() {
                array.splice('cat', 1);
            });

            TestCase.assertThrows(function() {
                array.splice(0, 0, 0);
            });
        });

        TestCase.assertThrows(function() {
            array.splice(0, 0, {doubleCol: 1});
        }, 'can only splice in a write transaction');
    },

    testDeletions: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var object;
        var array;

        realm.write(function() {
            object = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = object.arrayCol;
        });

        try {
            realm.write(function() {
                realm.delete(array[0]);
                TestCase.assertEqual(array.length, 1);
                TestCase.assertEqual(array[0].doubleCol, 4);

                // This should cancel the transaction and cause the list to be reset.
                throw new Error('Transaction FAIL');
            });
        } catch (e) {}

        TestCase.assertEqual(array.length, 2);
        TestCase.assertEqual(array[0].doubleCol, 3);

        realm.write(function() {
            realm.delete(object);
        });

        TestCase.assertThrows(function() {
            array[0];
        });
    },

    testLiveUpdatingResults: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var objects = realm.objects('TestObject');
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
        });

        TestCase.assertEqual(array.length, 2);
        TestCase.assertEqual(objects.length, 4);

        try {
            realm.write(function() {
                array.push({doubleCol: 5});
                TestCase.assertEqual(objects.length, 5);

                array.unshift({doubleCol: 2});
                TestCase.assertEqual(objects.length, 6);

                array.splice(0, 0, {doubleCol: 1});
                TestCase.assertEqual(objects.length, 7);

                array.push(objects[0], objects[1]);
                TestCase.assertEqual(objects.length, 7);

                // This should cancel the transaction and cause the list and results to be reset.
                throw new Error('Transaction FAIL');
            });
        } catch (e) {}

        TestCase.assertEqual(array.length, 2);
        TestCase.assertEqual(objects.length, 4);
    },

    testStaticResults: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var objects = realm.objects('TestObject');
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
            array = obj.arrayCol;
        });

        var objectsCopy = objects.snapshot();
        var arrayCopy = array.snapshot();

        TestCase.assertEqual(objectsCopy.length, 4);
        TestCase.assertEqual(arrayCopy.length, 2);

        realm.write(function() {
            array.push([5]);
            TestCase.assertEqual(objectsCopy.length, 4);
            TestCase.assertEqual(arrayCopy.length, 2);

            TestCase.assertEqual(objectsCopy.snapshot().length, 4);
            TestCase.assertEqual(arrayCopy.snapshot().length, 2);

            TestCase.assertEqual(objects.snapshot().length, 5);
            TestCase.assertEqual(array.snapshot().length, 3);

            realm.delete(array[0]);
            TestCase.assertEqual(objectsCopy.length, 4);
            TestCase.assertEqual(arrayCopy.length, 2);
            TestCase.assertEqual(arrayCopy[0], null);
        });
    },

    testListFiltered: function() {
        var realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        var list;

        realm.write(function() {
            var object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 10},
                {name: 'Tim', age: 11},
                {name: 'Bjarne', age: 12},
                {name: 'Alex', age: 12, married: true}
            ]});
            realm.create('PersonObject', {name: 'NotInList', age: 10});

            list = object.list;
        });

        TestCase.assertEqual(list.filtered("truepredicate").length, 4);
        TestCase.assertEqual(list.filtered('age = 11')[0].name, 'Tim');
        TestCase.assertEqual(list.filtered('age = 12').length, 2);
        TestCase.assertEqual(list.filtered('age > 10 && age < 13').length, 3);
        TestCase.assertEqual(list.filtered('age > 10').filtered('age < 13').length, 3);
    },

    testListSorted: function() {
        var realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        var list;

        realm.write(function() {
            var object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 10},
                {name: 'Tim', age: 11},
                {name: 'Bjarne', age: 12},
                {name: 'Alex', age: 12, married: true}
            ]});
            realm.create('PersonObject', {name: 'NotInList', age: 10});

            list = object.list;
        });

        var names = function(results, prop) {
            return Array.prototype.map.call(results, function(object) {
                return object.name;
            });
        };

        var objects = list.sorted('name', true);
        TestCase.assertArraysEqual(names(objects), ['Tim', 'Bjarne', 'Ari', 'Alex']);

        objects = list.sorted(['age', 'name']);
        TestCase.assertArraysEqual(names(objects), ['Ari', 'Tim', 'Alex', 'Bjarne']);
    },
    testResultsSlice: function() {
        var realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        var list;

        realm.write(function() {
            var object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 1},
                {name: 'Tim', age: 2},
                {name: 'Bjarne', age: 3},
            ]});
            realm.create('PersonObject', {name: 'NotInList', age: 10});

            list = object.list;
        });

        TestCase.assertEqual(list.slice().length, 3);
        TestCase.assertEqual(list.slice(-1).length, 1);
        TestCase.assertEqual(list.slice(-1)[0].age, 3);
        TestCase.assertEqual(list.slice(1, 3).length, 2);
        TestCase.assertEqual(list.slice(1, 3)[1].age, 3);
    },
    testResultsMap: function() {
        var realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        var list;

        realm.write(function() {
            var object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 1},
                {name: 'Tim', age: 2},
                {name: 'Bjarne', age: 3},
            ]});
            realm.create('PersonObject', {name: 'NotInList', age: 10});

            list = object.list;
        });

        var ages = list.map(function(o) { return o.age; });
        TestCase.assertArraysEqual(ages, [1, 2, 3]);
    },
});
