"use strict";
export {};

const Realm = require('../..');
const RosController = require('./support/ros-controller');
const TestObjectServer = require('./support/test-object-server');
const fs = require("fs");
const os = require('os');
const path = require("path");
const spawn = require("child_process").spawn;
const tmp = require('tmp');

const notificationNotReceivedTimeout = 20000;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
const useTestServer = false; // process.env.REALM_NODEJS_FORCE_TEST_SERVER || os.platform() != 'darwin';

const allTypesRealmSchema = [
    {
        name: 'TestObject',
        primaryKey: 'intCol',
        properties: {
            intCol: 'int',
        }
    },
    {
        name: 'AllTypesObject',
        primaryKey: 'primaryCol',
        properties: {
            primaryCol: 'string',
            boolCol: 'bool',
            intCol: 'int',
            floatCol: 'float',
            doubleCol: 'double',
            stringCol: 'string',
            dateCol: 'date',
            dataCol: 'data',
            objectCol: 'TestObject',
            arrayCol: { type: 'list', objectType: 'TestObject' },
        }
    }];

const timestampObjectSchema = {
    name: 'TimestampObject',
    primaryKey: 'intCol',
    properties: {
        intCol: 'int',
        dateCol: 'date',
    }
};

const primaryObjectsSchema = [
    {
        name: 'TestObject',
        primaryKey: 'intCol',
        properties: {
            intCol: 'int',
        }
    },
    {
        name: 'IntPrimaryObject',
        primaryKey: 'intCol',
        properties: {
            intCol: 'int',
            dataCol: { type: 'string', optional: true }
        }
    },
    {
        name: 'StringPrimaryObject',
        primaryKey: 'stringCol',
        properties: {
            stringCol: 'string',
            dataCol: { type: 'string', optional: true }
        }
    },
    {
        name: 'PrimaryLinksObject',
        primaryKey: 'primaryCol',
        properties: {
            primaryCol: 'string',
            stringPrimaryCol: 'StringPrimaryObject',
            intPrimaryCol: 'IntPrimaryObject',
            testObjectCol: 'TestObject',
            stringPrimaryList: { type: 'list', objectType: 'StringPrimaryObject' },
            intPrimaryList: { type: 'list', objectType: 'IntPrimaryObject' },
            testObjectList: { type: 'list', objectType: 'TestObject' },
        }
    }];

const schemaWithoutPrimaryKeys = [
    {
        name: 'TestObject',
        properties: {
            intCol: 'int',
            doubleCol: 'double',
            stringCol: 'string',
        },
    },
    {
        name: 'LinkObject',
        properties: {
            link: 'TestObject',
            list: 'TestObject[]',
        },
    }
];

var RANDOM_DATA = new Uint8Array([
    0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9,
    0x67, 0x1e, 0x40, 0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
]);

var nextChangePromise = undefined;
var nextAvailablePromise = undefined;
var adapter;
var rosController;

let tmpDir;

const realmNamePrefix = path.basename(tmp.dirSync().name);
let currentTestName: string;
jasmine.getEnv().addReporter({
    specStarted: (result) => {
        currentTestName = result.fullName.replace(/ /g, '_').replace('Adapter', realmNamePrefix);
    }
});

