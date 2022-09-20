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

const { Realm } = require("realm");
const TestCase = require("./asserts");
const AppConfig = require("./support/testConfig");

const { ObjectId, UUID } = Realm.BSON;

module.exports = {
  async testMixedSync() {
    if (!global.enableSyncTests) {
      return Promise.resolve();
    }
    const appConfig = AppConfig.integrationAppConfig;
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();

    let user = await app.logIn(credentials);
    const config = {
      sync: {
        user,
        partitionValue: "LoLo",
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [
        {
          name: "MixedObject",
          primaryKey: "_id",
          properties: {
            _id: "objectId",
            key: "string",
            value: "mixed",
          },
        },
      ],
    };
    let realm = await Realm.open(config);
    realm.write(() => {
      realm.deleteAll();
    });

    realm.write(() => {
      realm.create("MixedObject", {
        _id: new ObjectId(),
        key: "1",
        value: 1,
      });
      realm.create("MixedObject", {
        _id: new ObjectId(),
        key: "2",
        value: "2",
      });
      realm.create("MixedObject", {
        _id: new ObjectId(),
        key: "3",
        value: 3.0,
      });
      realm.create("MixedObject", {
        _id: new ObjectId(),
        key: "4",
        value: new UUID(),
      });
    });

    await realm.syncSession.uploadAllLocalChanges();
    TestCase.assertEqual(realm.objects("MixedObject").length, 4);
    realm.close();

    Realm.deleteFile(config);

    let realm2 = await Realm.open(config);
    await realm2.syncSession.downloadAllServerChanges();

    let objects = realm2.objects("MixedObject").sorted("key");
    TestCase.assertEqual(objects.length, 4);
    TestCase.assertTrue(typeof objects[0].value, "number");
    TestCase.assertTrue(typeof objects[1].value, "string");
    TestCase.assertTrue(typeof objects[2].value, "number");
    TestCase.assertTrue(objects[3].value instanceof UUID, "UUID");

    realm2.close();
  },
};
