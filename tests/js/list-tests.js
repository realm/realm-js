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

const Realm = require('realm');
let TestCase = require('./asserts');
let schemas = require('./schemas');

const DATA1 = new Uint8Array([0x01]);
const DATA2 = new Uint8Array([0x02]);
const DATA3 = new Uint8Array([0x03]);
const DATE1 = new Date(1);
const DATE2 = new Date(2);
const DATE3 = new Date(3);

module.exports = {
    testListConstructor: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        realm.write(() => {
            let obj = realm.create('PersonList', {list: []});
            TestCase.assertInstanceOf(obj.list, Realm.List);
            TestCase.assertInstanceOf(obj.list, Realm.Collection);
        });
        
        TestCase.assertThrowsContaining(() => new Realm.List(), 'constructor');
        TestCase.assertInstanceOf(Realm.List, Function);
    },

    testListType: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject, schemas.PrimitiveArrays]});

        let obj, prim;
        realm.write(() => {
            obj = realm.create('LinkTypesObject', {});
            prim = realm.create('PrimitiveArrays', {});
        });

        TestCase.assertEqual(obj.arrayCol.type, 'object');
        TestCase.assertEqual(obj.arrayCol1.type, 'object');

        TestCase.assertEqual(prim.bool.type, 'bool');
        TestCase.assertEqual(prim.int.type, 'int');
        TestCase.assertEqual(prim.float.type, 'float');
        TestCase.assertEqual(prim.double.type, 'double');
        TestCase.assertEqual(prim.string.type, 'string');
        TestCase.assertEqual(prim.date.type, 'date');
        TestCase.assertEqual(prim.optBool.type, 'bool');
        TestCase.assertEqual(prim.optInt.type, 'int');
        TestCase.assertEqual(prim.optFloat.type, 'float');
        TestCase.assertEqual(prim.optDouble.type, 'double');
        TestCase.assertEqual(prim.optString.type, 'string');
        TestCase.assertEqual(prim.optDate.type, 'date');

        TestCase.assertFalse(prim.bool.optional);
        TestCase.assertFalse(prim.int.optional);
        TestCase.assertFalse(prim.float.optional);
        TestCase.assertFalse(prim.double.optional);
        TestCase.assertFalse(prim.string.optional);
        TestCase.assertFalse(prim.date.optional);
        TestCase.assertTrue(prim.optBool.optional);
        TestCase.assertTrue(prim.optInt.optional);
        TestCase.assertTrue(prim.optFloat.optional);
        TestCase.assertTrue(prim.optDouble.optional);
        TestCase.assertTrue(prim.optString.optional);
        TestCase.assertTrue(prim.optDate.optional);
    },

    testListLength: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
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

            TestCase.assertThrowsContaining(() => array.length = 0,
                                            "Cannot assign to read only property 'length'");
        });

        TestCase.assertEqual(array.length, 2);
    },

    testListSubscriptGetters: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject, schemas.PrimitiveArrays]});
        let obj, prim;

        realm.write(() => {
            obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
                arrayCol1: [{doubleCol: 5}, {doubleCol: 6}],
            });
            prim = realm.create('PrimitiveArrays', {
                bool:   [true, false],
                int:    [1, 2],
                float:  [1.1, 2.2],
                double: [1.11, 2.22],
                string: ['a', 'b'],
                date:   [new Date(1), new Date(2)],
                data:   [DATA1, DATA2],

                optBool:   [true, null],
                optInt:    [1, null],
                optFloat:  [1.1, null],
                optDouble: [1.11, null],
                optString: ['a', null],
                optDate:   [new Date(1), null],
                optData:   [DATA1, null],
            });
        });

        TestCase.assertEqual(obj.arrayCol[0].doubleCol, 3);
        TestCase.assertEqual(obj.arrayCol[1].doubleCol, 4);
        TestCase.assertEqual(obj.arrayCol[2], undefined);
        TestCase.assertEqual(obj.arrayCol[-1], undefined);
        TestCase.assertEqual(obj.arrayCol['foo'], undefined);

        TestCase.assertEqual(obj.arrayCol1[0].doubleCol, 5);
        TestCase.assertEqual(obj.arrayCol1[1].doubleCol, 6);
        TestCase.assertEqual(obj.arrayCol1[2], undefined);
        TestCase.assertEqual(obj.arrayCol1[-1], undefined);
        TestCase.assertEqual(obj.arrayCol1['foo'], undefined);

        for (let field of Object.keys(prim)) {
            TestCase.assertEqual(prim[field][2], undefined);
            TestCase.assertEqual(prim[field][-1], undefined);
            TestCase.assertEqual(prim[field]['foo'], undefined);
            if (field.includes('opt')) {
                TestCase.assertEqual(prim[field][1], null);
            }
        }

        TestCase.assertSimilar('bool', prim.bool[0], true);
        TestCase.assertSimilar('bool', prim.bool[1], false);
        TestCase.assertSimilar('int', prim.int[0], 1);
        TestCase.assertSimilar('int', prim.int[1], 2);
        TestCase.assertSimilar('float', prim.float[0], 1.1);
        TestCase.assertSimilar('float', prim.float[1], 2.2);
        TestCase.assertSimilar('double', prim.double[0], 1.11);
        TestCase.assertSimilar('double', prim.double[1], 2.22);
        TestCase.assertSimilar('string', prim.string[0], 'a');
        TestCase.assertSimilar('string', prim.string[1], 'b');
        TestCase.assertSimilar('data', prim.data[0], DATA1);
        TestCase.assertSimilar('data', prim.data[1], DATA2);
        TestCase.assertSimilar('date', prim.date[0], new Date(1));
        TestCase.assertSimilar('date', prim.date[1], new Date(2));

        TestCase.assertSimilar('bool', prim.optBool[0], true);
        TestCase.assertSimilar('int', prim.optInt[0], 1);
        TestCase.assertSimilar('float', prim.optFloat[0], 1.1);
        TestCase.assertSimilar('double', prim.optDouble[0], 1.11);
        TestCase.assertSimilar('string', prim.optString[0], 'a');
        TestCase.assertSimilar('data', prim.optData[0], DATA1);
        TestCase.assertSimilar('date', prim.optDate[0], new Date(1));
    },

    testListSubscriptSetters: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject,
                                          schemas.PrimitiveArrays]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });
            let prim = realm.create('PrimitiveArrays', {});
            array = obj.arrayCol;

            array[0] = {doubleCol: 5};
            array[1] = {doubleCol: 6};
            TestCase.assertEqual(array[0].doubleCol, 5);
            TestCase.assertEqual(array[1].doubleCol, 6);

            array[0] = obj.objectCol;
            array[1] = obj.objectCol1;
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);

            TestCase.assertThrowsContaining(() => array[0] = null,
                                            "JS value must be of type 'object', got (null)");
            TestCase.assertThrowsContaining(() => array[0] = {},
                                            "Missing value for property 'TestObject.doubleCol'");
            TestCase.assertThrowsContaining(() => array[0] = {foo: 'bar'},
                                            "Missing value for property 'TestObject.doubleCol'");
            TestCase.assertThrowsContaining(() => array[0] = prim,
                                            "Object of type (PrimitiveArrays) does not match List type (TestObject)");
            TestCase.assertThrowsContaining(() => array[0] = array,
                                            "Missing value for property 'TestObject.doubleCol'");
            TestCase.assertThrowsContaining(() => array[2] = {doubleCol: 1},
                                            "Requested index 2 greater than max 1");
            TestCase.assertThrowsContaining(() => array[-1] = {doubleCol: 1},
                                            "Index -1 cannot be less than zero.");

            array['foo'] = 'bar';
            TestCase.assertEqual(array.foo, 'bar');

            function testAssign(name, v1, v2) {
                prim[name].push(v1);
                TestCase.assertSimilar(prim[name].type, prim[name][0], v1, undefined, 1);
                prim[name][0] = v2;
                TestCase.assertSimilar(prim[name].type, prim[name][0], v2, undefined, 1);
            }

            testAssign('bool', true, false);
            testAssign('int', 1, 2);
            testAssign('float', 1.1, 2.2);
            testAssign('double', 1.1, 2.2);
            testAssign('string', 'a', 'b');
            testAssign('data', DATA1, DATA2);
            testAssign('date', DATE1, DATE2);

            function testAssignNull(name, expected) {
                TestCase.assertThrowsContaining(() => prim[name][0] = null,
                                                `Property must be of type '${expected}', got (null)`,
                                                undefined, 1);
            }

            testAssignNull('bool', 'bool');
            testAssignNull('int', 'int');
            testAssignNull('float', 'float');
            testAssignNull('double', 'double');
            testAssignNull('string', 'string');
            testAssignNull('data', 'data');
            testAssignNull('date', 'date');

            testAssign('optBool', true, null);
            testAssign('optInt', 1, null);
            testAssign('optFloat', 1.1, null);
            testAssign('optDouble', 1.1, null);
            testAssign('optString', 'a', null);
            testAssign('optData', DATA1, null);
            testAssign('optDate', DATE1, null);
        });

        TestCase.assertThrowsContaining(() => array[0] = {doubleCol: 1},
                                        "Cannot modify managed objects outside of a write transaction.");

        array['foo'] = 'baz';
        TestCase.assertEqual(array.foo, 'baz');
    },

    testListAssignment: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject,
                                          schemas.PersonList, schemas.PersonObject,
                                          schemas.PrimitiveArrays]});

        let obj, prim;
        realm.write(() => {
            obj = realm.create('LinkTypesObject', {});
            prim = realm.create('PrimitiveArrays', {});
            let person = realm.create('PersonObject', {name: 'a', age: 2.0});
            let personList = realm.create('PersonList', {list: [person]}).list;

            TestCase.assertThrowsContaining(() => obj.arrayCol = [0],
                                            "JS value must be of type 'object', got (0)");
            TestCase.assertThrowsContaining(() => obj.arrayCol = [null],
                                            "JS value must be of type 'object', got (null)");
            TestCase.assertThrowsContaining(() => obj.arrayCol = [person],
                                            "Object of type (PersonObject) does not match List type (TestObject)");
            TestCase.assertThrowsContaining(() => obj.arrayCol = personList,
                                            "LinkTypesObject.arrayCol must be of type 'TestObject[]', got 'object' (");
            obj.arrayCol = [realm.create('TestObject', {doubleCol: 1.0})]
            TestCase.assertEqual(obj.arrayCol[0].doubleCol, 1.0);
            obj.arrayCol = obj.arrayCol;
            TestCase.assertEqual(obj.arrayCol[0].doubleCol, 1.0);

            TestCase.assertThrowsContaining(() => prim.bool = [person],
                                            "PrimitiveArrays.bool must be of type 'boolean[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.int = [person],
                                            "PrimitiveArrays.int must be of type 'number[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.float = [person],
                                            "PrimitiveArrays.float must be of type 'number[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.double = [person],
                                            "PrimitiveArrays.double must be of type 'number[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.string = [person],
                                            "PrimitiveArrays.string must be of type 'string[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.data = [person],
                                            "PrimitiveArrays.data must be of type 'binary[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.date = [person],
                                            "PrimitiveArrays.date must be of type 'date[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optBool = [person],
                                            "PrimitiveArrays.optBool must be of type 'boolean?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optInt = [person],
                                            "PrimitiveArrays.optInt must be of type 'number?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optFloat = [person],
                                            "PrimitiveArrays.optFloat must be of type 'number?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optDouble = [person],
                                            "PrimitiveArrays.optDouble must be of type 'number?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optString = [person],
                                            "PrimitiveArrays.optString must be of type 'string?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optData = [person],
                                            "PrimitiveArrays.optData must be of type 'binary?[]', got 'object' ([PersonObject{");
            TestCase.assertThrowsContaining(() => prim.optDate = [person],
                                            "PrimitiveArrays.optDate must be of type 'date?[]', got 'object' ([PersonObject{");

            function testAssign(name, value) {
                prim[name] = [value];
                TestCase.assertSimilar(prim[name].type, prim[name][0], value, undefined, 1);
            }

            testAssign('bool', true);
            testAssign('int', 1);
            testAssign('float', 1.1);
            testAssign('double', 1.1);
            testAssign('string', 'a');
            testAssign('data', DATA1);
            testAssign('date', DATE1);

            function testAssignNull(name, expected) {
                TestCase.assertThrowsContaining(() => prim[name] = [null],
                                                `PrimitiveArrays.${name} must be of type '${expected}[]', got 'object' ([null])`,
                                                undefined, 1);
                TestCase.assertEqual(prim[name].length, 1,
                                     "List should not have been cleared by invalid assignment", 1);
            }

            testAssignNull('bool', 'boolean');
            testAssignNull('int', 'number');
            testAssignNull('float', 'number');
            testAssignNull('double', 'number');
            testAssignNull('string', 'string');
            testAssignNull('data', 'binary');
            testAssignNull('date', 'date');

            testAssign('optBool', true);
            testAssign('optInt', 1);
            testAssign('optFloat', 1.1);
            testAssign('optDouble', 1.1);
            testAssign('optString', 'a');
            testAssign('optData', DATA1);
            testAssign('optDate', DATE1);

            testAssign('optBool', null);
            testAssign('optInt', null);
            testAssign('optFloat', null);
            testAssign('optDouble', null);
            testAssign('optString', null);
            testAssign('optData', null);
            testAssign('optDate', null);
        });

        TestCase.assertThrowsContaining(() => obj.arrayCol = [],
                                        "Cannot modify managed objects outside of a write transaction.");
        TestCase.assertThrowsContaining(() => prim.bool = [],
                                        "Cannot modify managed objects outside of a write transaction.");
    },

    testListEnumerate: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let obj;

        realm.write(() => {
            obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [],
            });
        });

        for (const index in obj.arrayCol) {
            TestCase.assertTrue(false, "No objects should have been enumerated: " + index);
        }

        realm.write(() => {
            obj.arrayCol = [{doubleCol: 0}, {doubleCol: 1}];
        });
        TestCase.assertEqual(obj.arrayCol.length, 2);

        let count = 0;
        let keys = Object.keys(obj.arrayCol);
        for (const index in obj.arrayCol) {
            TestCase.assertEqual(count++, +index);
            TestCase.assertEqual(keys[index], index);
        }

        TestCase.assertEqual(count, 2);
        TestCase.assertEqual(keys.length, 2);
    },

    testListPush: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
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

            TestCase.assertEqual(array.push(), 4);
            TestCase.assertEqual(array.length, 4);
        });

        TestCase.assertEqual(array.length, 4);
        TestCase.assertThrowsContaining(() => {
            array.push([1]);
        }, "Cannot modify managed objects outside of a write transaction.");
    },

    testListPop: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.pop().doubleCol, 4);
            TestCase.assertEqual(array.pop().doubleCol, 3);
            TestCase.assertEqual(array.length, 0);

            TestCase.assertEqual(array.pop(), undefined);

            TestCase.assertThrowsContaining(() => array.pop(1), 'Invalid argument');
        });

        TestCase.assertThrowsContaining(() => array.pop(),
                                        "Cannot modify managed objects outside of a write transaction.");
    },

    testListUnshift: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
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

            TestCase.assertEqual(array.unshift(), 4);
            TestCase.assertEqual(array.length, 4);
        });

        TestCase.assertEqual(array.length, 4);
        TestCase.assertThrowsContaining(() => array.unshift({doubleCol: 1}),
                                        'Cannot modify managed objects outside of a write transaction.');
    },

    testListShift: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            TestCase.assertEqual(array.shift().doubleCol, 3);
            TestCase.assertEqual(array.shift().doubleCol, 4);
            TestCase.assertEqual(array.length, 0);

            TestCase.assertEqual(array.shift(), undefined);

            TestCase.assertThrowsContaining(() => array.shift(1), 'Invalid argument');
        });

        TestCase.assertThrowsContaining(() => {
            array.shift();
        }, "Cannot modify managed objects outside of a write transaction.");
    },

    testListSplice: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
            let removed;

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

            removed = array.splice(1);
            TestCase.assertEqual(removed.length, 0);
            TestCase.assertEqual(array.length, 1);

            removed = array.splice(0);
            TestCase.assertEqual(removed.length, 1);
            TestCase.assertEqual(array.length, 0);

            TestCase.assertThrowsContaining(() => {
                array.splice('cat', 1);
            }, "Value 'cat' not convertible to a number");

            TestCase.assertThrowsContaining(() => {
                array.splice(0, 0, 0);
            }, "JS value must be of type 'object', got (0)");
        });

        TestCase.assertThrowsContaining(() => {
            array.splice(0, 0, {doubleCol: 1});
        }, "Cannot modify managed objects outside of a write transaction");
    },

    testListDeletions: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let object;
        let array;

        realm.write(() => {
            object = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = object.arrayCol;
        });

        try {
            realm.write(() => {
                realm.delete(array[0]);
                TestCase.assertEqual(array.length, 1);
                TestCase.assertEqual(array[0].doubleCol, 4);

                // This should cancel the transaction and cause the list to be reset.
                throw new Error('Transaction FAIL');
            });
        } catch (e) {}

        TestCase.assertEqual(array.length, 2);
        TestCase.assertEqual(array[0].doubleCol, 3);

        realm.write(() => {
            realm.delete(object);
        });

        TestCase.assertThrowsContaining(() => array[0], 'invalidated');
    },

    testLiveUpdatingResults: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let objects = realm.objects('TestObject');
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: {doubleCol: 2},
                arrayCol: [{doubleCol: 3}, {doubleCol: 4}],
            });

            array = obj.arrayCol;
        });

        TestCase.assertEqual(array.length, 2);
        TestCase.assertEqual(objects.length, 4);

        try {
            realm.write(() => {
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

    testListSnapshot: function() {
        const realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        let objects = realm.objects('TestObject');
        let array;

        realm.write(() => {
            let obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]], [[5], [6]]]);
            array = obj.arrayCol;
        });

        let objectsCopy = objects.snapshot();
        let arrayCopy = array.snapshot();

        TestCase.assertEqual(objectsCopy.length, 6);
        TestCase.assertEqual(arrayCopy.length, 2);

        realm.write(() => {
            array.push([5]);
            TestCase.assertEqual(objectsCopy.length, 6);
            TestCase.assertEqual(arrayCopy.length, 2);

            TestCase.assertEqual(objectsCopy.snapshot().length, 6);
            TestCase.assertEqual(arrayCopy.snapshot().length, 2);

            TestCase.assertEqual(objects.snapshot().length, 7);
            TestCase.assertEqual(array.snapshot().length, 3);

            realm.delete(array[0]);
            TestCase.assertEqual(objectsCopy.length, 6);
            TestCase.assertEqual(arrayCopy.length, 2);
            TestCase.assertEqual(arrayCopy[0], null);

            realm.deleteAll();
            TestCase.assertEqual(objectsCopy.length, 6);
            TestCase.assertEqual(arrayCopy.length, 2);
            TestCase.assertEqual(arrayCopy[1], null);
        });
    },

    testListFiltered: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        let list;

        realm.write(() => {
            let object = realm.create('PersonList', {list: [
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
        const schema = [
            {name: 'Target', properties: {value: 'int'}},
            {name: 'Mid',    properties: {value: 'int', link: 'Target'}},
            {name: 'List',   properties: {list: {type: 'list', objectType: 'Mid'}}},
            schemas.PrimitiveArrays
        ];
        const realm = new Realm({schema: schema});

        let list, prim;
        realm.write(() => {
            list = realm.create('List', {list: [
                {value: 3, link: {value: 1}},
                {value: 1, link: {value: 3}},
                {value: 2, link: {value: 2}},
            ]}).list;
            realm.create('List', {list: [
                {value: 4, link: {value: 4}},
            ]});
            prim = realm.create('PrimitiveArrays', {
                bool: [true, false],
                int: [3, 1, 2],
                float: [3, 1, 2],
                double: [3, 1, 2],
                string: ['c', 'a', 'b'],
                data: [DATA3, DATA1, DATA2],
                date: [DATE3, DATE1, DATE2],
                optBool: [true, false, null],
                optInt: [3, 1, 2, null],
                optFloat: [3, 1, 2, null],
                optDouble: [3, 1, 2, null],
                optString: ['c', 'a', 'b', null],
                optData: [DATA3, DATA1, DATA2, null],
                optDate: [DATE3, DATE1, DATE2, null],
            });
        });

        const values = (results) => results.map((o) => o.value);

        // TestCase.assertThrowsContaining(() => list.sorted());
        TestCase.assertThrowsContaining(() => list.sorted('nonexistent property'),
                                        "Cannot sort on key path 'nonexistent property': property 'Mid.nonexistent property' does not exist.");
        TestCase.assertThrowsContaining(() => list.sorted('link'),
                                        "Cannot sort on key path 'link': property 'Mid.link' of type 'object' cannot be the final property in the key path.");

        TestCase.assertArraysEqual(values(list.sorted([])), [3, 1, 2]);

        TestCase.assertArraysEqual(values(list.sorted('value')), [1, 2, 3]);
        TestCase.assertArraysEqual(values(list.sorted('value', false)), [1, 2, 3]);
        TestCase.assertArraysEqual(values(list.sorted('value', true)), [3, 2, 1]);
        TestCase.assertArraysEqual(values(list.sorted(['value'])), [1, 2, 3]);
        TestCase.assertArraysEqual(values(list.sorted([['value', false]])), [1, 2, 3]);
        TestCase.assertArraysEqual(values(list.sorted([['value', true]])), [3, 2, 1]);

        TestCase.assertArraysEqual(values(list.sorted('link.value')), [3, 2, 1]);
        TestCase.assertArraysEqual(values(list.sorted('link.value', false)), [3, 2, 1]);
        TestCase.assertArraysEqual(values(list.sorted('link.value', true)), [1, 2, 3]);
        TestCase.assertArraysEqual(values(list.sorted(['link.value'])), [3, 2, 1]);
        TestCase.assertArraysEqual(values(list.sorted([['link.value', false]])), [3, 2, 1]);
        TestCase.assertArraysEqual(values(list.sorted([['link.value', true]])), [1, 2, 3]);

        TestCase.assertThrowsContaining(() => prim.int.sorted('value', true),
                                        "Cannot sort on key path 'value': arrays of 'int' can only be sorted on 'self'");
        TestCase.assertThrowsContaining(() => prim.int.sorted('!ARRAY_VALUE', true),
                                        "Cannot sort on key path '!ARRAY_VALUE': arrays of 'int' can only be sorted on 'self'");

        TestCase.assertArraysEqual(prim.int.sorted([]), [3, 1, 2]);
        TestCase.assertArraysEqual(prim.int.sorted(), [1, 2, 3]);
        TestCase.assertArraysEqual(prim.int.sorted(false), [1, 2, 3]);
        TestCase.assertArraysEqual(prim.int.sorted(true), [3, 2, 1]);

        TestCase.assertArraysEqual(prim.optInt.sorted([]), [3, 1, 2, null]);
        TestCase.assertArraysEqual(prim.optInt.sorted(), [null, 1, 2, 3]);
        TestCase.assertArraysEqual(prim.optInt.sorted(false), [null, 1, 2, 3]);
        TestCase.assertArraysEqual(prim.optInt.sorted(true), [3, 2, 1, null]);

        TestCase.assertArraysEqual(prim.bool.sorted(), [false, true]);
        TestCase.assertArraysEqual(prim.float.sorted(), [1, 2, 3]);
        TestCase.assertArraysEqual(prim.double.sorted(), [1, 2, 3]);
        TestCase.assertArraysEqual(prim.string.sorted(), ['a', 'b', 'c']);
        TestCase.assertArraysEqual(prim.data.sorted(), [DATA1, DATA2, DATA3]);
        TestCase.assertArraysEqual(prim.date.sorted(), [DATE1, DATE2, DATE3]);
        TestCase.assertArraysEqual(prim.optBool.sorted(), [null, false, true]);
        TestCase.assertArraysEqual(prim.optFloat.sorted(), [null, 1, 2, 3]);
        TestCase.assertArraysEqual(prim.optDouble.sorted(), [null, 1, 2, 3]);
        TestCase.assertArraysEqual(prim.optString.sorted(), [null, 'a', 'b', 'c']);
        TestCase.assertArraysEqual(prim.optData.sorted(), [null, DATA1, DATA2, DATA3]);
        TestCase.assertArraysEqual(prim.optDate.sorted(), [null, DATE1, DATE2, DATE3]);
    },

    testArrayMethods: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList, schemas.PrimitiveArrays]});
        let object, prim;

        realm.write(() => {
            object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 10},
                {name: 'Tim', age: 11},
                {name: 'Bjarne', age: 12},
            ]});
            prim = realm.create('PrimitiveArrays', {int: [10, 11, 12]});
        });

        for (const list of [object.list, realm.objects('PersonObject')]) {
            TestCase.assertEqual(list.slice().length, 3);
            TestCase.assertEqual(list.slice(-1).length, 1);
            TestCase.assertEqual(list.slice(-1)[0].age, 12);
            TestCase.assertEqual(list.slice(1, 3).length, 2);
            TestCase.assertEqual(list.slice(1, 3)[1].age, 12);

            // A Node 6 regression in v8 causes an error when converting our objects to strings:
            // TypeError: Cannot convert a Symbol value to a string
            if (!TestCase.isNode6()) {
                TestCase.assertEqual(list.join(' '), 'Ari Tim Bjarne');
            }

            let count = 0;
            list.forEach((p, i) => {
                TestCase.assertEqual(p.name, list[i].name);
                count++;
            });
            TestCase.assertEqual(count, list.length);

            TestCase.assertArraysEqual(list.map(p => p.age), [10, 11, 12]);
            TestCase.assertTrue(list.some(p => p.age > 10));
            TestCase.assertTrue(list.every(p => p.age > 0));

            let person = list.find(p => p.name == 'Tim');
            TestCase.assertEqual(person.name, 'Tim');

            let index = list.findIndex(p => p.name == 'Tim');
            TestCase.assertEqual(index, 1);
            TestCase.assertEqual(list.indexOf(list[index]), index);

            TestCase.assertEqual(list.reduce((n, p) => n + p.age, 0), 33);
            TestCase.assertEqual(list.reduceRight((n, p) => n + p.age, 0), 33);

            // eslint-disable-next-line no-undef
            let iteratorMethodNames = ['entries', 'keys', 'values'];

            iteratorMethodNames.push(Symbol.iterator);

            iteratorMethodNames.forEach(methodName => {
                let iterator = list[methodName]();
                let count = 0;
                let result;

                // This iterator should itself be iterable.
                // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
                TestCase.assertEqual(iterator[Symbol.iterator](), iterator);

                while ((result = iterator.next()) && !result.done) {
                    let value = result.value;

                    switch (methodName) {
                        case 'entries':
                            TestCase.assertEqual(value.length, 2);
                            TestCase.assertEqual(value[0], count);
                            TestCase.assertEqual(value[1].name, list[count].name);
                            break;
                        case 'keys':
                            TestCase.assertEqual(value, count);
                            break;
                        default:
                            TestCase.assertEqual(value.name, list[count].name);
                            break;
                    }

                    count++;
                }

                TestCase.assertEqual(result.done, true);
                TestCase.assertEqual(result.value, undefined);
                TestCase.assertEqual(count, list.length);
            });
        }

        const list = prim.int;
        TestCase.assertEqual(list.slice().length, 3);
        TestCase.assertEqual(list.slice(-1).length, 1);
        TestCase.assertEqual(list.slice(-1)[0], 12);
        TestCase.assertEqual(list.slice(1, 3).length, 2);
        TestCase.assertEqual(list.slice(1, 3)[1], 12);

        TestCase.assertEqual(list.join(' '), '10 11 12');

        let count = 0;
        list.forEach((v, i) => {
            TestCase.assertEqual(v, i + 10);
            count++;
        });
        TestCase.assertEqual(count, list.length);

        TestCase.assertArraysEqual(list.map(p => p + 1), [11, 12, 13]);
        TestCase.assertTrue(list.some(p => p > 10));
        TestCase.assertTrue(list.every(p => p > 0));

        let value = list.find(p => p == 11);
        TestCase.assertEqual(value, 11)

        let index = list.findIndex(p => p == 11);
        TestCase.assertEqual(index, 1);
        TestCase.assertEqual(list.indexOf(list[index]), index);

        TestCase.assertEqual(list.reduce((n, p) => n + p, 0), 33);
        TestCase.assertEqual(list.reduceRight((n, p) => n + p, 0), 33);

        // eslint-disable-next-line no-undef
        let iteratorMethodNames = ['entries', 'keys', 'values'];

        iteratorMethodNames.push(Symbol.iterator);

        iteratorMethodNames.forEach(methodName => {
            let iterator = list[methodName]();
            let count = 0;
            let result;

            // This iterator should itself be iterable.
            // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
            TestCase.assertEqual(iterator[Symbol.iterator](), iterator);

            while ((result = iterator.next()) && !result.done) {
                let value = result.value;

                switch (methodName) {
                    case 'entries':
                        TestCase.assertEqual(value.length, 2);
                        TestCase.assertEqual(value[0], count);
                        TestCase.assertEqual(value[1], list[count]);
                        break;
                    case 'keys':
                        TestCase.assertEqual(value, count);
                        break;
                    default:
                        TestCase.assertEqual(value.name, list[count].name);
                        break;
                }

                count++;
            }

            TestCase.assertEqual(result.done, true);
            TestCase.assertEqual(result.value, undefined);
            TestCase.assertEqual(count, list.length);
        });
    },

    testIsValid: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        let object;
        let list;
        realm.write(() => {
            object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 10},
                {name: 'Tim', age: 11},
                {name: 'Bjarne', age: 12},
            ]});
            list = object.list;
            TestCase.assertEqual(list.isValid(), true);
            realm.delete(object);
        });

        TestCase.assertEqual(list.isValid(), false);
        TestCase.assertThrowsContaining(() => list.length, 'invalidated');
    },

    testListAggregateFunctions: function() {
        const NullableBasicTypesList = {
            name: 'NullableBasicTypesList',
            properties: {
                list: 'NullableBasicTypesObject[]',
            }
        };

        const realm = new Realm({schema: [schemas.NullableBasicTypes, NullableBasicTypesList]});
        const N = 50;
        const list = [];
        for (let i = 0; i < N; i++) {
            list.push({
                intCol: i+1,
                floatCol: i+1,
                doubleCol: i+1,
                dateCol: new Date(i+1)
            });
        }

        let object;
        realm.write(() => {
            object = realm.create('NullableBasicTypesList', {list: list});
        });

        TestCase.assertEqual(object.list.length, N);

        // int, float & double columns support all aggregate functions
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertEqual(object.list.min(colName), 1);
            TestCase.assertEqual(object.list.max(colName), N);
            TestCase.assertEqual(object.list.sum(colName), N*(N+1)/2);
            TestCase.assertEqual(object.list.avg(colName), (N+1)/2);
        });

        // date columns support only 'min' & 'max'
        TestCase.assertEqual(object.list.min('dateCol').getTime(), new Date(1).getTime());
        TestCase.assertEqual(object.list.max('dateCol').getTime(), new Date(N).getTime());
    },

    testListAggregateFunctionsWithNullColumnValues: function() {
        const NullableBasicTypesList = {
            name: 'NullableBasicTypesList',
            properties: {
                list: 'NullableBasicTypesObject[]',
            }
        };

        const realm = new Realm({schema: [schemas.NullableBasicTypes, NullableBasicTypesList]});

        const N = 50;
        const M = 10;

        const list = [];
        for (let i = 0; i < N; i++) {
            list.push({
                intCol: i+1,
                floatCol: i+1,
                doubleCol: i+1,
                dateCol: new Date(i+1)
            });
        }

        for (let j = 0; j < M; j++) {
            list.push({});
        }

        let object, objectEmptyList;
        realm.write(() => {
            object = realm.create('NullableBasicTypesList', {list: list});
            objectEmptyList = realm.create('NullableBasicTypesList', {list: []});
        });

        TestCase.assertEqual(object.list.length, N + M);

        // int, float & double columns support all aggregate functions
        // the M null valued objects should be ignored
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertEqual(object.list.min(colName), 1);
            TestCase.assertEqual(object.list.max(colName), N);
            TestCase.assertEqual(object.list.sum(colName), N*(N+1)/2);
            TestCase.assertEqual(object.list.avg(colName), (N+1)/2);
        });

        // date columns support only 'min' & 'max'
        TestCase.assertEqual(object.list.min('dateCol').getTime(), new Date(1).getTime());
        TestCase.assertEqual(object.list.max('dateCol').getTime(), new Date(N).getTime());

        // call aggregate functions on empty list
        TestCase.assertEqual(objectEmptyList.list.length, 0);
        ['intCol', 'floatCol', 'doubleCol'].forEach(colName => {
            TestCase.assertUndefined(objectEmptyList.list.min(colName));
            TestCase.assertUndefined(objectEmptyList.list.max(colName));
            TestCase.assertEqual(objectEmptyList.list.sum(colName), 0);
            TestCase.assertUndefined(objectEmptyList.list.avg(colName));
        });

        TestCase.assertUndefined(objectEmptyList.list.min('dateCol'));
        TestCase.assertUndefined(objectEmptyList.list.max('dateCol'));
    },

    testPrimitiveListAggregateFunctions: function() {
        const realm = new Realm({schema: [schemas.PrimitiveArrays]});
        let object;
        realm.write(() => {
            object = realm.create('PrimitiveArrays', {
                int:    [1, 2, 3],
                float:  [1.1, 2.2, 3.3],
                double: [1.11, 2.22, 3.33],
                date:   [DATE1, DATE2, DATE3],

                optInt:    [1, null, 2],
                optFloat:  [1.1, null, 3.3],
                optDouble: [1.11, null, 3.33],
                optDate:   [DATE1, null, DATE3]
            });
        });

        for (let prop of ['int', 'float', 'double', 'date', 'optInt', 'optFloat', 'optDouble', 'optDate']) {
            const list = object[prop];
            TestCase.assertSimilar(list.type, list.min(), list[0]);
            TestCase.assertSimilar(list.type, list.max(), list[2]);

            if (list.type === 'date') {
                TestCase.assertThrowsContaining(() => list.sum(), "Cannot sum 'date' array: operation not supported")
                TestCase.assertThrowsContaining(() => list.avg(), "Cannot average 'date' array: operation not supported")
                continue;
            }

            const sum = list[0] + list[1] + list[2];
            const avg = sum / (list[1] === null ? 2 : 3);
            TestCase.assertSimilar(list.type, list.sum(), sum);
            TestCase.assertSimilar(list.type, list.avg(), avg);
        }

        TestCase.assertThrowsContaining(() => object.bool.min(), "Cannot min 'bool' array: operation not supported")
        TestCase.assertThrowsContaining(() => object.int.min("foo"), "Invalid arguments: at most 0 expected, but 1 supplied")
    },

    testListAggregateFunctionsUnsupported: function() {
        const NullableBasicTypesList = {
            name: 'NullableBasicTypesList',
            properties: {
                list: {type: 'list', objectType: 'NullableBasicTypesObject'},
            }
        };

        const realm = new Realm({schema: [schemas.NullableBasicTypes, NullableBasicTypesList]});

        const N = 5;

        var list = [];
        for (let i = 0; i < N; i++) {
            list.push({
                intCol: i+1,
                floatCol: i+1,
                doubleCol: i+1,
                dateCol: new Date(i+1)
            });
        }

        let object;
        realm.write(() => {
            object = realm.create('NullableBasicTypesList', {list: list});
        });

        TestCase.assertEqual(object.list.length, N);

        // bool, string & data columns don't support 'min'
        ['bool', 'string', 'data'].forEach(colName => {
            TestCase.assertThrowsContaining(() => object.list.min(colName + 'Col'),
                                            `Cannot min property '${colName}Col': operation not supported for '${colName}' properties`);
        });

        // bool, string & data columns don't support 'max'
        ['bool', 'string', 'data'].forEach(colName => {
            TestCase.assertThrowsContaining(() => object.list.max(colName + 'Col'),
                                            `Cannot max property '${colName}Col': operation not supported for '${colName}' properties`);
        });

        // bool, string, date & data columns don't support 'avg'
        ['bool', 'string', 'date', 'data'].forEach(colName => {
            TestCase.assertThrowsContaining(() => object.list.avg(colName + 'Col'),
                                            `Cannot average property '${colName}Col': operation not supported for '${colName}' properties`);
        });

        // bool, string, date & data columns don't support 'sum'
        ['bool', 'string', 'date', 'data'].forEach(colName => {
            TestCase.assertThrowsContaining(() => object.list.sum(colName + 'Col'),
                                            `Cannot sum property '${colName}Col': operation not supported for '${colName}' properties`);
        });
    },

    testListAggregateFunctionsWrongProperty: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.PersonList]});
        let object;
        realm.write(() => {
            object = realm.create('PersonList', {list: [
                {name: 'Ari', age: 10},
                {name: 'Tim', age: 11},
                {name: 'Bjarne', age: 12},
            ]});
        });

        TestCase.assertThrowsContaining(() => object.list.min('foo'),
                                        "Property 'foo' does not exist on object 'PersonObject'");
        TestCase.assertThrowsContaining(() => object.list.max('foo'),
                                        "Property 'foo' does not exist on object 'PersonObject'");
        TestCase.assertThrowsContaining(() => object.list.sum('foo'),
                                        "Property 'foo' does not exist on object 'PersonObject'");
        TestCase.assertThrowsContaining(() => object.list.avg('foo'),
                                        "Property 'foo' does not exist on object 'PersonObject'");
        TestCase.assertThrowsContaining(() => object.list.min(),
                                        "JS value must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => object.list.max(),
                                        "JS value must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => object.list.sum(),
                                        "JS value must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => object.list.avg(),
                                        "JS value must be of type 'string', got (undefined)");
    },
};
