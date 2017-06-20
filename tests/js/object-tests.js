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

var RANDOM_DATA = new Uint8Array([
    0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9,
    0x67, 0x1e, 0x40, 0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
]);

module.exports = {
    testBasicTypesPropertyGetters: function() {
        var realm = new Realm({schema: [schemas.BasicTypes]});
        var object;

        var basicTypesValues = {
            boolCol:   true,
            intCol:    1,
            floatCol:  1.1,
            doubleCol: 1.11,
            stringCol: 'string',
            dateCol:   new Date(1),
            dataCol:   RANDOM_DATA,
        };

        realm.write(function() {
            object = realm.create('BasicTypesObject', basicTypesValues);
        });

        for (var name in schemas.BasicTypes.properties) {
            var prop = schemas.BasicTypes.properties[name];
            var type = typeof prop == 'object' ? prop.type : prop;

            if (type == 'float' || type == 'double') {
                TestCase.assertEqualWithTolerance(object[name], basicTypesValues[name], 0.000001);
            }
            else if (type == 'data') {
                TestCase.assertArraysEqual(new Uint8Array(object[name]), RANDOM_DATA);
            }
            else if (type == 'date') {
                TestCase.assertEqual(object[name].getTime(), basicTypesValues[name].getTime());
            }
            else {
                TestCase.assertEqual(object[name], basicTypesValues[name]);
            }
        }

        TestCase.assertEqual(object.nonexistent, undefined);
    },
    testNullableBasicTypesPropertyGetters: function() {
        var realm = new Realm({schema: [schemas.NullableBasicTypes]});
        var object, nullObject;

        var basicTypesValues = {
            boolCol:   true,
            intCol:    1,
            floatCol:  1.1,
            doubleCol: 1.11,
            stringCol: 'string',
            dateCol:   new Date(1),
            dataCol:   RANDOM_DATA,
        };

        realm.write(function() {
            object = realm.create('NullableBasicTypesObject', basicTypesValues);

            nullObject = realm.create('NullableBasicTypesObject', {
                boolCol:   null,
                intCol:    null,
                floatCol:  null,
                doubleCol: null,
                stringCol: null,
                dateCol:   null,
                dataCol:   null,
            });
        });

        for (var name in schemas.BasicTypes.properties) {
            var prop = schemas.BasicTypes.properties[name];
            var type = typeof prop == 'object' ? prop.type : prop;

            TestCase.assertEqual(nullObject[name], null);

            if (type == 'float' || type == 'double') {
                TestCase.assertEqualWithTolerance(object[name], basicTypesValues[name], 0.000001);
            }
            else if (type == 'data') {
                TestCase.assertArraysEqual(new Uint8Array(object[name]), RANDOM_DATA);
            }
            else if (type == 'date') {
                TestCase.assertEqual(object[name].getTime(), basicTypesValues[name].getTime());
            }
            else {
                TestCase.assertEqual(object[name], basicTypesValues[name]);
            }
        }

    },
    testBasicTypesPropertySetters: function() {
        var realm = new Realm({schema: [schemas.BasicTypes]});
        var obj;

        var basicTypesValues = {
            boolCol:   true,
            intCol:    1,
            floatCol:  1.1,
            doubleCol: 1.11,
            stringCol: 'string',
            dateCol:   new Date(1),
            dataCol:   new ArrayBuffer(),
        };

        realm.write(function() {
            obj = realm.create('BasicTypesObject', basicTypesValues);
            obj.boolCol = false;
            obj.intCol = 2;
            obj.floatCol = 2.2;
            obj.doubleCol = 2.22;
            obj.stringCol = 'STRING';
            obj.dateCol = new Date(2);
            obj.dataCol = RANDOM_DATA;
        });

        TestCase.assertEqual(obj.boolCol, false, 'wrong bool value');
        TestCase.assertEqual(obj.intCol, 2, 'wrong int value');
        TestCase.assertEqualWithTolerance(obj.floatCol, 2.2, 0.000001, 'wrong float value');
        TestCase.assertEqualWithTolerance(obj.doubleCol, 2.22, 0.000001, 'wrong double value');
        TestCase.assertEqual(obj.stringCol, 'STRING', 'wrong string value');
        TestCase.assertEqual(obj.dateCol.getTime(), 2, 'wrong date value');
        TestCase.assertArraysEqual(new Uint8Array(obj.dataCol), RANDOM_DATA, 'wrong data value');

        realm.write(function() {
            TestCase.assertThrows(function() {
                obj.boolCol = 'cat';
            });
            TestCase.assertThrows(function() {
                obj.intCol = 'dog';
            });

            TestCase.assertThrows(function() {
                obj.boolCol = null;
            });
            TestCase.assertThrows(function() {
                obj.boolCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.intCol = null;
            });
            TestCase.assertThrows(function() {
                obj.intCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.floatCol = null;
            });
            TestCase.assertThrows(function() {
                obj.floatCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.doubleCol = null;
            });
            TestCase.assertThrows(function() {
                obj.doubleCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.stringCol = null;
            });
            TestCase.assertThrows(function() {
                obj.stringCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.dateCol = null;
            });
            TestCase.assertThrows(function() {
                obj.dateCol = undefined;
            });
            TestCase.assertThrows(function() {
                obj.dataCol = null;
            });
            TestCase.assertThrows(function() {
                obj.dataCol = undefined;
            });
        });

        TestCase.assertThrows(function() {
            obj.boolCol = true;
        }, 'can only set property values in a write transaction');

        TestCase.assertEqual(obj.boolCol, false, 'bool value changed outside transaction');
    },
    testNullableBasicTypesPropertySetters: function() {
        var realm = new Realm({schema: [schemas.NullableBasicTypes]});
        var obj, obj1;

        var basicTypesValues = {
            boolCol:   true,
            intCol:    1,
            floatCol:  1.1,
            doubleCol: 1.11,
            stringCol: 'string',
            dateCol:   new Date(1),
            dataCol:   RANDOM_DATA,
        };

        realm.write(function() {
            obj = realm.create('NullableBasicTypesObject', basicTypesValues);
            obj1 = realm.create('NullableBasicTypesObject', basicTypesValues);

            for (var name in schemas.NullableBasicTypes.properties) {
                obj[name] = null;
                obj1[name] = undefined;
            }
        });

        for (var name in schemas.NullableBasicTypes.properties) {
            TestCase.assertEqual(obj[name], null);
            TestCase.assertEqual(obj1[name], null);
        }

        realm.write(function() {
            TestCase.assertThrows(function() {
                obj.boolCol = 'cat';
            });
            TestCase.assertThrows(function() {
                obj.intCol = 'dog';
            });
        });

        TestCase.assertThrows(function() {
            obj.boolCol = null;
        }, 'can only set property values in a write transaction');
    },
    testLinkTypesPropertyGetters: function() {
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var obj = null;

        realm.write(function() {
            obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: null,
                arrayCol: [{doubleCol: 3}],
            });
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
        var realm = new Realm({schema: [schemas.LinkTypes, schemas.TestObject]});
        var objects = realm.objects('TestObject');
        var obj;

        realm.write(function() {
            obj = realm.create('LinkTypesObject', {
                objectCol: {doubleCol: 1},
                objectCol1: null,
                arrayCol: [{doubleCol: 3}],
            });
        });

        TestCase.assertEqual(objects.length, 2);

        TestCase.assertThrows(function() {
            obj.objectCol1 = obj.objectCol;
        }, 'can only set property values in a write transaction');

        // set/reuse object property
        realm.write(function() {
            obj.objectCol1 = obj.objectCol;
        });
        TestCase.assertEqual(obj.objectCol1.doubleCol, 1);
        //TestCase.assertEqual(obj.objectCol, obj.objectCol1);
        TestCase.assertEqual(objects.length, 2);

        realm.write(function() {
            obj.objectCol = null;
            obj.objectCol1 = null;
        });
        TestCase.assertEqual(obj.objectCol, null);
        TestCase.assertEqual(obj.objectCol1, null);

        // set object as JSON
        realm.write(function() {
            obj.objectCol = {doubleCol: 1};
        });
        TestCase.assertEqual(obj.objectCol.doubleCol, 1);
        TestCase.assertEqual(objects.length, 3);

        // set array property
        realm.write(function() {
            obj.arrayCol = [
                obj.arrayCol[0],
                obj.objectCol,
                realm.create('TestObject', {doubleCol: 2}),
            ];
        });

        TestCase.assertEqual(objects.length, 4);
        TestCase.assertEqual(obj.arrayCol.length, 3);
        TestCase.assertEqual(obj.arrayCol[0].doubleCol, 3);
        TestCase.assertEqual(obj.arrayCol[1].doubleCol, 1);
        TestCase.assertEqual(obj.arrayCol[2].doubleCol, 2);

        // set object from another realm
        var another = new Realm({path: 'another.realm', schema: realm.schema});
        var anotherObj;
        another.write(function() {
            anotherObj = another.create('TestObject', {doubleCol: 3});
        });
        realm.write(function() {
            obj.objectCol = anotherObj;
        });
        TestCase.assertEqual(obj.objectCol.doubleCol, 3);
    },
    testEnumerablePropertyNames: function() {
        var realm = new Realm({schema: [schemas.BasicTypes]});
        var object;

        realm.write(function() {
            object = realm.create('BasicTypesObject', {
                boolCol:   true,
                intCol:    1,
                floatCol:  1.1,
                doubleCol: 1.11,
                stringCol: 'string',
                dateCol:   new Date(1),
                dataCol:   RANDOM_DATA,
            });
        });

        var propNames = Object.keys(schemas.BasicTypes.properties);
        TestCase.assertArraysEqual(Object.keys(object), propNames, 'Object.keys');

        for (var key in object) {
            TestCase.assertEqual(key, propNames.shift());
        }

        TestCase.assertEqual(propNames.length, 0);
    },
    testDataProperties: function() {
        var realm = new Realm({schema: [schemas.DefaultValues, schemas.TestObject]});
        var object;

        // Should be be able to set a data property with a typed array.
        realm.write(function() {
            object = realm.create('DefaultValuesObject', {dataCol: RANDOM_DATA});
        });

        // Data properties should return an instance of an ArrayBuffer.
        TestCase.assertTrue(object.dataCol instanceof ArrayBuffer);
        TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

        // Should be able to also set a data property to an ArrayBuffer.
        realm.write(function() {
            object.dataCol = RANDOM_DATA.buffer;
        });
        TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

        // Should be to set a data property to a DataView.
        realm.write(function() {
            object.dataCol = new DataView(RANDOM_DATA.buffer);
        });
        TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

        // Test that a variety of size and slices of data still work.
        [
            [0, -1],
            [0, -2],
            [1, 0],
            [1, -1],
            [1, -2],
            [2, 0],
            [2, -1],
            [2, -2],
        ].forEach(function(range) {
            var array = RANDOM_DATA.subarray(range[0], range[1]);
            realm.write(function() {
                // Use a partial "view" of the underlying ArrayBuffer.
                object.dataCol = new Uint8Array(RANDOM_DATA.buffer, range[0], array.length);
            });
            TestCase.assertArraysEqual(new Uint8Array(object.dataCol), array, range.join('...'));
        });

        // Test other TypedArrays to make sure they all work for setting data properties.
        [
            Int8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
        ].forEach(function(TypedArray) {
            var array = new TypedArray(RANDOM_DATA.buffer);
            realm.write(function() {
                object.dataCol = array;
            });
            TestCase.assertArraysEqual(new TypedArray(object.dataCol), array, TypedArray.name);
        });

        realm.write(function() {
            TestCase.assertThrows(function() {
                object.dataCol = true;
            });
            TestCase.assertThrows(function() {
                object.dataCol = 1;
            });
            TestCase.assertThrows(function() {
                object.dataCol = 'data';
            });
            TestCase.assertThrows(function() {
                object.dataCol = [1];
            });
        });
    },

    testObjectConstructor: function() {
        var realm = new Realm({schema: [schemas.TestObject]});

        realm.write(function() {
            var obj = realm.create('TestObject', {doubleCol: 1});
            TestCase.assertTrue(obj instanceof Realm.Object);
        });

        TestCase.assertEqual(typeof Realm.Object, 'function');
        TestCase.assertTrue(Realm.Object instanceof Function);
    },

    testIsValid: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var obj;
        realm.write(function() {
            obj = realm.create('TestObject', {doubleCol: 1});
            TestCase.assertEqual(obj.isValid(), true);
            realm.delete(obj);
            TestCase.assertEqual(obj.isValid(), false);
        });

        TestCase.assertEqual(obj.isValid(), false);
        TestCase.assertThrows(function() {
            obj.doubleCol;
        });
    },
    
    testObjectSchema: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var obj;
        realm.write(function() {
            obj = realm.create('TestObject', {doubleCol: 1});
        });

        const schema = obj.objectSchema();
        TestCase.assertEqual(schema.name, schemas.TestObject.name);
        TestCase.assertArraysEqual(Object.keys(schema.properties), Object.keys(schemas.TestObject.properties));
        TestCase.assertEqual(schema.properties.doubleCol.type, 'double');
    },

    testIgnoredProperties: function() {
        var realm = new Realm({schema: [schemas.TestObject]});
        var obj;
        realm.write(function() {
            obj = realm.create('TestObject', {doubleCol: 1, ignored: true});
        });

        TestCase.assertEqual(obj.doubleCol, 1);
        TestCase.assertEqual(obj.ignored, undefined);
        obj.ignored = true;
        TestCase.assertEqual(obj.ignored, true);
    },

    testDates: function() {
        Realm.copyBundledRealmFiles();

        // test file format upgrade
        var realm_v3 = new Realm({path: 'dates-v3.realm', schema: [schemas.DateObject]});
        TestCase.assertEqual(realm_v3.objects('Date').length, 2);
        TestCase.assertEqual(realm_v3.objects('Date')[0].currentDate.getTime(), 1462500087955);
        TestCase.assertEqual(realm_v3.objects('Date')[0].nullDate.getTime(), 1462500087955);
        TestCase.assertEqual(realm_v3.objects('Date')[1].currentDate.getTime(), -10000);
        TestCase.assertEqual(realm_v3.objects('Date')[1].nullDate, null);

        // get new file format is not upgraded
        var realm_v5 = new Realm({path: 'dates-v5.realm', schema: [schemas.DateObject]});
        TestCase.assertEqual(realm_v5.objects('Date').length, 2);
        TestCase.assertEqual(realm_v3.objects('Date')[0].currentDate.getTime(), 1462500087955);
        TestCase.assertEqual(realm_v3.objects('Date')[0].nullDate.getTime(), 1462500087955);
        TestCase.assertEqual(realm_v3.objects('Date')[1].currentDate.getTime(), -10000);
        TestCase.assertEqual(realm_v3.objects('Date')[1].nullDate, null);
        
        // test different dates
        var realm = new Realm({schema: [schemas.DateObject]});
        realm.write(function() {
            realm.create('Date', { currentDate: new Date(10000) });
            realm.create('Date', { currentDate: new Date(-10000) });
            realm.create('Date', { currentDate: new Date(1000000000000) });
            realm.create('Date', { currentDate: new Date(-1000000000000) });
        });
        TestCase.assertEqual(realm.objects('Date')[0].currentDate.getTime(), 10000);
        TestCase.assertEqual(realm.objects('Date')[1].currentDate.getTime(), -10000);
        TestCase.assertEqual(realm.objects('Date')[2].currentDate.getTime(), 1000000000000);
        TestCase.assertEqual(realm.objects('Date')[3].currentDate.getTime(), -1000000000000);
    }
};