describe('Adapter', () => {
    beforeEach(async () => {
        Realm.clearTestState();
        tmpDir = tmp.dirSync({unsafeCleanup: true});

        if (useTestServer) {
            rosController = new TestObjectServer();
        } else {
            rosController = new RosController();
        }

        rosController.setRealmPathPrefix(currentTestName);
        return rosController.start();
    });

    afterEach(async () => {
        if (adapter) {
            adapter.close();
        }
        await rosController.shutdown();
        tmpDir.removeCallback();
    });

    it("predicate functions", async () => {
        // set up the predicate so that it only permits realms whose path ends in 'predicateFilteredRealm'
        let numberOfRealmsSeenByPredicate = 0;
        function predicate(realmPath: string) {
            if (realmPath.indexOf(currentTestName) != -1) {
                numberOfRealmsSeenByPredicate++;
                return realmPath.endsWith('predicateFilteredRealm');
            }
            return false;
        }

        // create a realm that should pass through the predicate
        (await rosController.createRealm("predicateFilteredRealm", allTypesRealmSchema)).close();

        // create a realm that shouldn't pass through the predicate
        (await rosController.createRealm("ignoredRealm", allTypesRealmSchema)).close();

        // create another realm that will pass the predicate but after a delay so that the ignored realm would have fired the change callback
        // if predicate filtering didn't work
        setTimeout(async () => {
            (await rosController.createRealm("another_predicateFilteredRealm", allTypesRealmSchema)).close();
        }, 500);

        const realmsSeenInChangeCallback: string[] = [];
        await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => reject('Notification not recieved'), notificationNotReceivedTimeout);
    
            function callback(realmPath: string) {
                realmsSeenInChangeCallback.push(realmPath);
                if (realmsSeenInChangeCallback.length == 2) {
                    clearTimeout(timeout);
                    resolve();
                }
            }
    
            adapter = new Realm.Sync.Adapter(tmpDir.name, `realm://localhost:${rosController.httpPort}`,
                rosController.adminUser, predicate, callback);
        });

        expect(realmsSeenInChangeCallback).toEqual([
            `/${currentTestName}/predicateFilteredRealm`,
            `/${currentTestName}/another_predicateFilteredRealm`
        ]);
        expect(numberOfRealmsSeenByPredicate).toEqual(3);
    });

    function createAdapter(ros) {
        adapter = new Realm.Sync.Adapter(tmpDir.name, `realm://localhost:${rosController.httpPort}`,
            ros.adminUser, `.*${currentTestName}.*`, (path: String) => {
                var promise = nextChangePromise;
                nextChangePromise = undefined;

                if (promise == undefined) {
                    fail(new Error('unexpected notification ' + path));
                    throw new Error('unexpected notification ' + path);
                }

                try {
                    promise.test(path);
                    // Resolve the promise asynchronously as doing so synchronously somehow results in one or
                    // more Realm instances being alive when `clearTestState` is called.
                    setTimeout(() => promise.resolve(path), 0);
                }
                catch (error) {
                    promise.reject(error);
                }
            });
        return adapter;
    }

    // Execute `action`, then wait for the adatper's callback to fire.
    // `test` is called with the path provided by the adapter.
    // Resolves to the path the adapter provides to the callback.
    function realmStatusPromise(ros, action, test): Promise<String> {
        return new Promise((resolve, reject) => {
            var timeout = setTimeout(() => reject('Notification not recieved'), notificationNotReceivedTimeout);
            nextChangePromise = {
                test: test,
                resolve: (val) => { clearTimeout(timeout); resolve(val); },
                reject: (err) => { clearTimeout(timeout); resolve(err); }
            }
            action();
        });
    }

    // Execute `action`, then wait for the adatper's callback to fire.
    // The path provided by the adapter callback is checked against `expectedPath`.
    // Resolves to the path the adapter provides to the callback.
    function notificationPromise(ros, expectedPath, action): Promise<String> {
        return realmStatusPromise(ros, action, (path) => {
            expect(path).toEqual(`/${currentTestName}/${expectedPath}`);
        });
    }

    // FIXME: This name doesn't seem to describe what the function does / returns.
    async function advancePromise(ros, expectedPath, objects, adapter, realm, action) {
        let path = await notificationPromise(ros, expectedPath, action);
        applyInstructions(objects, adapter.current(path), realm.schema);
        compareObjects(objects, realm);
        adapter.advance(path);
    }

    function applyInstructions(objects, instructions, schema) {
        // console.log(instructions);
        // console.log("");
        for (var inst of instructions) {
            // for clear wipe our map of objects
            if (inst.type == 'CLEAR') {
                objects[inst.object_type] = {}
                continue;
            }
            // otherwise create it if it doesnt exist
            if (!objects[inst.object_type]) objects[inst.object_type] = {};


            var object_schema = schema.find((val) => val.name == inst.object_type);
            if (inst.type == 'INSERT') {
                var object = {};

                // initialize array properties
                for (var prop_name in object_schema.properties)
                    if (object_schema.properties[prop_name].type == "list")
                        object[prop_name] = [];

                objects[inst.object_type][inst.identity] = object;
            }

            // fetch object - should exist
            var object = objects[inst.object_type][inst.identity] as {};
            expect(object).toBeDefined();

            if (inst.type == 'DELETE') delete objects[inst.object_type][inst.identity];
            else if (inst.type == 'SET' || inst.type == 'INSERT') {
                for (var prop_name in inst.values) {
                    var property = object_schema.properties[prop_name];
                    if (property.type == "object")
                        object[prop_name] = inst.values[prop_name] == null ? null :
                            objects[property.objectType][inst.values[prop_name]];
                    else object[prop_name] = inst.values[prop_name];
                }
            }
            else if (inst.type == 'LIST_INSERT') {
                var property = object_schema.properties[inst.property];
                if (!object[inst.property]) object[inst.property] = [];
                object[inst.property].splice(inst.list_index, 0, objects[property.objectType][inst.object_identity]);
            }
            else if (inst.type == 'LIST_SET') {
                var property = object_schema.properties[inst.property];
                if (!object[inst.property]) object[inst.property] = [];
                object[inst.property][inst.list_index] = objects[property.objectType][inst.object_identity];
            }
            else if (inst.type == 'LIST_ERASE') {
                object[inst.property].splice(inst.list_index, 1);
            }
            else if (inst.type == 'LIST_CLEAR') {
                object[inst.property] = [];
            }
            else {
                fail('Invalid instruction type ' + inst.type);
            }
        }
        return objects;
    }

    function compareObjects(objects, realm) {
        for (var object_type in objects) {
            // console.log(objects[object_type]);
            // console.log(realm.objects(object_type));

            var object_schema = realm.schema.find((val) => val.name == object_type);
            for (var identity in objects[object_type]) {
                var change_object = objects[object_type][identity];
                expect(change_object).toBeDefined();

                var actual_object;
                if (object_schema.primaryKey) {
                    actual_object = realm.objectForPrimaryKey(object_type, change_object[object_schema.primaryKey]);
                }
                else {
                    actual_object = realm.objectForObjectId(object_type, identity);
                }

                expect(actual_object).toBeDefined();

                expect(Object.keys(change_object).sort()).toEqual(Object.keys(actual_object).sort());
                for (var key in change_object) {
                    var val = change_object[key];
                    var actual_val = actual_object[key];
                    if (object_schema.properties[key].type == 'object') {
                        if (val)
                            expect(actual_val).toEqual(jasmine.objectContaining(val));
                        else
                            expect(actual_val).toBeNull();
                    }
                    else if (object_schema.properties[key].type == 'list') {
                        expect(actual_val.length).toBe(val.length);
                        for (var i = 0; i < val.length; i++) {
                            expect(actual_val[i]).toEqual(jasmine.objectContaining(val[i]));
                        }
                    }
                    else {
                        expect(actual_val).toEqual(val);
                    }
                }
            }
        }
    }

    it("test new realm", async () => {
        try {
            createAdapter(rosController);

            let realm;
            let path = await notificationPromise(rosController, 'test1', () => {
                realm = rosController.createRealm('test1', allTypesRealmSchema);
            });
            realm = await realm;

            expect(adapter.current(path).length).toBeGreaterThan(0);
            expect(adapter.current(path).length).toBeGreaterThan(0);
            expect(adapter.advance(path)).toBeUndefined();
            expect(adapter.current(path)).toBeUndefined();
            expect(adapter.advance(path)).toBeUndefined();
            expect(adapter.current(path)).toBeUndefined();

            path = await notificationPromise(rosController, 'test1', () => {
                realm.write(() => realm.create('TestObject', [1]));
                realm.close();
            });
            expect(adapter.current(path).length).toBeGreaterThan(0);
            expect(adapter.advance(path)).toBeUndefined();
            expect(adapter.current(path)).toBeUndefined();

        } catch (error) {
            fail(error);
        }
    });

    it("test existing realm", async () => {
        try {
            let realm = await rosController.createRealm('test1', allTypesRealmSchema);
            await notificationPromise(rosController, 'test1', () => {
                createAdapter(rosController);
            });
            let path = await notificationPromise(rosController, 'test1', () => {
                realm.write(() => realm.create('TestObject', [0]))
                realm.close();
            });

            expect(adapter.current(path).length).toBeGreaterThan(0);
            expect(adapter.advance(path)).toBeUndefined();
            expect(adapter.current(path).length).toBeGreaterThan(0);
            expect(adapter.advance(path)).toBeUndefined();
            expect(adapter.current(path)).toBeUndefined();
        } catch (error) {
            fail(error);
        }
    });

    it("test schema", async () => {
        (await rosController.createRealm('test1', allTypesRealmSchema)).close();
        const path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController)
        });

        const instructions = adapter.current(path);
        const schema = {};
        for (var inst of instructions) {
            if (inst.type == 'ADD_TYPE') {
                schema[inst.object_type] = { name: inst.object_type, properties: {} };
                if (inst.primary_key) {
                    schema[inst.object_type]['primaryKey'] = inst.primary_key;
                }
            }

            if (inst.type == 'ADD_TYPE' || inst.type == 'ADD_PROPERTIES') {
                const object_schema = schema[inst.object_type];
                expect(object_schema).toBeDefined();
                for (const prop_name in inst.properties) {
                    const prop = inst.properties[prop_name];
                    switch (prop.type) {
                        case 'list':
                            object_schema.properties[prop_name] = {
                                type: 'list',
                                objectType: prop.object_type
                            };
                            break;
                        case 'object':
                            object_schema.properties[prop_name] = prop.object_type;
                            break;
                        default:
                            object_schema.properties[prop_name] = prop.type;
                            break;
                    }
                }
            }
            else {
                throw new Error('Invalid type ' + inst.type);
            }
        }

        for (const object_schema of allTypesRealmSchema) {
            expect(schema[object_schema.name]).toEqual(jasmine.objectContaining(object_schema as any));
        }
    });

    it("test all data types", async () => {
        let realm = await rosController.createRealm('test1', allTypesRealmSchema);
        await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController)
        });
        var path = await notificationPromise(rosController, 'test1', () => {
            realm.write(() => realm.create('TestObject', [2]));
        });

        adapter.advance(path);
        var instructions = adapter.current(path);
        expect(instructions.length).toBe(1);
        expect(instructions[0].type).toBe('INSERT');
        expect(instructions[0].object_type).toBe('TestObject');
        expect(instructions[0].values).toEqual({ intCol: 2 });
        expect(adapter.advance(path)).toBeUndefined();
        expect(adapter.current(path)).toBeUndefined();

        path = await notificationPromise(rosController, 'test1', () => {
            realm.write(() => realm.create('AllTypesObject',
                ['1.11', true, 0x7FFFFFFFFFFFFFFF, 11111.11111, 11.11, '2', new Date(2),
                    RANDOM_DATA, [3.33], [[4.44]]]))
        });

        applyInstructions({}, adapter.current(path), realm.schema);
        compareObjects({}, realm);
        realm.close();
    });

    it("test date type", async () => {
        let testDates = ['1969-07-20 20:18:04+00', '2017-12-12 15:00:37.447+00', '2017-12-07 20:16:03.837+00']

        let realm = await rosController.createRealm('test1', [timestampObjectSchema])
        await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController)
        })
        var path = await notificationPromise(rosController, 'test1', () => {
            realm.write(() => {
                for (let i = 0; i < testDates.length; i++) {
                    realm.create('TimestampObject', { intCol: i, dateCol: new Date(testDates[i]) })
                }
            })
            realm.close();
        })

        adapter.advance(path)
        var instructions = adapter.current(path)
        expect(instructions.length).toBe(testDates.length)
        for (let i = 0; i < testDates.length; i++) {
            expect(instructions[i].object_type).toBe('TimestampObject')
            expect(instructions[i].type).toBe('INSERT')
            expect(instructions[i].values.intCol).toBe(i)
            expect(instructions[i].values.dateCol.toISOString()).toBe(new Date(testDates[i]).toISOString())
        }
    })

    it("test link instructions", async () => {
        var objects = {};
        let realm = await rosController.createRealm('test1', primaryObjectsSchema);
        let path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });

        adapter.advance(path);

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => realm.create('PrimaryLinksObject', ['1', null, null, null, [], [], []]));
        });
        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                var object = realm.objects('PrimaryLinksObject')[0];
                object.stringPrimaryCol = ['1', 'data1'];
                object.intPrimaryCol = [1, 'data1'];
                object.testObjectCol = [1.1];
                object.stringPrimaryList = [object.stringPrimaryCol, ['2', 'data2']];
                object.intPrimaryList = [object.intPrimaryCol, [2, 'data2']];
                object.testObjectList = [object.testObjectCol, [2.2]];
            });
        });
        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                var object = realm.objects('PrimaryLinksObject')[0];
                object.stringPrimaryCol = null;
                object.intPrimaryCol = null;
                object.testObjectCol = null;
                object.stringPrimaryList.splice(0, 1, ['3', 'data3'], ['4', null]);
                object.intPrimaryList.splice(0, 1, [3, 'data3'], [4, null]);
                object.testObjectList.splice(0, 1, [3.3], [4.4]);
            });
        });
        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                var object = realm.objects('PrimaryLinksObject')[0];
                object.stringPrimaryList[1] = ['5', 'data5'];
                object.intPrimaryList[1] = [5, 'data5'];
                object.testObjectList[1] = [5.5];
            });
        });
        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                var object = realm.objects('PrimaryLinksObject')[0];
                object.stringPrimaryList = [];
                object.intPrimaryList = [];
                object.testObjectList = [];
            });
        });
        realm.close();
    });

    it("test deletion", async () => {
        var objects = {};
        let realm = await rosController.createRealm('test1', primaryObjectsSchema);
        let path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });

        adapter.advance(path);

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => realm.create('PrimaryLinksObject',
                ['0', ['0', 'data0'], [0, 'data0'], [0.1],
                    [['1', 'data1'], ['2', 'data2']],
                    [[1, 'data1'], [2, 'data2']],
                    [[1.1], [2.2]]]))
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // delete all existing objects, backlinks should get nullified
                var object = realm.objects('PrimaryLinksObject')[0];
                realm.delete(object.testObjectCol);
                realm.delete(object.testObjectList[0]);
                realm.delete(object.stringPrimaryCol);
                realm.delete(object.stringPrimaryList[0]);
                realm.delete(object.intPrimaryCol);
                realm.delete(object.intPrimaryList[0]);
            });
        });
        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // insert multiple links to a single object to test backlinks
                // backlinks for newly created objects should get nullified
                var object = realm.objects('PrimaryLinksObject')[0];
                var testObject = realm.create('TestObject', [5]);
                object.testObjectList.push(testObject);
                object.testObjectList.splice(0, 0, testObject);
                object.testObjectCol = testObject;

                var intPrimaryObject = realm.create('IntPrimaryObject', [5, 'data5']);
                object.intPrimaryList.push(intPrimaryObject);
                object.intPrimaryList.splice(0, 0, intPrimaryObject);
                object.intPrimaryCol = intPrimaryObject;

                var stringPrimaryObject = realm.create('StringPrimaryObject', ['5', 'data5']);
                object.stringPrimaryList.push(stringPrimaryObject);
                object.stringPrimaryList.splice(0, 0, stringPrimaryObject);
                object.stringPrimaryCol = stringPrimaryObject;

                realm.delete(object.testObjectList[0]);
                realm.delete(object.stringPrimaryList[0]);
                realm.delete(object.intPrimaryList[0]);
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // insert multiple links to a single object to test backlinks
                // delete in next transaction
                var object = realm.objects('PrimaryLinksObject')[0];
                var testObject = realm.create('TestObject', [5]);
                object.testObjectList.push(testObject);
                object.testObjectList.splice(0, 0, testObject);
                object.testObjectCol = testObject;

                var intPrimaryObject = realm.create('IntPrimaryObject', [5, 'data5']);
                object.intPrimaryList.push(intPrimaryObject);
                object.intPrimaryList.splice(0, 0, intPrimaryObject);
                object.intPrimaryCol = intPrimaryObject;

                var stringPrimaryObject = realm.create('StringPrimaryObject', ['5', 'data5']);
                object.stringPrimaryList.push(stringPrimaryObject);
                object.stringPrimaryList.splice(0, 0, stringPrimaryObject);
                object.stringPrimaryCol = stringPrimaryObject;

                realm.delete(object.testObjectList[0]);
                realm.delete(object.stringPrimaryList[0]);
                realm.delete(object.intPrimaryList[0]);
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // delete old objects, backlinks should update
                realm.delete(realm.objects('TestObject'));
                realm.delete(realm.objects('IntPrimaryObject'));
                realm.delete(realm.objects('StringPrimaryObject'));
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // setup 2 of each object type to test move_last_over in
                // the next test
                realm.create('TestObject', [0]);
                realm.create('IntPrimaryObject', [0, 'delete']);
                realm.create('StringPrimaryObject', ['0', 'delete']);

                realm.create('TestObject', [1]);
                realm.create('IntPrimaryObject', [1, 'delete']);
                realm.create('StringPrimaryObject', ['1', 'delete']);

                realm.create('TestObject', [2]);
                realm.create('IntPrimaryObject', [2, 'move 2']);
                realm.create('StringPrimaryObject', ['2', 'move 2']);

                realm.create('TestObject', [3]);
                realm.create('IntPrimaryObject', [3, 'move 3']);
                realm.create('StringPrimaryObject', ['3', 'move 3']);

                realm.create('TestObject', [4]);
                realm.create('IntPrimaryObject', [4, 'move then delete 4']);
                realm.create('StringPrimaryObject', ['4', 'move then delete 4']);
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // test move_last_over of existing objects
                var testObjects = realm.objects('TestObject');
                expect(testObjects.length).toBe(5);
                realm.delete(testObjects[0]);
                realm.delete(testObjects[3]);

                var intObjects = realm.objects('IntPrimaryObject');
                expect(intObjects.length).toBe(5);
                realm.delete(intObjects[0]);
                realm.delete(intObjects[3]);

                var stringObjects = realm.objects('StringPrimaryObject');
                expect(stringObjects.length).toBe(5);
                realm.delete(stringObjects[0]);
                realm.delete(stringObjects[3]);

                // change property vaulue for one of the moved objects
                intObjects[1].dataCol = 'changed to -1';
                stringObjects[1].dataCol = 'changed to -1';

                // double delete and change the second object to test
                // primary key row mapping accross two move-last-overs
                realm.delete(testObjects[0]);
                realm.delete(intObjects[0]);
                realm.delete(stringObjects[0]);

                intObjects[0].dataCol = 'changed to -2';
                stringObjects[0].dataCol = 'changed to -2';
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // test move_last_over replacing existing objects with new object
                realm.create('TestObject', [4]);
                realm.create('TestObject', [5]);
                var testObjects = realm.objects('TestObject');
                expect(testObjects.length).toBe(4);
                realm.delete(testObjects[0]);
                realm.delete(testObjects[1]);

                realm.create('IntPrimaryObject', [4, 'move 4']);
                realm.create('IntPrimaryObject', [5, 'move 5']);
                var intObjects = realm.objects('IntPrimaryObject');
                expect(intObjects.length).toBe(4);
                realm.delete(intObjects[0]);
                realm.delete(intObjects[1]);

                realm.create('StringPrimaryObject', ['4', 'move 4']);
                realm.create('StringPrimaryObject', ['5', 'move 5']);
                var stringObjects = realm.objects('StringPrimaryObject');
                expect(stringObjects.length).toBe(4);
                realm.delete(stringObjects[0]);
                realm.delete(stringObjects[1]);

                // change property vaulue for one set of moved objects
                intObjects[0].dataCol = 'changed to -2';
                stringObjects[0].dataCol = 'changed to -2';
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                // test move_last_over replacing new objects with new object
                realm.create('TestObject', [6]);
                realm.create('TestObject', [7]);
                realm.create('TestObject', [8]);
                realm.create('TestObject', [9]);
                var testObjects = realm.objects('TestObject');
                expect(testObjects.length).toBe(6);
                realm.delete(testObjects[2]);
                realm.delete(testObjects[2]);

                realm.create('IntPrimaryObject', [6, 'delete 6']);
                realm.create('IntPrimaryObject', [7, 'delete 7']);
                realm.create('IntPrimaryObject', [8, 'move 8']);
                realm.create('IntPrimaryObject', [9, 'move 9']);
                var intObjects = realm.objects('IntPrimaryObject');
                expect(intObjects.length).toBe(6);
                realm.delete(intObjects[2]);
                realm.delete(intObjects[3]);

                realm.create('StringPrimaryObject', ['6', 'delete 6']);
                realm.create('StringPrimaryObject', ['7', 'delete 7']);
                realm.create('StringPrimaryObject', ['8', 'move 8']);
                realm.create('StringPrimaryObject', ['9', 'move 9']);
                var stringObjects = realm.objects('StringPrimaryObject');
                expect(stringObjects.length).toBe(6);
                realm.delete(stringObjects[2]);
                realm.delete(stringObjects[3]);

                // change property vaulue for moved objects
                intObjects[2].dataCol = 'changed to 10';
                stringObjects[2].dataCol = 'changed to 10';
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                var stringPrimaryCount = realm.objects('StringPrimaryObject').length;
                var intPrimaryCount = realm.objects('IntPrimaryObject').length;

                // row mapping not needed for non primary key objects so this just tests
                // deetion/move_last_over
                var obj1 = realm.create('TestObject', [6.6]);
                var obj2 = realm.create('TestObject', [7.7]);
                realm.delete(obj1);

                // delete object and set an object property
                // on the moved object to test row mapping
                // for a new object
                obj1 = realm.create('PrimaryLinksObject', ['2', null, null, null, [], [], []]);
                obj2 = realm.create('PrimaryLinksObject', ['3', null, null, null, [], [], []]);
                realm.delete(obj1);
                obj2.intPrimaryCol = [6, 'data6'];
                obj2.stringPrimaryCol = ['6', 'data6'];

                expect(realm.objects('StringPrimaryObject').length).toBeGreaterThan(2);
                expect(realm.objects('StringPrimaryObject').length).toBe(stringPrimaryCount + 1);
                expect(realm.objects('IntPrimaryObject').length).toBeGreaterThan(2);
                expect(realm.objects('IntPrimaryObject').length).toBe(intPrimaryCount + 1);

                realm.delete(realm.objects('StringPrimaryObject')[0]);
                realm.objects('StringPrimaryObject')[0].dataCol = 'changed_data';

                realm.delete(realm.objects('IntPrimaryObject')[0]);
                realm.objects('IntPrimaryObject')[0].dataCol = 'changed_data';

                // delete a primary key objet so another object created before
                // this transaction is moved so that row mapping is used for
                // primary key retrieval
                realm.delete(realm.objects('StringPrimaryObject')[0]);
                realm.objects('StringPrimaryObject')[0].dataCol = 'changed_data';

                realm.delete(realm.objects('IntPrimaryObject')[0]);
                realm.objects('IntPrimaryObject')[0].dataCol = 'changed_data';
            });
        });
        realm.close();
    });

    it("test schema without primary keys", async () => {
        var objects = {};
        let realm = await rosController.createRealm('test1', schemaWithoutPrimaryKeys);
        let path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });

        adapter.advance(path);

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => realm.create('TestObject', [1, 3.3, "Object 1"]));
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => realm.delete(realm.objects('TestObject')[0]));
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => {
                let object = realm.create('LinkObject', { link: [2, 6.6, 'Object 2'], list: [[3, 10.0, 'Object 3']] })
                object.list.push(object.link);
            });
        });

        await advancePromise(rosController, 'test1', objects, adapter, realm, () => {
            realm.write(() => realm.delete(realm.objects('TestObject').filtered('intCol == 2')[0]));
        });
        realm.close();
    });

    it("should collapse changes made to a single object", async () => {
        const realm = await rosController.createRealm('test1', [timestampObjectSchema]);
        const path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });
        adapter.advance(path); // skip schema init

        const object1 = {
            intCol: 1,
            dateCol: new Date()
        };
        const object2 = {
            intCol: 2,
            dateCol: new Date()
        };

        await notificationPromise(rosController, 'test1', () => {
            realm.write(() => {
                realm.create('TimestampObject', object1);
                realm.create('TimestampObject', object2);
            });
        });
        realm.close();

        const expected = [
            {
                type: 'INSERT',
                object_type: 'TimestampObject',
                identity: 1,
                values: object1,
            },
            {
                type: 'INSERT',
                object_type: 'TimestampObject',
                identity: 2,
                values: object2,
            },
        ];
        expect(adapter.current(path)).toEqual(expected);
    });

    it("should not collapse changes made to different objects", async () => {
        const realm = await rosController.createRealm('test1', schemaWithoutPrimaryKeys);
        const path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });
        adapter.advance(path); // skip schema init

        await notificationPromise(rosController, 'test1', () => {
            realm.write(() => {
                realm.create('TestObject', [1, 2, "3"]);
                realm.create('TestObject', [4, 5, "6"]);
            });
        });
        adapter.advance(path); // skip first write

        await notificationPromise(rosController, 'test1', () => {
            realm.write(() => {
                const objects = realm.objects('TestObject');
                objects[0].intCol = 7;
                objects[1].intCol = 8;
                objects[0].doubleCol = 9;
                objects[1].doubleCol = 10;
            });
        });
        realm.close();

        const expected = [
            {
                type: 'SET',
                object_type: 'TestObject',
                identity: '{0002-0000}',
                values: {intCol: 7},
            },
            {
                type: 'SET',
                object_type: 'TestObject',
                identity: '{0002-0001}',
                values: {intCol: 8},
            },
            {
                type: 'SET',
                object_type: 'TestObject',
                identity: '{0002-0000}',
                values: {doubleCol: 9},
            },
            {
                type: 'SET',
                object_type: 'TestObject',
                identity: '{0002-0001}',
                values: {doubleCol: 10},
            },
        ];
        expect(adapter.current(path)).toEqual(expected);
    });

    it("should collapse schema changes into the table creation", async () => {
        const schema = [
            {name: 'Object1', properties: {prop1: 'int', prop2: 'int'}},
        ];
        const realm = await rosController.createRealm('test1', schema);
        await realm.syncSession.uploadAllLocalChanges();
        realm.close();

        const path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });

        const expected = [{
            type: 'ADD_TYPE',
            object_type: 'Object1',
            properties: {
                prop1: {nullable: false, type: 'int'},
                prop2: {nullable: false, type: 'int'}
            },
        }];
        expect(adapter.current(path)).toEqual(expected);
    });

    it("should collapse column additions to existing tables", async () => {
        const schema = [
            {name: 'Object1', properties: {prop1: 'int'}},
            {name: 'Object2', properties: {prop2: 'int'}},
        ];
        (await rosController.createRealm('test1', schema)).close();

        const path = await notificationPromise(rosController, 'test1', () => {
            createAdapter(rosController);
        });
        adapter.advance(path);

        const nextChangePromise = notificationPromise(rosController, 'test1', () => {});
        const newSchema = [
            {name: 'Object1', properties: {prop3: 'string?', prop4: 'Object2?'}},
            {name: 'Object2', properties: {prop5: 'bool', prop6: 'double'}},
        ];
        const realm = await rosController.createRealm('test1', newSchema);
        await realm.syncSession.uploadAllLocalChanges();
        realm.close();
        await nextChangePromise;
        const expected = [
            {
                type: 'ADD_PROPERTIES',
                object_type: 'Object1',
                properties: {
                    prop3: {nullable: true, type: 'string'},
                    prop4: {object_type: 'Object2', type: 'object'}
                },
            },
            {
                type: 'ADD_PROPERTIES',
                object_type: 'Object2',
                properties: {
                    prop5: {nullable: false, type: 'bool'},
                    prop6: {nullable: false, type: 'double'}
                },
            }
        ];
        expect(adapter.current(path)).toEqual(expected);
    });

    xit("should not collapse schema changes between object mutations", async () => {
        // This seems to currently not be possible to cause directly with realm-js
    });
});
