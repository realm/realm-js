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

const require_method = require;

const { Realm } = require("realm");
const TestCase = require("./asserts");
const AppConfig = require("./support/testConfig");
const { ObjectId, UUID } = Realm.BSON;

const PvIntDog = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "int?",
  },
};

const PvStringDog = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "string?",
  },
};

const PvUuidDog = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "uuid?",
  },
};

const PvObjectIdDog = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "objectId?",
  },
};

const createConfig = (schema, user, partitionValue) => ({
  schema: Array.isArray(schema) ? schema : [schema],
  sync: {
    user,
    partitionValue,
    _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
  },
});

module.exports = {
  async testPartitionValueAsInt() {
    const app = new Realm.App(AppConfig.pvIntAppConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());

    const realmConfigPrimary = createConfig(PvIntDog, user, 42);
    const realmConfigSecondary = createConfig(PvIntDog, user, 43);

    // ensure clean starting point
    Realm.deleteFile(realmConfigPrimary);

    const realm1 = await Realm.open(realmConfigPrimary);
    realm1.write(() => {
      realm1.create("Dog", { _id: new ObjectId(), name: "King" });
    });

    const dogsBefore = realm1.objects("Dog").length;
    await realm1.syncSession.uploadAllLocalChanges();
    realm1.close();

    // cleanup, re-sync & check changes are synced
    Realm.deleteFile(realmConfigPrimary);

    const realm2 = await Realm.open(realmConfigPrimary);
    await realm2.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm2.objects("Dog").length, dogsBefore);
    realm2.close();

    // cleanup & re-sync with different partitionValue
    Realm.deleteFile(realmConfigPrimary);

    const realm3 = await Realm.open(realmConfigSecondary);
    await realm3.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm3.objects("Dog").length, 0);
    realm3.close();

    await user.logOut();
  },

  async testPartitionValueAsString() {
    const app = new Realm.App(AppConfig.pvStringAppConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());

    const realmConfigPrimary = createConfig(PvStringDog, user, "42");
    const realmConfigSecondary = createConfig(PvStringDog, user, "43");

    // ensure clean starting point
    Realm.deleteFile(realmConfigPrimary);

    const realm1 = await Realm.open(realmConfigPrimary);
    realm1.write(() => {
      realm1.create("Dog", { _id: new ObjectId(), name: "King" });
    });

    await realm1.syncSession.uploadAllLocalChanges();
    const dogsBefore = realm1.objects("Dog").length;
    realm1.close();

    // cleanup, re-sync & check changes are synced
    Realm.deleteFile(realmConfigPrimary);

    const realm2 = await Realm.open(realmConfigPrimary);
    await realm2.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm2.objects("Dog").length, dogsBefore);
    realm2.close();

    // cleanup & re-sync with different partitionValue
    Realm.deleteFile(realmConfigPrimary);

    const realm3 = await Realm.open(realmConfigSecondary);
    await realm3.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm3.objects("Dog").length, 0);
    realm3.close();

    await user.logOut();
  },

  async testPartitionValueAsUuid() {
    const app = new Realm.App(AppConfig.pvUuidAppConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());

    const realmConfigPrimary = createConfig(PvUuidDog, user, new UUID("57eade47-8406-4397-ab97-49abcc4d681f"));
    const realmConfigSecondary = createConfig(PvUuidDog, user, new UUID("90d82df4-6037-4eb6-869b-a62f7af522b0"));

    // ensure clean starting point
    Realm.deleteFile(realmConfigPrimary);

    const realm1 = await Realm.open(realmConfigPrimary);
    realm1.write(() => {
      realm1.create("Dog", { _id: new ObjectId(), name: "King" });
    });

    await realm1.syncSession.uploadAllLocalChanges();
    const dogsBefore = realm1.objects("Dog").length;
    realm1.close();

    // cleanup, re-sync & check changes are synced
    Realm.deleteFile(realmConfigPrimary);

    const realm2 = await Realm.open(realmConfigPrimary);
    await realm2.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm2.objects("Dog").length, dogsBefore);
    realm2.close();

    // cleanup & re-sync with different partitionValue
    Realm.deleteFile(realmConfigPrimary);

    const realm3 = await Realm.open(realmConfigSecondary);
    await realm3.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm3.objects("Dog").length, 0);
    realm3.close();

    await user.logOut();
  },

  async testPartitionValueAsObjectId() {
    const app = new Realm.App(AppConfig.pvObjectidAppConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());

    const realmConfigPrimary = createConfig(PvObjectIdDog, user, new ObjectId("606d8cdf33e41d1409245e60"));
    const realmConfigSecondary = createConfig(PvObjectIdDog, user, new ObjectId("606d8cdf33e41d1409245e63"));

    // ensure clean starting point
    Realm.deleteFile(realmConfigPrimary);
    const realm1 = await Realm.open(realmConfigPrimary);
    realm1.write(() => {
      realm1.create("Dog", { _id: new ObjectId(), name: "King" });
    });

    await realm1.syncSession.uploadAllLocalChanges();
    const dogsBefore = realm1.objects("Dog").length;
    realm1.close();

    Realm.deleteFile(realmConfigPrimary);

    const realm2 = await Realm.open(realmConfigPrimary);
    await realm2.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm2.objects("Dog").length, dogsBefore);
    realm2.close();

    // cleanup & re-sync with different partitionValue
    Realm.deleteFile(realmConfigPrimary);

    const realm3 = await Realm.open(realmConfigSecondary);
    await realm3.syncSession.downloadAllServerChanges();

    TestCase.assertEqual(realm3.objects("Dog").length, 0);
    realm3.close();

    await user.logOut();
  },
};
