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

var RealmTests = {
    testRealmConstructorPath: function() {
        TestCase.assertThrows(function() { new Realm('/invalidpath'); });
        TestCase.assertThrows(function() { new Realm(TestUtil.realmPathForFile('test1.realm'), 'invalidArgument'); });

        var defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

        var defaultRealm2 = new Realm();
        TestCase.assertEqual(defaultRealm2.path, Realm.defaultPath);

        var testPath = TestUtil.realmPathForFile('test1.realm');
        var realm = new Realm({schema: [], path: testPath});
        //TestCase.assertTrue(realm instanceof Realm);
        TestCase.assertEqual(realm.path, testPath);

        var testPath2 = TestUtil.realmPathForFile('test2.realm');
        var realm2 = new Realm({schema: [], path: testPath2});
        //TestCase.assertTrue(realm2 instanceof Realm);
        TestCase.assertEqual(realm2.path, testPath2);
    },

    testRealmConstructorSchemaVersion: function() {
        var defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.schemaVersion, 0);

        TestCase.assertThrows(function() {
            new Realm({schemaVersion: 1});
        }, "Realm already opened at a different schema version");
        
        TestCase.assertEqual(new Realm().schemaVersion, 0);
        TestCase.assertEqual(new Realm({schemaVersion: 0}).schemaVersion, 0);

        var testPath = TestUtil.realmPathForFile('test1.realm');
        var realm = new Realm({path: testPath, schema: [], schemaVersion: 1});
        TestCase.assertEqual(realm.schemaVersion, 1);

        //realm = undefined;
        //realm = new Realm({path: testPath, schema: [], schemaVersion: 2});
    },

    testDefaultPath: function() {
        var defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

        var newPath = TestUtil.realmPathForFile('default2.realm');
        Realm.defaultPath = newPath;
        defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.path, newPath);
        TestCase.assertEqual(Realm.defaultPath, newPath);

    },

    testRealmCreate: function() {
        var realm = new Realm({schema: [IntPrimaryObjectSchema, AllTypesObjectSchema, TestObjectSchema]});
        realm.write(function() {
            realm.create('TestObject', [1]);
            realm.create('TestObject', {'doubleCol': 2});
        });

        var objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 2, 'wrong object count');
        TestCase.assertEqual(objects[0].doubleCol, 1, 'wrong object property value');
        TestCase.assertEqual(objects[1].doubleCol, 2, 'wrong object property value');

        // test int primary object
        realm.write(function() {
            var obj0 = realm.create('IntPrimaryObject', [0, 'val0']);

            TestCase.assertThrows(function() {
                realm.create('IntPrimaryObject', [0, 'val0']);
            });
            realm.create('IntPrimaryObject', [1, 'val1'], true);
            var objects = realm.objects('IntPrimaryObject');
            TestCase.assertEqual(objects.length, 2);

            realm.create('IntPrimaryObject', [0, 'newVal0'], true);
            TestCase.assertEqual(obj0.valueCol, 'newVal0');
            TestCase.assertEqual(objects.length, 2);

            realm.create('IntPrimaryObject', {primaryCol: 0}, true);
            TestCase.assertEqual(obj0.valueCol, 'newVal0');
        });

        // test upsert with all type and string primary object
        realm.write(function() {
            var values = ['0', true, 1, 1.1, 1.11, '1', new Date(1), '1', [1], []];
            var obj0 = realm.create('AllTypesObject', values);

            TestCase.assertThrows(function() {
                realm.create('AllTypesObject', values);
            });
            realm.create('AllTypesObject', ['1', false, 2, 2.2, 2.11, '2', new Date(2), '2', null, [[2]]], true);
            var objects = realm.objects('AllTypesObject');
            TestCase.assertEqual(objects.length, 2);

            realm.create('AllTypesObject', ['0', false, 2, 2.2, 2.22, '2', new Date(2), '2', null, [[2]]], true);
            TestCase.assertEqual(objects.length, 2);
            TestCase.assertEqual(obj0.stringCol, '2');
            TestCase.assertEqual(obj0.boolCol, false);
            TestCase.assertEqual(obj0.intCol, 2);
            TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
            TestCase.assertEqual(obj0.doubleCol, 2.22);
            TestCase.assertEqual(obj0.dateCol.getTime(), 2);
            TestCase.assertEqual(obj0.dataCol, '2');
            TestCase.assertEqual(obj0.objectCol, null);
            TestCase.assertEqual(obj0.arrayCol.length, 1);

            realm.create('AllTypesObject', { primaryCol: '0' }, true);
            TestCase.assertEqual(obj0.stringCol, '2');

            realm.create('AllTypesObject', { primaryCol: '0', stringCol: '3', objectCol: [0] }, true);
            TestCase.assertEqual(obj0.stringCol, '3');
            TestCase.assertEqual(obj0.boolCol, false);
            TestCase.assertEqual(obj0.intCol, 2);
            TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
            TestCase.assertEqual(obj0.doubleCol, 2.22);
            TestCase.assertEqual(obj0.dateCol.getTime(), 2);
            TestCase.assertEqual(obj0.dataCol, '2');
            TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
            TestCase.assertEqual(obj0.arrayCol.length, 1);
        });
    },

    testRealmCreateWithDefaults: function() {
        var realm = new Realm({schema: [DefaultValuesObjectSchema, TestObjectSchema]});
        realm.write(function() {
            var obj = realm.create('DefaultValuesObject', {});
            TestCase.assertEqual(obj.boolCol, DefaultValuesObjectSchema.properties[0].default);
            TestCase.assertEqual(obj.intCol, DefaultValuesObjectSchema.properties[1].default);
            TestCase.assertEqualWithTolerance(obj.floatCol, DefaultValuesObjectSchema.properties[2].default, 0.000001);
            TestCase.assertEqual(obj.doubleCol, DefaultValuesObjectSchema.properties[3].default);
            TestCase.assertEqual(obj.stringCol, DefaultValuesObjectSchema.properties[4].default);
            TestCase.assertEqual(obj.dateCol.getTime(), DefaultValuesObjectSchema.properties[5].default.getTime());
            TestCase.assertEqual(obj.dataCol, DefaultValuesObjectSchema.properties[6].default);
            TestCase.assertEqual(obj.objectCol.doubleCol, DefaultValuesObjectSchema.properties[7].default[0]);
            TestCase.assertEqual(obj.nullObjectCol, null);
            TestCase.assertEqual(obj.arrayCol.length, DefaultValuesObjectSchema.properties[9].default.length);
            TestCase.assertEqual(obj.arrayCol[0].doubleCol, DefaultValuesObjectSchema.properties[9].default[0][0]);
        });
    },

    testRealmDelete: function() {
        var realm = new Realm({schema: [TestObjectSchema]});
        realm.write(function() {
            for (var i = 0; i < 10; i++) {
                realm.create('TestObject', [i]);
            }
        });

        var objects = realm.objects('TestObject');
        TestCase.assertThrows(function() {
            realm.delete(objects[0]);
        }, "can only delete in a write transaction");

        realm.write(function() {
            TestCase.assertThrows(function() {
                realm.delete();
            });

            realm.delete(objects[0]);
            TestCase.assertEqual(objects.length, 9, 'wrong object count');
            TestCase.assertEqual(objects[0].doubleCol, 9, "wrong property value");
            TestCase.assertEqual(objects[1].doubleCol, 1, "wrong property value");

            realm.delete([objects[0], objects[1]]);
            TestCase.assertEqual(objects.length, 7, 'wrong object count');
            TestCase.assertEqual(objects[0].doubleCol, 7, "wrong property value");
            TestCase.assertEqual(objects[1].doubleCol, 8, "wrong property value");

            var threeObjects = realm.objects('TestObject', "doubleCol < 5");
            TestCase.assertEqual(threeObjects.length, 3, "wrong results count");
            realm.delete(threeObjects);
            TestCase.assertEqual(objects.length, 4, 'wrong object count');
            TestCase.assertEqual(threeObjects.length, 0, 'threeObject should have been deleted');
        });
    },

    testRealmObjects: function() {
        var realm = new Realm({schema: [PersonObject]});
        realm.write(function() {
            realm.create('PersonObject', ['Ari', 10]);
            realm.create('PersonObject', ['Tim', 11]);
            realm.create('PersonObject', {'name': 'Bjarne', 'age': 12});
            realm.create('PersonObject', {'name': 'Alex', 'age': 12});
        });

        TestCase.assertThrows(function() { 
            realm.objects();
        });
        TestCase.assertThrows(function() { 
            realm.objects([]);
        });
        TestCase.assertThrows(function() { 
            realm.objects('InvalidClass');
        });
        TestCase.assertThrows(function() { 
            realm.objects('PersonObject', 'invalid query');
        });
        TestCase.assertThrows(function() { 
            realm.objects('PersonObject', []);
        });

        TestCase.assertEqual(realm.objects('PersonObject', "truepredicate").length, 4);
        TestCase.assertEqual(realm.objects('PersonObject').length, 4);
        TestCase.assertEqual(realm.objects('PersonObject', 'age = 11').length, 1);
        TestCase.assertEqual(realm.objects('PersonObject', 'age = 11')[0].name, 'Tim');
        TestCase.assertEqual(realm.objects('PersonObject', 'age = 12').length, 2);
        TestCase.assertEqual(realm.objects('PersonObject', 'age = 13').length, 0);
        TestCase.assertEqual(realm.objects('PersonObject', 'age < 12').length, 2);
        TestCase.assertEqual(realm.objects('PersonObject', 'age > 10 && age < 13').length, 3);
        TestCase.assertEqual(realm.objects('PersonObject', 'age >= 11 && age < 13').length, 3);
        TestCase.assertEqual(realm.objects('PersonObject', 'name = \'Tim\'').length, 1);
    },

    testNotifications: function() {
        var notificationCount = 0;
        var realm = new Realm({schema: []});
        var notification = realm.addNotification(function() { 
            notificationCount++; 
        });
        TestCase.assertEqual(notificationCount, 0);
        realm.write(function() {});
        TestCase.assertEqual(notificationCount, 1);
    },
};

