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

    testCreateObjectsDuringMigration: function() {
        const FirstObjectType = {
            name: 'FirstObjectType',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        };

        const SecondObjectType = {
            name: 'SecondObjectType',
            properties: {
                prop0: 'string',
                prop1: 'int',
                prop2: 'int',
            }
        };


        var realm1 = new Realm({ schema: [FirstObjectType],
                                 schemaVersion: 0,
                               });
        realm1.write(function() {
            realm1.create('FirstObjectType', ['stringValue', 1]);
        });
        realm1.close();

        var realm2 = new Realm({schema: [FirstObjectType, SecondObjectType],
                                schemaVersion: 1,
                                migration: function(oldRealm, newRealm) {
                                    var oldObjects_1 = oldRealm.objects('FirstObjectType');
                                    var newObjects_1 = newRealm.objects('FirstObjectType');
                                    var newObjects_2 = newRealm.objects('SecondObjectType');

                                    TestCase.assertEqual(oldObjects_1.length, 1);
                                    TestCase.assertEqual(newObjects_1.length, 1);
                                    TestCase.assertEqual(newObjects_2.length, 0);

                                    newRealm.create('SecondObjectType', {
                                        prop0: oldObjects_1[0].prop0,
                                        prop1: oldObjects_1[0].prop1,
                                        prop2: 42,
                                    });
                                }
                               });
        var objects_1 = realm2.objects('FirstObjectType');
        var objects_2 = realm2.objects('SecondObjectType');
        TestCase.assertEqual(objects_1.length, 1);
        TestCase.assertEqual(objects_1[0].prop1, 1);
        TestCase.assertEqual(objects_2.length, 1);
        TestCase.assertEqual(objects_2[0].prop1, 1);
        TestCase.assertEqual(objects_2[0].prop2, 42);
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

    testMigrateToListOfInts: function() {
        let realm = new Realm({schema: [{name: 'TestObject', properties: {values: 'IntObject[]'}},
                                        {name: 'IntObject', properties: {value: 'int'}}]});
        realm.write(function() {
            realm.create('TestObject', {values: [{value: 1}, {value: 2}, {value: 3}]});
            realm.create('TestObject', {values: [{value: 1}, {value: 4}, {value: 5}]});
        });
        realm.close();

        realm = new Realm({
            schema: [{name: 'TestObject', properties: {values: 'int[]'}}],
            schemaVersion: 1,
            migration: function(oldRealm, newRealm) {
                const oldObjects = oldRealm.objects('TestObject');
                const newObjects = newRealm.objects('TestObject');
                TestCase.assertEqual(oldObjects.length, 2);
                TestCase.assertEqual(newObjects.length, 2);

                for (let i = 0; i < oldObjects.length; ++i) {
                    TestCase.assertEqual(oldObjects[i].values.length, 3);
                    TestCase.assertEqual(newObjects[i].values.length, 0);
                    newObjects[i].values = oldObjects[i].values.map(o => o.value);
                    TestCase.assertEqual(newObjects[i].values.length, 3);
                }
                newRealm.deleteModel('IntObject');
            }
        });

        const objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 2);
        TestCase.assertEqual(objects[0].values.length, 3);
        TestCase.assertEqual(objects[1].values.length, 3);
        TestCase.assertEqual(objects[0].values[0], 1);
        TestCase.assertEqual(objects[0].values[1], 2);
        TestCase.assertEqual(objects[0].values[2], 3);
        TestCase.assertEqual(objects[1].values[0], 1);
        TestCase.assertEqual(objects[1].values[1], 4);
        TestCase.assertEqual(objects[1].values[2], 5);
    },
};
