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
        var realm = new Realm({schema: [TestObjectSchema]});
        realm.write(function() {
            realm.create('TestObject', [1]);
            realm.create('TestObject', {'doubleCol': 2});
        });

        var objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 2, 'wrong object count');
        TestCase.assertEqual(objects[0].doubleCol, 1, 'wrong object property value');
        TestCase.assertEqual(objects[1].doubleCol, 2, 'wrong object property value');
    },

    testRealmObjects: function() {
        var realm = new Realm({schema: [TestObjectSchema]});
        realm.write(function() {
            realm.create('TestObject', [1]);
            realm.create('TestObject', {'doubleCol': 2});
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
        // TestCase.assertThrows(function() { 
        //     realm.objects('TestObject', 'invalid query');
        // });
        TestCase.assertThrows(function() { 
            realm.objects('TestObject', []);
        });

        TestCase.assertEqual(realm.objects('TestObject').length, 2);
        //TestCase.assertEqual(realm.objects('TestObject', 'doubleCol = 1').length, 1);
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
