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
    testLinkTypesPropertySetters: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var obj = null;
        realm.write(function() {
            obj = realm.create('LinkTypesObject', [[1], undefined, [[3]]]);
        });
        TestCase.assertEqual(realm.objects('TestObject').length, 2);

        // set/reuse object property
        realm.write(function() {
            obj.objectCol1 = obj.objectCol;
        });
        TestCase.assertEqual(obj.objectCol1.doubleCol, 1);
        //TestCase.assertEqual(obj.objectCol, obj.objectCol1);
        TestCase.assertEqual(realm.objects('TestObject').length, 2);

        realm.write(function() {
            obj.objectCol = undefined;
            obj.objectCol1 = null;
        });
        TestCase.assertEqual(obj.objectCol, null);
        TestCase.assertEqual(obj.objectCol1, null);

        // set object as JSON
        realm.write(function() {
            obj.objectCol = { doubleCol: 3 };
        });
        TestCase.assertEqual(obj.objectCol.doubleCol, 3);
        TestCase.assertEqual(realm.objects('TestObject').length, 3);
    },

    testArrayLength: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        realm.write(function() {
            var obj = realm.create('LinkTypesObject', [[1], [2], [[3]]]);
            TestCase.assertEqual(obj.arrayCol.length, 1);

            obj.arrayCol = [];
            TestCase.assertEqual(obj.arrayCol.length, 0);

            obj.arrayCol = [[1], [2]];
            TestCase.assertEqual(obj.arrayCol.length, 2);
        });        
    },

    testArraySubscript: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        realm.write(function() { realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]); }); 

        var array = realm.objects('LinkTypesObject')[0].arrayCol;
        TestCase.assertEqual(array[0].doubleCol, 3);
        TestCase.assertEqual(array[1].doubleCol, 4);
        TestCase.assertThrows(function() { array[2]; }, 'Invalid index');
        TestCase.assertThrows(function() { array[-1]; }, 'Invalid index');
    },

    testArrayInvalidProperty: function() {       
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        realm.write(function() { realm.create('LinkTypesObject', [[1], [2], [[3], [4]]]); }); 

        var array = realm.objects('LinkTypesObject')[0].arrayCol;
        TestCase.assertEqual(undefined, array.ablasdf);
    },

    testArrayEnumerate: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        realm.write(function() { realm.create('LinkTypesObject', [[1], [2], []]); }); 

        var obj = realm.objects('LinkTypesObject')[0];
        for (var object in obj.arrayCol) {
            TestCase.assertTrue(false, "No objects should have been enumerated");
        }

        realm.write(function() {
            obj.arrayCol = [[0], [1]];
            TestCase.assertEqual(obj.arrayCol.length, 2);
        });

        var count = 0;
        for (var object in obj.arrayCol) {
            count++;
            //TestCase.assertTrue(object instanceof Object);
        }    
        TestCase.assertEqual(2, count);
    },

    testPush: function() {
        
    }
};
