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
const TestCase = require('./asserts');
const schemas = require('./schemas');

let pathSeparator = '/';
if (typeof process === 'object' && process.platform === 'win32') {
    pathSeparator = '\\';
}

module.exports = {
    testRealmConstructor: function() {
        const realm = new Realm({schema: []});
        TestCase.assertTrue(realm instanceof Realm);

        TestCase.assertEqual(typeof Realm, 'function');
        TestCase.assertTrue(Realm instanceof Function);
    },

    testRealmConstructorPath: function() {
        TestCase.assertThrows(() => new Realm('')); // the message for this error is platform-specific
        TestCase.assertThrowsContaining(() => new Realm('test1.realm', 'invalidArgument'),
                                        "Invalid arguments when constructing 'Realm'");

        const defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

        const defaultRealm2 = new Realm();
        TestCase.assertEqual(defaultRealm2.path, Realm.defaultPath);

        const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
        const testPath = 'test1.realm';
        const realm = new Realm({schema: [], path: testPath});
        TestCase.assertEqual(realm.path, defaultDir + testPath);

        const testPath2 = 'test2.realm';
        const realm2 = new Realm({schema: [], path: testPath2});
        TestCase.assertEqual(realm2.path, defaultDir + testPath2);
    },

    testRealmIsClosed: function() {
        const realm = new Realm({schema: []});
        TestCase.assertFalse(realm.isClosed);
        realm.close();
        TestCase.assertTrue(realm.isClosed);
    },

    testRealmConstructorSchemaVersion: function() {
        const defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.schemaVersion, 0);

        TestCase.assertThrowsContaining(() => new Realm({schemaVersion: 1, schema: []}),
                                        "already opened with different schema version.");

        TestCase.assertEqual(new Realm().schemaVersion, 0);
        TestCase.assertEqual(new Realm({schemaVersion: 0}).schemaVersion, 0);

        let realm = new Realm({path: 'test1.realm', schema: [], schemaVersion: 1});
        TestCase.assertEqual(realm.schemaVersion, 1);
        TestCase.assertEqual(realm.schema.length, 0);
        realm.close();

        realm = new Realm({path: 'test1.realm', schema: [schemas.TestObject], schemaVersion: 2});
        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
        });
        TestCase.assertEqual(realm.objects('TestObject')[0].doubleCol, 1);
        TestCase.assertEqual(realm.schemaVersion, 2);
        TestCase.assertEqual(realm.schema.length, 1);
    },

    testRealmConstructorDynamicSchema: function() {
        let realm = new Realm({schema: [schemas.TestObject]});
        realm.write(() => {
            realm.create('TestObject', [1])
        });
        realm.close();

        realm = new Realm();
        const objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 1);
        TestCase.assertEqual(objects[0].doubleCol, 1.0);
    },

    testRealmConstructorSchemaValidation: function() {
        TestCase.assertThrowsContaining(() => new Realm({schema: schemas.AllTypes}),
                                        "schema must be of type 'array', got");
        TestCase.assertThrowsContaining(() => new Realm({schema: ['SomeType']}),
                                        "Failed to read ObjectSchema: JS value must be of type 'object', got (SomeType)");
        TestCase.assertThrowsContaining(() => new Realm({schema: [{}]}),
                                        "Failed to read ObjectSchema: name must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => new Realm({schema: [{name: 'SomeObject'}]}),
                                        "Failed to read ObjectSchema: properties must be of type 'object', got (undefined)");
        TestCase.assertThrowsContaining(() => new Realm({schema: [{properties: {intCol: 'int'}}]}),
                                        "Failed to read ObjectSchema: name must be of type 'string', got (undefined)");

        function assertPropertyInvalid(prop, message) {
            TestCase.assertThrowsContaining(() => {
                new Realm({schema: [{name: 'InvalidObject', properties: { int: 'int', bad: prop }}]});
            }, message, 1);
        }

        assertPropertyInvalid({type:'list[]', objectType: 'InvalidObject'},
                              "List property 'InvalidObject.bad' must have a non-list value type");
        assertPropertyInvalid({type:'list?', objectType: 'InvalidObject'},
                              "List property 'InvalidObject.bad' cannot be optional");
        assertPropertyInvalid('', "Property 'InvalidObject.bad' must have a non-empty type");
        assertPropertyInvalid({type:'linkingObjects', objectType: 'InvalidObject', property: 'nosuchproperty'},
                              "Property 'InvalidObject.nosuchproperty' declared as origin of linking objects property 'InvalidObject.bad' does not exist");
        assertPropertyInvalid({type:'linkingObjects', objectType: 'InvalidObject', property: 'int'},
                              "Property 'InvalidObject.int' declared as origin of linking objects property 'InvalidObject.bad' is not a link");

        // linkingObjects property where the source property links elsewhere
        TestCase.assertThrowsContaining(() => {
            new Realm({schema: [{
                name: 'InvalidObject',
                properties: {
                    link: 'IntObject',
                    linkingObjects: {type:'linkingObjects', objectType: 'InvalidObject', property: 'link'}
                }
            }, {
                name: 'IntObject',
                properties: {
                    integer: 'int'
                }
            }]});
        }, "Property 'InvalidObject.link' declared as origin of linking objects property 'InvalidObject.linkingObjects' links to type 'IntObject'")

        {
            new Realm({schema: [{
                name: 'Object',
                properties: {
                    // weird but valid
                    objectList: {type:'object[]', objectType: 'Object'}
                }
            }]});
        }
    },

    testRealmConstructorInMemory: function() {
        // open in-memory realm instance
        const realm1 = new Realm({inMemory: true, schema: [schemas.TestObject]});
        realm1.write(() => {
            realm1.create('TestObject', [1])
        });
        TestCase.assertEqual(realm1.inMemory, true);

        // open a second instance of the same realm and check that they share data
        const realm2 = new Realm({inMemory: true});
        const objects = realm2.objects('TestObject');
        TestCase.assertEqual(objects.length, 1);
        TestCase.assertEqual(objects[0].doubleCol, 1.0);
        TestCase.assertEqual(realm2.inMemory, true);

        // Close both realms (this should delete the realm since there are no more
        // references to it.
        realm1.close();
        realm2.close();

        // Open the same in-memory realm again and verify that it is now empty
        const realm3 = new Realm({inMemory: true});
        TestCase.assertEqual(realm3.schema.length, 0);

        // try to open the same realm in persistent mode (should fail as you cannot mix modes)
        TestCase.assertThrowsContaining(() => new Realm({}), 'already opened with different inMemory settings.');
    },

    testRealmConstructorReadOnly: function() {
        let realm = new Realm({schema: [schemas.TestObject]});
        realm.write(() => {
            realm.create('TestObject', [1])
        });
        TestCase.assertEqual(realm.readOnly, false);
        realm.close();

        realm = new Realm({readOnly: true, schema: [schemas.TestObject]});
        const objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 1);
        TestCase.assertEqual(objects[0].doubleCol, 1.0);
        TestCase.assertEqual(realm.readOnly, true);

        TestCase.assertThrowsContaining(() => realm.write(() => {}),
                                        "Can't perform transactions on read-only Realms.");
        realm.close();

        realm = new Realm({readOnly: true});
        TestCase.assertEqual(realm.schema.length, 1);
        TestCase.assertEqual(realm.readOnly, true);
    },

    testRealmOpen: function() {
        let realm = new Realm({schema: [schemas.TestObject], schemaVersion: 1});
        realm.write(() => {
            realm.create('TestObject', [1])
        });
        realm.close();

        return Realm.open({schema: [schemas.TestObject], schemaVersion: 2}).then(realm => {
            const objects = realm.objects('TestObject');
            TestCase.assertEqual(objects.length, 1);
            TestCase.assertEqual(objects[0].doubleCol, 1.0);
            realm.close();
        });
    },

    testDefaultPath: function() {
        const defaultPath = Realm.defaultPath;
        let defaultRealm = new Realm({schema: []});
        TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

        try {
            const newPath = `${Realm.defaultPath.substring(0, defaultPath.lastIndexOf(pathSeparator) + 1)}default2.realm`;
            Realm.defaultPath = newPath;
            defaultRealm = new Realm({schema: []});
            TestCase.assertEqual(defaultRealm.path, newPath, "should use updated default realm path");
            TestCase.assertEqual(Realm.defaultPath, newPath, "defaultPath should have been updated");
        } finally {
            Realm.defaultPath = defaultPath;
        }
    },

    testRealmSchemaVersion: function() {
        TestCase.assertEqual(Realm.schemaVersion(Realm.defaultPath), -1);

        let realm = new Realm({schema: []});
        TestCase.assertEqual(realm.schemaVersion, 0);
        TestCase.assertEqual(Realm.schemaVersion(Realm.defaultPath), 0);

        realm = new Realm({schema: [], schemaVersion: 2, path: 'another.realm'});
        TestCase.assertEqual(realm.schemaVersion, 2);
        TestCase.assertEqual(Realm.schemaVersion('another.realm'), 2);
    },

    testRealmWrite: function() {
        const realm = new Realm({schema: [schemas.IntPrimary, schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes]});

        // exceptions should be propogated
        TestCase.assertThrowsContaining(() => realm.write(() => { throw new Error('Inner exception message'); }),
                                        'Inner exception message');

        // writes should be possible after caught exception
        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
        });
        TestCase.assertEqual(1, realm.objects('TestObject').length);

        realm.write(() => {
            // nested transactions not supported
            TestCase.assertThrowsContaining(() => realm.write(() => {}),
                                            'The Realm is already in a write transaction');
        });
    },

    testRealmCreate: function() {
        const realm = new Realm({schema: [schemas.TestObject]});

        TestCase.assertThrowsContaining(() => realm.create('TestObject', {doubleCol: 1}),
                                        "Cannot modify managed objects outside of a write transaction.");

        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
            realm.create('TestObject', {doubleCol: 2});
        });

        const objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 2, 'wrong object count');
        TestCase.assertEqual(objects[0].doubleCol, 1, 'wrong object property value');
        TestCase.assertEqual(objects[1].doubleCol, 2, 'wrong object property value');
    },

    testRealmCreatePrimaryKey: function() {
        const realm = new Realm({schema: [schemas.IntPrimary]});

        realm.write(() => {
            const obj0 = realm.create('IntPrimaryObject', {
                primaryCol: 0,
                valueCol: 'val0',
            });

            TestCase.assertThrowsContaining(() => {
                realm.create('IntPrimaryObject', {
                    primaryCol: 0,
                    valueCol: 'val0',
                });
            }, "Attempting to create an object of type 'IntPrimaryObject' with an existing primary key value '0'.");

            realm.create('IntPrimaryObject', {
                primaryCol: 1,
                valueCol: 'val1',
            }, true);

            const objects = realm.objects('IntPrimaryObject');
            TestCase.assertEqual(objects.length, 2);

            realm.create('IntPrimaryObject', {
                primaryCol: 0,
                valueCol: 'newVal0',
            }, true);

            TestCase.assertEqual(obj0.valueCol, 'newVal0');
            TestCase.assertEqual(objects.length, 2);

            realm.create('IntPrimaryObject', {primaryCol: 0}, true);
            TestCase.assertEqual(obj0.valueCol, 'newVal0');
        });
    },

    testRealmCreateUpsert: function() {
        const realm = new Realm({schema: [schemas.AllPrimaryTypes, schemas.TestObject,
                                          schemas.StringPrimary]});
        realm.write(function() {
            const values = {
                primaryCol: '0',
                boolCol:    true,
                intCol:     1,
                floatCol:   1.1,
                doubleCol:  1.11,
                stringCol:  '1',
                dateCol:    new Date(1),
                dataCol:    new ArrayBuffer(1),
                objectCol:  {doubleCol: 1},
                arrayCol:   [],
            };

            const obj0 = realm.create('AllPrimaryTypesObject', values);

            TestCase.assertThrowsContaining(() => realm.create('AllPrimaryTypesObject', values),
                                            "Attempting to create an object of type 'AllPrimaryTypesObject' with an existing primary key value ''0''.");

            const obj1 = realm.create('AllPrimaryTypesObject', {
                primaryCol: '1',
                boolCol:    false,
                intCol:     2,
                floatCol:   2.2,
                doubleCol:  2.22,
                stringCol:  '2',
                dateCol:    new Date(2),
                dataCol:    new ArrayBuffer(2),
                objectCol:  {doubleCol: 0},
                arrayCol:   [{doubleCol: 2}],
            }, true);

            const objects = realm.objects('AllPrimaryTypesObject');
            TestCase.assertEqual(objects.length, 2);

            realm.create('AllPrimaryTypesObject', {
                primaryCol: '0',
                boolCol:    false,
                intCol:     2,
                floatCol:   2.2,
                doubleCol:  2.22,
                stringCol:  '2',
                dateCol:    new Date(2),
                dataCol:    new ArrayBuffer(2),
                objectCol:  null,
                arrayCol:   [{doubleCol: 2}],
            }, true);

            TestCase.assertEqual(objects.length, 2);
            TestCase.assertEqual(obj0.stringCol, '2');
            TestCase.assertEqual(obj0.boolCol, false);
            TestCase.assertEqual(obj0.intCol, 2);
            TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
            TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
            TestCase.assertEqual(obj0.dateCol.getTime(), 2);
            TestCase.assertEqual(obj0.dataCol.byteLength, 2);
            TestCase.assertEqual(obj0.objectCol, null);
            TestCase.assertEqual(obj0.arrayCol.length, 1);

            realm.create('AllPrimaryTypesObject', {primaryCol: '0'}, true);
            realm.create('AllPrimaryTypesObject', {primaryCol: '1'}, true);
            TestCase.assertEqual(obj0.stringCol, '2');
            TestCase.assertEqual(obj0.objectCol, null);
            TestCase.assertEqual(obj1.objectCol.doubleCol, 0);

            realm.create('AllPrimaryTypesObject', {
                primaryCol: '0',
                stringCol:  '3',
                objectCol:  {doubleCol: 0},
            }, true);

            TestCase.assertEqual(obj0.stringCol, '3');
            TestCase.assertEqual(obj0.boolCol, false);
            TestCase.assertEqual(obj0.intCol, 2);
            TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
            TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
            TestCase.assertEqual(obj0.dateCol.getTime(), 2);
            TestCase.assertEqual(obj0.dataCol.byteLength, 2);
            TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
            TestCase.assertEqual(obj0.arrayCol.length, 1);

            realm.create('AllPrimaryTypesObject', {primaryCol: '0', objectCol: undefined}, true);
            realm.create('AllPrimaryTypesObject', {primaryCol: '1', objectCol: null}, true);
            TestCase.assertEqual(obj0.objectCol, null);
            TestCase.assertEqual(obj1.objectCol, null);

            // test with string primaries
            const obj = realm.create('StringPrimaryObject', {
                primaryCol: '0',
                valueCol: 0
            });
            TestCase.assertEqual(obj.valueCol, 0);

            realm.create('StringPrimaryObject', {
                primaryCol: '0',
                valueCol: 1
            }, true);
            TestCase.assertEqual(obj.valueCol, 1);
        });
    },

    testRealmWithIndexedProperties: function() {
        const realm = new Realm({schema: [schemas.IndexedTypes]});
        realm.write(() => {
            realm.create('IndexedTypesObject', {boolCol: true, intCol: 1, stringCol: '1', dateCol: new Date(1)});
        });

        const NotIndexed = {
            name: 'NotIndexedObject',
            properties: {
                floatCol: {type: 'float', indexed: false}
            }
        };

        new Realm({schema: [NotIndexed], path: '1.realm'});

        const IndexedSchema = {
            name: 'IndexedSchema',
        };
        TestCase.assertThrowsContaining(() => {
            IndexedSchema.properties = { floatCol: {type: 'float', indexed: true} };
            new Realm({schema: [IndexedSchema], path: '2.realm'});
        }, "Property 'IndexedSchema.floatCol' of type 'float' cannot be indexed.");

        TestCase.assertThrowsContaining(() => {
            IndexedSchema.properties = { doubleCol: {type: 'double', indexed: true} }
            new Realm({schema: [IndexedSchema], path: '3.realm'});
        }, "Property 'IndexedSchema.doubleCol' of type 'double' cannot be indexed.");

        TestCase.assertThrowsContaining(() => {
            IndexedSchema.properties = { dataCol: {type: 'data', indexed: true} }
            new Realm({schema: [IndexedSchema], path: '4.realm'});
        }, "Property 'IndexedSchema.dataCol' of type 'data' cannot be indexed.");

        // primary key
        IndexedSchema.properties = { intCol: {type: 'int', indexed: true} };
        IndexedSchema.primaryKey = 'intCol';

        // Test this doesn't throw
        new Realm({schema: [IndexedSchema], path: '5.realm'});
    },

    testRealmCreateWithDefaults: function() {
        let realm = new Realm({schema: [schemas.DefaultValues, schemas.TestObject]});

        const createAndTestObject = () => {
            const obj = realm.create('DefaultValuesObject', {});
            const properties = schemas.DefaultValues.properties;

            TestCase.assertEqual(obj.boolCol, properties.boolCol.default);
            TestCase.assertEqual(obj.intCol, properties.intCol.default);
            TestCase.assertEqualWithTolerance(obj.floatCol, properties.floatCol.default, 0.000001);
            TestCase.assertEqualWithTolerance(obj.doubleCol, properties.doubleCol.default, 0.000001);
            TestCase.assertEqual(obj.stringCol, properties.stringCol.default);
            TestCase.assertEqual(obj.dateCol.getTime(), properties.dateCol.default.getTime());
            TestCase.assertEqual(obj.dataCol.byteLength, properties.dataCol.default.byteLength);
            TestCase.assertEqual(obj.objectCol.doubleCol, properties.objectCol.default.doubleCol);
            TestCase.assertEqual(obj.nullObjectCol, null);
            TestCase.assertEqual(obj.arrayCol.length, properties.arrayCol.default.length);
            TestCase.assertEqual(obj.arrayCol[0].doubleCol, properties.arrayCol.default[0].doubleCol);
        };

        realm.write(createAndTestObject);

        // Defaults should still work when creating another Realm instance.
        realm = new Realm();
        realm.write(createAndTestObject);
    },

    testRealmCreateWithChangingDefaults: function() {
        const objectSchema = {
            name: 'IntObject',
            properties: {
                intCol: {type: 'int', default: 1},
            }
        };

        let realm = new Realm({schema: [objectSchema]});

        const createAndTestObject = () => {
            const object = realm.create('IntObject', {});
            TestCase.assertEqual(object.intCol, objectSchema.properties.intCol.default);
        };

        realm.write(createAndTestObject);

        objectSchema.properties.intCol.default++;

        realm = new Realm({schema: [objectSchema]});
        realm.write(createAndTestObject);
    },

    testRealmCreateWithConstructor: function() {
        let customCreated = 0;

        function CustomObject() {
            customCreated++;
        }
        CustomObject.schema = {
            name: 'CustomObject',
            properties: {
                intCol: 'int'
            }
        }

        function InvalidObject() {
            return {};
        }
        TestCase.assertThrowsContaining(() => new Realm({schema: [InvalidObject]}),
                                        "Realm object constructor must have a 'schema' property.");

        InvalidObject.schema = {
            name: 'InvalidObject',
            properties: {
                intCol: 'int'
            }
        };

        let realm = new Realm({schema: [CustomObject, InvalidObject]});

        realm.write(() => {
            let object = realm.create('CustomObject', {intCol: 1});
            TestCase.assertTrue(object instanceof CustomObject);
            TestCase.assertTrue(Object.getPrototypeOf(object) == CustomObject.prototype);
            TestCase.assertEqual(customCreated, 1);

            // Should be able to create object by passing in constructor.
            object = realm.create(CustomObject, {intCol: 2});
            TestCase.assertTrue(object instanceof CustomObject);
            TestCase.assertTrue(Object.getPrototypeOf(object) == CustomObject.prototype);
            TestCase.assertEqual(customCreated, 2);
        });

        TestCase.assertThrowsContaining(() => {
            realm.write(() => {
                realm.create('InvalidObject', {intCol: 1});
            });
        }, 'Realm object constructor must not return another value');

        // Only the original constructor should be valid.
        function InvalidCustomObject() {}
        InvalidCustomObject.schema = CustomObject.schema;

        TestCase.assertThrowsContaining(() => {
            realm.write(() => {
                realm.create(InvalidCustomObject, {intCol: 1});
            });
        }, 'Constructor was not registered in the schema for this Realm');

        // The constructor should still work when creating another Realm instance.
        realm = new Realm();
        TestCase.assertTrue(realm.objects('CustomObject')[0] instanceof CustomObject);
        TestCase.assertTrue(realm.objects(CustomObject).length > 0);
    },

    testRealmCreateWithChangingConstructor: function() {
        function CustomObject() {}
        CustomObject.schema = {
            name: 'CustomObject',
            properties: {
                intCol: 'int'
            }
        };

        let realm = new Realm({schema: [CustomObject]});
        realm.write(() => {
            const object = realm.create('CustomObject', {intCol: 1});
            TestCase.assertTrue(object instanceof CustomObject);
        });

        function NewCustomObject() {}
        NewCustomObject.schema = CustomObject.schema;

        realm = new Realm({schema: [NewCustomObject]});
        realm.write(() => {
            const object = realm.create('CustomObject', {intCol: 1});
            TestCase.assertTrue(object instanceof NewCustomObject);
        });
    },

    testRealmDelete: function() {
        const realm = new Realm({schema: [schemas.TestObject]});

        realm.write(() => {
            for (let i = 0; i < 10; i++) {
                realm.create('TestObject', {doubleCol: i});
            }
        });

        const objects = realm.objects('TestObject');
        TestCase.assertThrowsContaining(() => realm.delete(objects[0]),
                                        "Can only delete objects within a transaction.");

        realm.write(() => {
            TestCase.assertThrowsContaining(() => realm.delete(),
                                            "object must be of type 'object', got (undefined)");

            realm.delete(objects[0]);
            TestCase.assertEqual(objects.length, 9, 'wrong object count');
            TestCase.assertEqual(objects[0].doubleCol, 9, "wrong property value");
            TestCase.assertEqual(objects[1].doubleCol, 1, "wrong property value");

            realm.delete([objects[0], objects[1]]);
            TestCase.assertEqual(objects.length, 7, 'wrong object count');
            TestCase.assertEqual(objects[0].doubleCol, 7, "wrong property value");
            TestCase.assertEqual(objects[1].doubleCol, 8, "wrong property value");

            const threeObjects = realm.objects('TestObject').filtered("doubleCol < 5");
            TestCase.assertEqual(threeObjects.length, 3, "wrong results count");
            realm.delete(threeObjects);
            TestCase.assertEqual(objects.length, 4, 'wrong object count');
            TestCase.assertEqual(threeObjects.length, 0, 'threeObject should have been deleted');

            const o = objects[0];
            realm.delete(o);
            TestCase.assertThrowsContaining(() => realm.delete(o),
                                            'Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.');
        });
    },

    testDeleteAll: function() {
        const realm = new Realm({schema: [schemas.TestObject, schemas.IntPrimary]});

        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
            realm.create('TestObject', {doubleCol: 2});
            realm.create('IntPrimaryObject', {primaryCol: 2, valueCol: 'value'});
        });

        TestCase.assertEqual(realm.objects('TestObject').length, 2);
        TestCase.assertEqual(realm.objects('IntPrimaryObject').length, 1);

        TestCase.assertThrowsContaining(() => realm.deleteAll(),
                                        "Can only delete objects within a transaction.");

        realm.write(() => {
            realm.deleteAll();
        });

        TestCase.assertEqual(realm.objects('TestObject').length, 0);
        TestCase.assertEqual(realm.objects('IntPrimaryObject').length, 0);
    },

    testRealmObjects: function() {
        const realm = new Realm({schema: [schemas.PersonObject, schemas.DefaultValues, schemas.TestObject]});

        realm.write(() => {
            realm.create('PersonObject', {name: 'Ari', age: 10});
            realm.create('PersonObject', {name: 'Tim', age: 11});
            realm.create('PersonObject', {name: 'Bjarne', age: 12});
            realm.create('PersonObject', {name: 'Alex', age: 12, married: true});
        });

        // Should be able to pass constructor for getting objects.
        const objects = realm.objects(schemas.PersonObject);
        TestCase.assertTrue(objects[0] instanceof schemas.PersonObject);

        function InvalidPerson() {}
        InvalidPerson.schema = schemas.PersonObject.schema;

        TestCase.assertThrowsContaining(() => realm.objects(), "objectType must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => realm.objects([]), "objectType must be of type 'string', got ()");
        TestCase.assertThrowsContaining(() => realm.objects('InvalidClass'), "Object type 'InvalidClass' not found in schema.");
        TestCase.assertThrowsContaining(() => realm.objects('PersonObject', 'truepredicate'),
                                        "Invalid arguments: at most 1 expected, but 2 supplied.");
        TestCase.assertThrowsContaining(() => realm.objects(InvalidPerson),
                                        'Constructor was not registered in the schema for this Realm');

        const person = realm.objects('PersonObject')[0];
        const listenerCallback = () => {};
        realm.addListener('change', listenerCallback);

        // The tests below assert that everthing throws when
        // operating on a closed realm
        realm.close();

        TestCase.assertThrowsContaining(() => console.log("Name: ", person.name),
                                        'Accessing object of type PersonObject which has been invalidated or deleted');

        TestCase.assertThrowsContaining(() => realm.objects('PersonObject'), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.addListener('change', () => {}), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.create('PersonObject', {name: 'Ari', age: 10}), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.delete(person), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.deleteAll(), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.write(() => {}), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.removeListener('change', listenerCallback), 'Cannot access realm that has been closed');
        TestCase.assertThrowsContaining(() => realm.removeAllListeners(), 'Cannot access realm that has been closed');
    },

    testRealmObjectForPrimaryKey: function() {
        const realm = new Realm({schema: [schemas.IntPrimary, schemas.StringPrimary, schemas.TestObject]});

        realm.write(() => {
            realm.create('IntPrimaryObject', {primaryCol: 0, valueCol: 'val0'});
            realm.create('IntPrimaryObject', {primaryCol: 1, valueCol: 'val1'});

            realm.create('StringPrimaryObject', {primaryCol: '', valueCol: -1});
            realm.create('StringPrimaryObject', {primaryCol: 'val0', valueCol: 0});
            realm.create('StringPrimaryObject', {primaryCol: 'val1', valueCol: 1});

            realm.create('TestObject', {doubleCol: 0});
        });

        TestCase.assertEqual(realm.objectForPrimaryKey('IntPrimaryObject', -1), undefined);
        TestCase.assertEqual(realm.objectForPrimaryKey('IntPrimaryObject', 0).valueCol, 'val0');
        TestCase.assertEqual(realm.objectForPrimaryKey('IntPrimaryObject', 1).valueCol, 'val1');

        TestCase.assertEqual(realm.objectForPrimaryKey('StringPrimaryObject', 'invalid'), undefined);
        TestCase.assertEqual(realm.objectForPrimaryKey('StringPrimaryObject', '').valueCol, -1);
        TestCase.assertEqual(realm.objectForPrimaryKey('StringPrimaryObject', 'val0').valueCol, 0);
        TestCase.assertEqual(realm.objectForPrimaryKey('StringPrimaryObject', 'val1').valueCol, 1);

        TestCase.assertThrowsContaining(() => realm.objectForPrimaryKey('TestObject', 0),
                                        "'TestObject' does not have a primary key defined");
        TestCase.assertThrowsContaining(() => realm.objectForPrimaryKey(),
                                        "objectType must be of type 'string', got (undefined)");
        TestCase.assertThrowsContaining(() => realm.objectForPrimaryKey('IntPrimaryObject'),
                                        "Invalid null value for non-nullable primary key.");
        TestCase.assertThrowsContaining(() => realm.objectForPrimaryKey('InvalidClass', 0),
                                        "Object type 'InvalidClass' not found in schema.");
    },

    testNotifications: function() {
        const realm = new Realm({schema: []});
        let notificationCount = 0;
        let notificationName;

        realm.addListener('change', (realm, name) => {
            notificationCount++;
            notificationName = name;
        });

        TestCase.assertEqual(notificationCount, 0);
        realm.write(() => {});
        TestCase.assertEqual(notificationCount, 1);
        TestCase.assertEqual(notificationName, 'change');

        let secondNotificationCount = 0;
        function secondNotification() {
            secondNotificationCount++;
        }

        // The listener should only be added once.
        realm.addListener('change', secondNotification);
        realm.addListener('change', secondNotification);

        realm.write(() => {});
        TestCase.assertEqual(notificationCount, 2);
        TestCase.assertEqual(secondNotificationCount, 1);

        realm.removeListener('change', secondNotification);
        realm.write(() => {});
        TestCase.assertEqual(notificationCount, 3);
        TestCase.assertEqual(secondNotificationCount, 1);

        realm.removeAllListeners();
        realm.write(() => {});
        TestCase.assertEqual(notificationCount, 3);
        TestCase.assertEqual(secondNotificationCount, 1);

        TestCase.assertThrowsContaining(() => realm.addListener('invalid', () => {}),
                                        "Only the 'change' notification name is supported.");

        realm.addListener('change', () => {
            throw new Error('expected error message');
        });

        TestCase.assertThrowsContaining(() => realm.write(() => {}),
                                        'expected error message');
    },

    testSchema: function() {
        const originalSchema = [schemas.TestObject, schemas.AllTypes, schemas.LinkToAllTypes,
                                schemas.IndexedTypes, schemas.IntPrimary, schemas.PersonObject,
                                schemas.LinkTypes, schemas.LinkingObjectsObject];

        const schemaMap = {};
        originalSchema.forEach(objectSchema => {
            if (objectSchema.schema) { // for PersonObject
                schemaMap[objectSchema.schema.name] = objectSchema;
            } else {
                schemaMap[objectSchema.name] = objectSchema;
            }
        });

        const realm = new Realm({schema: originalSchema});

        const schema = realm.schema;
        TestCase.assertEqual(schema.length, originalSchema.length);

        const normalizeProperty = (val) => {
            let prop;
            if (typeof val !== 'string' && !(val instanceof String)) {
                prop = val;
                prop.optional = val.optional || false;
                prop.indexed = val.indexed || false;
            }
            else {
                prop = {type: val, indexed: false, optional: false};
            }
            if (prop.type.includes('?')) {
                prop.optional = true;
                prop.type = prop.type.replace('?', '');
            }
            if (prop.type.includes('[]')) {
                prop.objectType = prop.type.replace('[]', '');
                prop.type = 'list';
            }
            return prop;
        };

        for (const objectSchema of schema) {
            let original = schemaMap[objectSchema.name];
            if (original.schema) {
                original = original.schema;
            }

            TestCase.assertEqual(objectSchema.primaryKey, original.primaryKey);
            for (const propName in objectSchema.properties) {
                TestCase.assertDefined(original.properties[propName], `schema has unexpected property ${propName}`);

                const actual = objectSchema.properties[propName];
                const expected = normalizeProperty(original.properties[propName]);
                TestCase.assertEqual(actual.name, propName);
                TestCase.assertEqual(actual.indexed, expected.indexed);

                if (actual.type == 'object') {
                    TestCase.assertEqual(actual.objectType, expected.type === 'object' ? expected.objectType : expected.type);
                    TestCase.assertEqual(actual.optional, true);
                    TestCase.assertUndefined(actual.property);
                }
                else if (actual.type == 'list') {
                    TestCase.assertEqual(actual.type, expected.type);
                    TestCase.assertEqual(actual.objectType, expected.objectType);
                    TestCase.assertEqual(actual.optional, expected.optional);
                    TestCase.assertUndefined(actual.property);
                }
                else if (actual.type == 'linkingObjects') {
                    TestCase.assertEqual(actual.type, expected.type);
                    TestCase.assertEqual(actual.objectType, expected.objectType);
                    TestCase.assertEqual(actual.property, expected.property);
                    TestCase.assertEqual(actual.optional, false);
                }
                else {
                    TestCase.assertEqual(actual.type, expected.type);
                    TestCase.assertEqual(actual.optional, expected.optional);
                    TestCase.assertUndefined(actual.property);
                    TestCase.assertUndefined(actual.objectType);
                }
            }
        }
    },

    testCopyBundledRealmFiles: function() {
        Realm.copyBundledRealmFiles();

        let realm = new Realm({path: 'dates-v5.realm', schema: [schemas.DateObject]});
        TestCase.assertEqual(realm.objects('Date').length, 2);
        TestCase.assertEqual(realm.objects('Date')[0].currentDate.getTime(), 1462500087955);

        const newDate = new Date(1);
        realm.write(() => {
            realm.objects('Date')[0].currentDate = newDate;
        });
        realm.close();

        // copy should not overwrite existing files
        Realm.copyBundledRealmFiles();
        realm = new Realm({path: 'dates-v5.realm', schema: [schemas.DateObject]});
        TestCase.assertEqual(realm.objects('Date')[0].currentDate.getTime(), 1);
    },

    testErrorMessageFromInvalidWrite: function() {
        const realm = new Realm({schema: [schemas.PersonObject]});

        TestCase.assertThrowsException(() => {
            realm.write(() => {
                const p1 = realm.create('PersonObject', { name: 'Ari', age: 10 });
                p1.age = "Ten";
            });
        }, new Error("PersonObject.age must be of type 'number', got 'string' ('Ten')"));
    },

    testErrorMessageFromInvalidCreate: function() {
        const realm = new Realm({schema: [schemas.PersonObject]});

        TestCase.assertThrowsException(() => {
            realm.write(() => {
                const p1 = realm.create('PersonObject', { name: 'Ari', age: 'Ten' });
            });
        }, new Error("PersonObject.age must be of type 'number', got 'string' ('Ten')"));
    },

    testValidTypesForListProperties: function() {
        const realm = new Realm({schema: [schemas.PersonObject]});
        realm.write(() => {
            const p1 = realm.create('PersonObject', { name: 'Ari', age: 10 });
            const p2 = realm.create('PersonObject', { name: 'Harold', age: 55, children: realm.objects('PersonObject').filtered('age < 15') });
            TestCase.assertEqual(p2.children.length, 1);
            const p3 = realm.create('PersonObject', { name: 'Wendy', age: 52, children: p2.children });
            TestCase.assertEqual(p3.children.length, 1);
        });
    },

    testEmpty: function() {
        const realm = new Realm({schema: [schemas.PersonObject]});
        TestCase.assertTrue(realm.empty);

        realm.write(() => realm.create('PersonObject', { name: 'Ari', age: 10 }));
        TestCase.assertTrue(!realm.empty);

        realm.write(() => realm.delete(realm.objects('PersonObject')));
        TestCase.assertTrue(realm.empty);
    },

    testManualTransaction: function() {
        const realm = new Realm({schema: [schemas.TestObject]});
        TestCase.assertTrue(realm.empty);

        realm.beginTransaction();
        realm.create('TestObject', {doubleCol: 3.1415});
        realm.commitTransaction();

        TestCase.assertEqual(realm.objects('TestObject').length, 1);
    },

    testCancelTransaction: function() {
        const realm = new Realm({schema: [schemas.TestObject]});
        TestCase.assertTrue(realm.empty);

        realm.beginTransaction();
        realm.create('TestObject', {doubleCol: 3.1415});
        realm.cancelTransaction();

        TestCase.assertTrue(realm.empty);
    },

    testIsInTransaction: function() {
        const realm = new Realm({schema: [schemas.TestObject]});
        TestCase.assertTrue(!realm.isInTransaction);
        realm.beginTransaction();
        TestCase.assertTrue(realm.isInTransaction);
        realm.cancelTransaction();
        TestCase.assertTrue(!realm.isInTransaction);
    },

    testCompact: function() {
        let wasCalled = false;
        const count = 1000;
        // create compactable Realm
        const realm1 = new Realm({schema: [schemas.StringOnly]});
        realm1.write(() => {
            realm1.create('StringOnlyObject', { stringCol: 'A' });
            for (let i = 0; i < count; i++) {
                realm1.create('StringOnlyObject', { stringCol: 'ABCDEFG' });
            }
            realm1.create('StringOnlyObject', { stringCol: 'B' });
        });
        realm1.close();

        // open Realm and see if it is compacted
        const shouldCompact = (totalBytes, usedBytes) => {
            wasCalled = true;
            const fiveHundredKB = 500*1024;
            return (totalBytes > fiveHundredKB) && (usedBytes / totalBytes) < 0.2;
        };
        const realm2 = new Realm({schema: [schemas.StringOnly], shouldCompactOnLaunch: shouldCompact});
        TestCase.assertTrue(wasCalled);
        TestCase.assertEqual(realm2.objects('StringOnlyObject').length, count + 2);
        // we don't check if the file is smaller as we assume that Object Store does it
        realm2.close();
    },

    testManualCompact: function() {
        const realm1 = new Realm({schema: [schemas.StringOnly]});
        realm1.write(() => {
            realm1.create('StringOnlyObject', { stringCol: 'A' });
        });
        TestCase.assertTrue(realm1.compact());
        realm1.close();

        const realm2 = new Realm({schema: [schemas.StringOnly]});
        TestCase.assertEqual(realm2.objects('StringOnlyObject').length, 1);
        realm2.close();
    },

    testManualCompactInWrite: function() {
        const realm = new Realm({schema: [schemas.StringOnly]});
        realm.write(() => {
            TestCase.assertThrowsContaining(() => {
                realm.compact();
            }, 'Cannot compact a Realm within a transaction.');
        });
        TestCase.assertTrue(realm.empty);
    },

    testManualCompactMultipleInstances: function() {
        const realm1 = new Realm({schema: [schemas.StringOnly]});
        const realm2 = new Realm({schema: [schemas.StringOnly]});
        TestCase.assertTrue(realm1.compact());
    },

    testRealmDeleteFileDefaultConfigPath: function() {
        const config = {schema: [schemas.TestObject]};
        const realm = new Realm(config);

        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
        });

        TestCase.assertEqual(realm.objects('TestObject').length, 1);
        realm.close();

        Realm.deleteFile(config);

        const realm2 = new Realm(config);
        TestCase.assertEqual(realm2.objects('TestObject').length, 0);
        realm.close();
    },

    testRealmDeleteFileCustomConfigPath: function() {
        const config = {schema: [schemas.TestObject], path: 'test-realm-delete-file.realm'};
        const realm = new Realm(config);

        realm.write(() => {
            realm.create('TestObject', {doubleCol: 1});
        });

        TestCase.assertEqual(realm.objects('TestObject').length, 1);
        realm.close();

        Realm.deleteFile(config);

        const realm2 = new Realm(config);
        TestCase.assertEqual(realm2.objects('TestObject').length, 0);
        realm.close();
    },

    testRealmDeleteRealmIfMigrationNeededVersionChanged: function() {
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


        realm = new Realm({schema: schema, deleteRealmIfMigrationNeeded: true, schemaVersion: 1, migration: undefined });

        // object should be gone as Realm should get deleted
        TestCase.assertEqual(realm.objects('TestObject').length, 0);

        // create a new object
        realm.write(function() {
            realm.create('TestObject', ['stringValue', 1]);
        });

        realm.close();

        var migrationWasCalled = false;
        realm = new Realm({schema: schema, deleteRealmIfMigrationNeeded: false, schemaVersion: 2, migration: function(oldRealm, newRealm) {
            migrationWasCalled = true;
        }});

        // migration function should get called as deleteRealmIfMigrationNeeded is false
        TestCase.assertEqual(migrationWasCalled, true);

        // object should be there because Realm shouldn't get deleted
        TestCase.assertEqual(realm.objects('TestObject').length, 1);
        realm.close();
    },

    testRealmDeleteRealmIfMigrationNeededSchemaChanged: function() {
        const schema = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }];

        const schema1 = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
                prop2: 'float',
            }
        }];

        const schema2 = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
                prop2: 'float',
                prop3: 'double'
            }
        }];

        var realm = new Realm({schema: schema});

        realm.write(function() {
            realm.create('TestObject', {prop0: 'stringValue', prop1: 1});
        });

        realm.close();


        // change schema
        realm = new Realm({schema: schema1, deleteRealmIfMigrationNeeded: true, migration: undefined});

        // object should be gone as Realm should get deleted
        TestCase.assertEqual(realm.objects('TestObject').length, 0);

        // create a new object
        realm.write(function() {
            realm.create('TestObject', {prop0: 'stringValue', prop1: 1, prop2: 1.0});
        });

        realm.close();


        TestCase.assertThrows(function(e) {
            // updating schema without changing schemaVersion OR setting deleteRealmIfMigrationNeeded = true should raise an error
            new Realm({schema: schema2, deleteRealmIfMigrationNeeded: false, migration: function(oldRealm, newRealm) {}});
        });

        var migrationWasCalled = false;

        // change schema again, but increment schemaVersion
        realm = new Realm({schema: schema2, deleteRealmIfMigrationNeeded: false, schemaVersion: 1, migration: function(oldRealm, newRealm) {
            migrationWasCalled = true;
        }});

        // migration function should get called as deleteRealmIfMigrationNeeded is false
        TestCase.assertEqual(migrationWasCalled, true);

        // object should be there because Realm shouldn't get deleted
        TestCase.assertEqual(realm.objects('TestObject').length, 1);
        realm.close();
    },

    testRealmDeleteRealmIfMigrationNeededIncompatibleConfig: function() {
        const schema = [{
            name: 'TestObject',
            properties: {
                prop0: 'string',
                prop1: 'int',
            }
        }];

        TestCase.assertThrows(function() {
            new Realm({schema: schema, deleteRealmIfMigrationNeeded: true, readOnly: true});
        }, "Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.")

        TestCase.assertThrows(function() {
            new Realm({schema: schema, deleteRealmIfMigrationNeeded: true, migration: function(oldRealm, newRealm) {}});
        }, "Cannot include 'migration' when 'deleteRealmIfMigrationNeeded' is set.")
    },

    testDisableFileFormatUpgrade: function() {
        Realm.copyBundledRealmFiles();

        TestCase.assertThrowsContaining(() => { 
            new Realm({ path: 'dates-v3.realm', disableFormatUpgrade: true } );
        }, 'The Realm file format must be allowed to be upgraded in order to proceed.');
    }
};
