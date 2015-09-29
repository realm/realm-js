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

var ObjectTests = {
    testBasicTypesPropertyGetters: function() {
    	var basicTypesValues = [true, 1, 1.1, 1.11, 'string', new Date(1), 'DATA'];
    	var realm = new Realm({schema: [BasicTypesObjectSchema]});
    	var object = null;
    	realm.write(function() {
    		object = realm.create('BasicTypesObject', basicTypesValues);
    	});

    	for (var i = 0; i < BasicTypesObjectSchema.properties.length; i++) {
    		var prop = BasicTypesObjectSchema.properties[i];
    		if (prop.type == Realm.Types.Float) {
    			TestCase.assertEqualWithTolerance(object[prop.name], basicTypesValues[i], 0.000001);
    		}
    		else if (prop.type == Realm.Types.Date) {
    			TestCase.assertEqual(object[prop.name].getTime(), basicTypesValues[i].getTime());
    		}
    		else {
	    		TestCase.assertEqual(object[prop.name], basicTypesValues[i]);
	    	}
    	}
    },
    testBasicTypesPropertySetters: function() {
    	var basicTypesValues = [true, 1, 1.1, 1.11, 'string', new Date(1), 'DATA'];
    	var realm = new Realm({schema: [BasicTypesObjectSchema]});
    	var obj = null;
    	realm.write(function() {
    		obj = realm.create('BasicTypesObject', basicTypesValues);
    		obj.boolCol = false; 
    		obj.intCol = 2; 
    		obj.floatCol = 2.2;
    		obj.doubleCol = 2.22;
    		obj.stringCol = 'STRING';
    		obj.dateCol = new Date(2); 
    		obj.dataCol = 'b';
   		});
   		TestCase.assertEqual(obj.boolCol, false, 'wrong bool value');
    	TestCase.assertEqual(obj.intCol, 2, 'wrong int value');
    	TestCase.assertEqualWithTolerance(obj.floatCol, 2.2, 0.000001, 'wrong float value');
    	TestCase.assertEqual(obj.doubleCol, 2.22, 'wrong double value');
    	TestCase.assertEqual(obj.stringCol, 'STRING', 'wrong string value');
    	TestCase.assertEqual(obj.dateCol.getTime(), 2, 'wrong date value');
    	TestCase.assertEqual(obj.dataCol, 'b', 'wrong data value');
    },
    testLinkTypesPropertyGetters: function() {
    	var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
    	var obj = null;
    	realm.write(function() {
    		obj = realm.create('LinkTypesObject', [[1], null, [[3]]]);
    	});

    	var objVal = obj.objectCol;
    	TestCase.assertEqual(typeof objVal, 'object');
    	TestCase.assertNotEqual(objVal, null);
    	TestCase.assertEqual(objVal.doubleCol, 1);

        TestCase.assertEqual(obj.objectCol1, null);

    	var arrayVal = obj.arrayCol;
    	TestCase.assertEqual(typeof arrayVal, 'object');
    	TestCase.assertNotEqual(arrayVal, null);
    	TestCase.assertEqual(arrayVal.length, 1);
    	TestCase.assertEqual(arrayVal[0].doubleCol, 3);
    },
    testLinkTypesPropertySetters: function() {
        var realm = new Realm({schema: [LinkTypesObjectSchema, TestObjectSchema]});
        var obj = null;
        realm.write(function() {
            obj = realm.create('LinkTypesObject', [[1], null, [[3]]]);
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
            obj.objectCol = null;
            obj.objectCol1 = null;
        });
        TestCase.assertEqual(obj.objectCol, null);
        TestCase.assertEqual(obj.objectCol1, null);

        // set object as JSON
        realm.write(function() {
            obj.objectCol = { doubleCol: 1 };
        });
        TestCase.assertEqual(obj.objectCol.doubleCol, 1);
        TestCase.assertEqual(realm.objects('TestObject').length, 3);

        // set array property
        realm.write(function() {
            obj.arrayCol = [obj.arrayCol[0], obj.objectCol, realm.create('TestObject', [2])];
        });
        TestCase.assertEqual(obj.arrayCol.length, 3);
        TestCase.assertEqual(obj.arrayCol[0].doubleCol, 3);
        TestCase.assertEqual(obj.arrayCol[1].doubleCol, 1);
        TestCase.assertEqual(obj.arrayCol[2].doubleCol, 2);
    },
};
