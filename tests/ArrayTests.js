////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

var ArrayTests = {
    testArrayLength: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3]]]);
            TestCase.assertEqual(obj.arrayCol.length, 1);

            obj.arrayCol = [];
            TestCase.assertEqual(obj.arrayCol.length, 0);

            obj.arrayCol = [[1], [2]];
            TestCase.assertEqual(obj.arrayCol.length, 2);

            TestCase.assertThrows(function() {
                obj.arrayCol.length = 0;
            }, 'cannot set length property on lists');
        });
    },

    testArraySubscriptGetters: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
            array = obj.arrayCol;
        });

        TestCase.assertEqual(array[0].doubleCol, 3);
        TestCase.assertEqual(array[1].doubleCol, 4);
        TestCase.assertEqual(array[2], undefined);
        TestCase.assertEqual(array[-1], undefined);
    },

    testArraySubscriptSetters: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
            array = obj.arrayCol;

            array[0] = [5];
            array[1] = [6];

            TestCase.assertEqual(array[0].doubleCol, 5);
            TestCase.assertEqual(array[1].doubleCol, 6);

            TestCase.assertThrows(function() {
                array[2] = [1];
            }, 'cannot set list item beyond its bounds');

            TestCase.assertThrows(function() {
                array[-1] = [1];
            }, 'cannot set list item with negative index');
        });

        TestCase.assertThrows(function() {
            array[0] = [3];
        }, 'cannot set list item outside write transaction');
    },

    testArrayInvalidProperty: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
            array = obj.arrayCol;
        });

        TestCase.assertEqual(undefined, array.ablasdf);
    },

    testArrayEnumerate: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var obj;

        realm.write(function() {
            obj = realm.create('LinkTypesObject', [[1], [2], []]);
        });

        for (var index in obj.arrayCol) {
            TestCase.assertTrue(false, "No objects should have been enumerated: " + index);
        }

        realm.write(function() {
            obj.arrayCol = [[0], [1]];
            TestCase.assertEqual(obj.arrayCol.length, 2);
        });

        var count = 0;
        for (var index in obj.arrayCol) {
            count++;
        }
        TestCase.assertEqual(2, count);
    },

    testPush: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3]]]);
            TestCase.assertEqual(obj.arrayCol.length, 1);

            array = obj.arrayCol;
            TestCase.assertEqual(array.push([4]), 2);
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
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
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
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3]]]);
            TestCase.assertEqual(obj.arrayCol.length, 1);

            array = obj.arrayCol;
            TestCase.assertEqual(array.unshift([5]), 2);
            TestCase.assertEqual(array.length, 2);
            TestCase.assertEqual(array[0].doubleCol, 5);

            TestCase.assertEqual(array.unshift(obj.objectCol, obj.objectCol1), 4);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);
        });   

        TestCase.assertEqual(array.length, 4);
        TestCase.assertThrows(function() {
            array.unshift([1]);
        }, 'can only unshift in a write transaction');
    },

    testShift: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
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
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var array;

        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]);
            var removed;

            array = obj.arrayCol;

            removed = array.splice(0, 0, obj.objectCol, obj.objectCol1);
            TestCase.assertEqual(removed.length, 0);
            TestCase.assertEqual(array.length, 4);
            TestCase.assertEqual(array[0].doubleCol, 1);
            TestCase.assertEqual(array[1].doubleCol, 2);

            removed = array.splice(2, 2, [5], [6]);
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
            
            TestCase.assertThrows(function() {
                array.splice(0, 0, 0);
            });
        });

        TestCase.assertThrows(function() {
            obj.arrayCol.splice(0, 0, obj.objectCol);
        }, 'can only splice in a write transaction');
    },
};
