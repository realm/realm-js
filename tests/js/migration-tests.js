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
var Schemas = require('./schemas');

module.exports = {
    testMigrationFunction: function() {
        var count = 0;
        function migrationFunction(oldRealm, newRealm) {
            TestCase.assertEqual(oldRealm.schemaVersion, 0);
            TestCase.assertEqual(newRealm.schemaVersion, 1);
            count++;
        }

        // no migration should be run
        var realm = new Realm({schema: [], migration: migrationFunction});
        TestCase.assertEqual(0, count);
        realm.close();

        // migration should be run
        realm = new Realm({schema: [Schemas.TestObject], migration: migrationFunction, schemaVersion: 1});
        TestCase.assertEqual(1, count);
        realm.close();

        // invalid migration function
        TestCase.assertThrows(function() {
            new Realm({schema: [], schemaVersion: 2, migration: 'invalid'});
        });

        // migration function exceptions should propogate
        var exception = new Error('expected exception');
        realm = undefined;
        TestCase.assertThrowsException(function() {
            realm = new Realm({schema: [], schemaVersion: 3, migration: function() {
                throw exception;
            }});
        }, exception);
        TestCase.assertEqual(realm, undefined);
        TestCase.assertEqual(Realm.schemaVersion(Realm.defaultPath), 1);

        // migration function shouldn't run if nothing changes
        realm = new Realm({schema: [Schemas.TestObject], migration: migrationFunction, schemaVersion: 1});
        TestCase.assertEqual(1, count);
        realm.close();

        // migration function should run if only schemaVersion changes
        realm = new Realm({schema: [Schemas.TestObject], migration: function() { count++; }, schemaVersion: 2});
        TestCase.assertEqual(2, count);
        realm.close();
    },

    testDataMigration: function() {
        var realm = new Realm({schema: [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }]});
        realm.write(function() {
            realm.create('TestObject', ['stringValue', 1]);
        });
        realm.close();

        realm = new Realm({
            schema: [{
                name: 'TestObject',
                properties: {
                    renamed: 'string',
                    prop1: 'int',
                }
            }], 
            schemaVersion: 1, 
            migration: function(oldRealm, newRealm) {
                var oldObjects = oldRealm.objects('TestObject');
                var newObjects = newRealm.objects('TestObject');
                TestCase.assertEqual(oldObjects.length, 1);
                TestCase.assertEqual(newObjects.length, 1);

                TestCase.assertEqual(oldObjects[0].prop0, 'stringValue');
                TestCase.assertEqual(oldObjects[0].prop1, 1);
                TestCase.assertEqual(oldObjects[0].renamed, undefined);

                TestCase.assertEqual(newObjects[0].prop0, undefined);
                TestCase.assertEqual(newObjects[0].renamed, '');
                TestCase.assertEqual(newObjects[0].prop1, 1);

                newObjects[0].renamed = oldObjects[0].prop0;

                TestCase.assertThrows(function() {
                    oldObjects[0].prop0 = 'throws';
                });
            }
        });

        var objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 1);
        TestCase.assertEqual(objects[0].renamed, 'stringValue');
        TestCase.assertEqual(objects[0].prop1, 1);
        TestCase.assertEqual(objects[0].prop0, undefined);
    },

    testMigrationSchema: function() {
        var realm = new Realm({schema: [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }]});
        realm.close();

        realm = new Realm({
            schema: [{
                name: 'TestObject',
                properties: {
                    renamed: 'string',
                    prop1: 'int',
                }
            }], 
            schemaVersion: 1, 
            migration: function(oldRealm, newRealm) {
                var oldSchema = oldRealm.schema;
                var newSchema = newRealm.schema;
                TestCase.assertEqual(oldSchema.length, 1);
                TestCase.assertEqual(newSchema.length, 1);

                TestCase.assertEqual(oldSchema[0].name, 'TestObject');
                TestCase.assertEqual(newSchema[0].name, 'TestObject');

                TestCase.assertEqual(oldSchema[0].properties.prop0.type, 'string');
                TestCase.assertEqual(newSchema[0].properties.prop0, undefined);

                TestCase.assertEqual(oldSchema[0].properties.prop1.type, 'int');
                TestCase.assertEqual(newSchema[0].properties.prop1.type, 'int');

                TestCase.assertEqual(oldSchema[0].properties.renamed, undefined);
                TestCase.assertEqual(newSchema[0].properties.renamed.type, 'string');
            }
        });
    },
};
