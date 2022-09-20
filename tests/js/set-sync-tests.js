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

const AppConfig = require("./support/testConfig");

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
  return require_method(module);
}

const { Realm } = require("realm");
const TestCase = require("./asserts");

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const isElectronProcess = typeof process === "object" && process.versions && process.versions.electron;
const fs = isNodeProcess ? nodeRequire("fs-extra") : require("react-native-fs");

module.exports = {
  async testSetSyncedNonRequired() {
    // test that we can create a synced realm with a Set
    // that isn't required
    if (!global.enableSyncTests) return;

    const schema = {
      name: "SyncedNumbers",
      primaryKey: "_id",
      properties: {
        _id: "int",
        numbers: "int<>",
      },
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
      schema: [schema],
    };

    const realm = await Realm.open(config);
    realm.write(() => {
      realm.deleteAll();
    });

    let objects = realm.objects(schema.name);
    TestCase.assertEqual(objects.length, 0, "Table should be empty");
  },

  //
  // test that deletions and additions to a Set are propagated correctly through Sync
  async testSetSyncedAddDelete() {
    // tests a synced realm while adding/deleting elements in a Set
    if (!global.enableSyncTests) return;

    const schema = {
      name: "SyncedNumbers",
      primaryKey: "_id",
      properties: {
        _id: "int",
        numbers: "int<>",
      },
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
      schema: [schema],
    };
    const realm = await Realm.open(config);

    realm.write(() => {
      realm.deleteAll();
    });

    // TODO:  fix Error: mySetfrew.mandatory must be of type 'number', got 'number' (2)
    realm.write(() => {
      realm.create(schema.name, {
        _id: 77,
        numbers: [2],
      });
    });

    await realm.syncSession.uploadAllLocalChanges();

    let objects = realm.objects(schema.name);
    TestCase.assertEqual(objects.length, 1, "There should be 1 object");

    // add an element to the Set
    realm.write(() => {
      objects[0].numbers.add(5);
    });
    await realm.syncSession.uploadAllLocalChanges();

    // there should still only be one object
    TestCase.assertEqual(objects.length, 1, "Number of objects should be 1");
    // .. but the object's Set should have two elements
    TestCase.assertEqual(objects[0].numbers.size, 2, "Size of `numbers` should be 2");

    // add an element to the Set, then delete another one
    realm.write(() => {
      objects[0].numbers.add(6).delete(2);
    });
    await realm.syncSession.uploadAllLocalChanges();

    objects = realm.objects(schema.name);
    // there should still only be one object
    TestCase.assertEqual(objects.length, 1, "Number of objects should be 1");
    // .. but the object's Set should have two elements
    TestCase.assertEqual(objects[0].numbers.size, 2, "Size of `numbers` should be 2");

    realm.write(() => {
      objects[0].numbers.clear();
    });
    await realm.syncSession.uploadAllLocalChanges();
    objects = realm.objects(schema.name);
    // there should still only be one object
    TestCase.assertEqual(objects.length, 1, "Number of objects should still be 1");
    // .. but the object's Set should have two elements
    TestCase.assertEqual(objects[0].numbers.size, 0, "Size of `numbers` should be 0");

    realm.close();
  },

  async testSetSyncedDownstream() {
    if (!global.enableSyncTests) return;

    const schema = {
      name: "SyncedNumbers",
      primaryKey: "_id",
      properties: {
        _id: "int",
        numbers: "int<>",
      },
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
      schema: [schema],
    };
    const realm = await Realm.open(config);

    // clear out any lingering documents
    realm.write(() => {
      realm.deleteAll();
    });

    const integerArray = [1, 2, 3, 4, 5, 6, 7];
    realm.write(() => {
      realm.create(schema.name, {
        _id: 0,
        numbers: integerArray,
      });
    });
    // make sure everything is synced upstream
    await realm.syncSession.uploadAllLocalChanges();

    // make sure everything is in the database
    let integers = realm.objects(schema.name)[0];
    TestCase.assertEqual(integers.numbers.size, 7, "There should be 7 integers");

    // make sure we don't have a local copy of the realm
    realm.close();
    Realm.deleteFile(config);

    // create a new local realm and sync from server
    const syncedRealm = await Realm.open(config);
    await syncedRealm.syncSession.downloadAllServerChanges();

    // check that our set of integers is the same as before
    let syncedIntegers = syncedRealm.objects(schema.name)[0].numbers;
    TestCase.assertEqual(syncedIntegers.size, 7, "There still should be 7 integers");

    const intsValues = Array.from(syncedIntegers.values());
    let locatedElements = 0;
    // make sure that every element pulled from the database is also
    // in the original array (this only works because all values in integerArray
    // are unique)
    intsValues.forEach((dbValue) => {
      if (integerArray.find((arrrayValue) => arrrayValue == dbValue)) {
        locatedElements++;
      }
    });
    TestCase.assertEqual(
      locatedElements,
      integerArray.length,
      "Downloaded integers should be the same as uploaded integers",
    );

    // clean up the objects we created
    syncedRealm.write(() => {
      syncedRealm.deleteAll();
    });
    await syncedRealm.syncSession.uploadAllLocalChanges();
    realm.close();
  },
}; // module.exports
