////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
const AppConfig = require("./support/testConfig");

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
    return require_method(module);
}

const Realm = require('realm');
const TestCase = require('./asserts');

let pathSeparator = '/';
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isElectronProcess = typeof process === 'object' && process.versions && process.versions.electron;

if (isNodeProcess && process.platform === 'win32') {
    pathSeparator = '\\';
}

const fs = isNodeProcess ? nodeRequire('fs-extra') : require('react-native-fs');

module.exports = {
    async testSetSyncedNonRequired() {
        // test that we can create a synced realm with a Set
        // that isn't required
        if (!global.enableSyncTests) return;

        const schema = {
            name: "SyncedSetInt",
            primaryKey: "_id",
            properties: {
                _id: "int",
                intSet: "int<>",
            }
        }

        const appConfig = AppConfig.integrationAppConfig;
        const app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();

        const user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "_id",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [schema]
        };
        const realm = await Realm.open(config);


        realm.write(() => {
            realm.deleteAll();
        });

        let objects = realm.objects(schema.name);
        let objcount = objects.length;

        TestCase.assertEqual(objcount, 0, "Table should be empty");
    },


    //
    // test that deletions and additions to a Set are propagated correctly through Sync
    async testSetSyncedAddDelete() {
        // tests a synced realm while adding/deleting elements in a Set
        if (!global.enableSyncTests) return;

        const schema = {
            name: "SyncedSetInt",
            primaryKey: "_id",
            properties: {
                _id: "int",
                intSet: "int<>",
            }
        }
        
        const appConfig = AppConfig.integrationAppConfig;
        const app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();

        const user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "_id",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [schema]
        };
        const realm = await Realm.open(config);

        realm.write(() => {
            realm.deleteAll();
        });

        // TODO:  fix Error: mySetfrew.mandatory must be of type 'number', got 'number' (2)
        realm.write(() => {
            realm.create(schema.name, { 
                _id: 77,
                intSet: [2],
              });  
        });

        await realm.syncSession.uploadAllLocalChanges();

        let objects = realm.objects(schema.name);
        let objcount = objects.length;
        TestCase.assertEqual(objcount, 1, "There should be 1 object");

        // add an element to the Set
        realm.write(() => {
            let myset = objects[0].intSet.add(5);
        });
        await realm.syncSession.uploadAllLocalChanges();

        objects = realm.objects(schema.name);
        objcount = objects.length;

        // there should still only be one object
        TestCase.assertEqual(objcount, 1, "Number of objects should be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(objects[0].intSet.size, 2, "Size of intSet should be 2");

        // add an element to the Set, then delete another one
        realm.write(() => {
            let myset = objects[0].intSet.add(6).delete(2);
        });
        await realm.syncSession.uploadAllLocalChanges();

        objects = realm.objects(schema.name);
        objcount = objects.length;

        // there should still only be one object
        TestCase.assertEqual(objcount, 1, "Number of objects should be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(objects[0].intSet.size, 2, "Size of intSet should be 2");

        realm.write(() => {
            objects[0].intSet.clear();
        });
        await realm.syncSession.uploadAllLocalChanges();
        objects = realm.objects(schema.name);
        objcount = objects.length;
        // there should still only be one object
        TestCase.assertEqual(objcount, 1, "Number of objects should still be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(objects[0].intSet.size, 0, "Size of intSet should be 0");

        realm.close();
    },

    async testSetSyncedDownstream() {
        if (!global.enableSyncTests) return;

        const schema = {
            name: "SyncedSetInt",
            primaryKey: "_id",
            properties: {
                _id: "int",
                intSet: "int<>",
            }
        };

        const appConfig = AppConfig.integrationAppConfig;
        const app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        const user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "_id",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [schema]
        };
        const realm = await Realm.open(config);

        // clear out any lingering documents
        realm.write(() => {
            realm.deleteAll();
        });

        const integerSet = [1, 2, 3, 4, 5, 6, 7];
        realm.write(() => {
            realm.create(schema.name, {
                _id: 0,
                intSet: integerSet
            });
        });
        // make sure everything is synced upstream
        await realm.syncSession.uploadAllLocalChanges();

        // make sure everything is in the database
        let integers = realm.objects(schema.name)[0];
        TestCase.assertEqual(integers.intSet.size, 7, "There should be 7 integers");

        const realmPath = realm.path;

        realm.close();

        // make sure we don't have a local copy of the realm
        fs.unlinkSync(realmPath);

        const syncedRealm = await Realm.open(config)
        await syncedRealm.syncSession.downloadAllServerChanges();

        // check that our set of integers is the same as before
        let syncedIntegers = syncedRealm.objects(schema.name)[0].intSet;
        TestCase.assertEqual(syncedIntegers.size, 7, "There still should be 7 integers");

        const intsValues = Array.from(syncedIntegers.values());
        const sameInts = intsValues.map((value, index) => {
            return value == integerSet[index];
        });
        const isSameInts = sameInts.reduce((prev, curr) => {
            return prev && curr;
        });
        TestCase.assertTrue(isSameInts, "Downloaded integers should be the same as uploaded integers");

        realm.close();
    },
};  // module.exports