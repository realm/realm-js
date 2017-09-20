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

    testDeleteModelMigration: function() {
        const schema = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }];

        var realm = new Realm({schema: schema});

        realm.write(function() {
            realm.create('TestObject', ['stringValue', 1]);
        });

        realm.close();

        realm = new Realm({schema: [], schemaVersion: 1});
        TestCase.assertEqual(realm.schema.length, 0); // no models
        realm.close(); // this won't delete the model

        realm = new Realm({schema: schema, schemaVersion: 2});
        TestCase.assertEqual(realm.objects('TestObject').length, 1); // the model objects are still there
        realm.close();

        // now delete the model explicitly, which should delete the objects too
        realm = new Realm({schema: [], schemaVersion: 3, migration: function(oldRealm, newRealm) {
            newRealm.deleteModel('TestObject');
        }});

        TestCase.assertEqual(realm.schema.length, 0); // no models

        realm.close();

        realm = new Realm({schema: schema, schemaVersion: 4});

        TestCase.assertEqual(realm.objects('TestObject').length, 0);

        realm.close();
    },

    testDeleteModelInSchema: function() {
        const schema = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }];

        var realm = new Realm({schema: schema});

        realm.write(function() {
            realm.create('TestObject', ['stringValue', 1]);
        });

        realm.close();


        // now delete the model explicitly, but it should remain as it's still in the schema
        // only the rows should get deleted
        realm = new Realm({schema: schema, schemaVersion: 1, migration: function(oldRealm, newRealm) {
            newRealm.deleteModel('TestObject');
        }});

        TestCase.assertEqual(realm.schema.length, 1); // model should remain
        TestCase.assertEqual(realm.objects('TestObject').length, 0); // objects should be gone

        realm.close();

        realm = new Realm({schema: schema, schemaVersion: 2});
        TestCase.assertEqual(realm.objects('TestObject').length, 0);

        realm.close();
    },

    testDeleteModelIgnoreNotExisting: function() {
        const schema = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }];

        var realm = new Realm({schema: schema});

        realm.write(function() {
            realm.create('TestObject', ['stringValue', 1]);
        });

        realm.close();

        // non-existing models should be ignore on delete
        realm = new Realm({schema: schema, schemaVersion: 1, migration: function(oldRealm, newRealm) {
            newRealm.deleteModel('NonExistingModel');
        }});

        realm.close();

        realm = new Realm({schema: schema, schemaVersion: 2});
        TestCase.assertEqual(realm.objects('TestObject').length, 1);

        realm.close();
    },

    testDeleteModelWithRelationship: function() {
        const ShipSchema = {
            name: 'Ship',
            properties: {
                ship_name: 'string',
                captain: 'Captain'
            }
        };

        const CaptainSchema = {
            name: 'Captain',
            properties: {
                captain_name: 'string',
                ships: { type: 'linkingObjects', objectType: 'Ship', property: 'captain' }
            }
        };

        var realm = new Realm({schema: [ShipSchema, CaptainSchema]});

        realm.write(function() {
            realm.create('Ship', {
                ship_name: 'My Ship',
                captain: {
                    captain_name: 'John Doe'
                }
            });
        });

        TestCase.assertEqual(realm.objects('Captain').length, 1);
        TestCase.assertEqual(realm.objects('Ship').length, 1);
        TestCase.assertEqual(realm.objects('Ship')[0].captain.captain_name, "John Doe");
        TestCase.assertEqual(realm.objects('Captain')[0].ships[0].ship_name, "My Ship");

        realm.close();

        realm = new Realm({schema: [ShipSchema, CaptainSchema], schemaVersion: 1, migration: function(oldRealm, newRealm) {
            TestCase.assertThrows(function(e) {
                // deleting a model which is target of linkingObjects results in an exception
                newRealm.deleteModel('Captain');
                console.log(e);
            }, "Table is target of cross-table link columns");
        }});

        TestCase.assertEqual(realm.objects('Captain').length, 1);
        TestCase.assertEqual(realm.objects('Ship').length, 1);

        realm.close();

        realm = new Realm({schema: [ShipSchema, CaptainSchema], schemaVersion: 2, migration: function(oldRealm, newRealm) {
            // deleting a model which isn't target of linkingObjects works fine
            newRealm.deleteModel('Ship');
        }});

        TestCase.assertEqual(realm.objects('Captain').length, 1);
        TestCase.assertEqual(realm.objects('Ship').length, 0);
        TestCase.assertEqual(realm.objects('Captain')[0].ships.length, 0);

        realm.close();
    },
};
