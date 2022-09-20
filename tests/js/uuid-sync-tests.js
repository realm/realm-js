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

const { UUID } = Realm.BSON;

const SCHEMA = {
  name: "UUIDObject",
  primaryKey: "_id",
  properties: {
    _id: "uuid",
    mandatory: "uuid",
    optional: "uuid?",
    list: "uuid[]",
  },
};

module.exports = {
  async testUUIDSync() {
    if (!global.enableSyncTests) return;

    const appConfig = AppConfig.integrationAppConfig;
    const app = new Realm.App(appConfig);
    const credentials = Realm.Credentials.anonymous();

    const user = await app.logIn(credentials);
    const config = {
      sync: {
        user,
        partitionValue: "UUID",
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [SCHEMA],
    };

    const realm1 = await Realm.open(config);

    realm1.write(() => {
      realm1.deleteAll();
    });

    const uuidTestArray = [
      new UUID("183f85f5-9fbc-4010-8566-85b9b2a91464"),
      new UUID("283f85f5-9fbc-4010-8566-85b9b2a91464"),
      new UUID("383f85f5-9fbc-4010-8566-85b9b2a91464"),
    ];

    realm1.write(() => {
      realm1.create(SCHEMA.name, {
        _id: new UUID("a2a26ae1-3ba0-4c2c-a730-52f7e0825b85"),
        mandatory: new UUID("176845e7-b463-4735-a125-82a926e298b4"),
        optional: new UUID("1af1761a-566f-434d-b1a9-2ad38165db68"),
      });
      realm1.create(SCHEMA.name, {
        _id: new UUID("b283c9fd-2821-4582-8f1c-04bc0e680ecf"),
        mandatory: new UUID("22515690-186b-4c24-a2a6-a84d991ace9e"),
      });
      realm1.create(SCHEMA.name, {
        _id: new UUID("c2a26ae1-3ba0-4c2c-a730-52f7e0825b85"),
        mandatory: new UUID("3ecad6e1-3fab-4a51-ade9-d0f733221adb"),
        list: uuidTestArray,
      });
    });

    await realm1.syncSession.uploadAllLocalChanges();

    TestCase.assertEqual(realm1.objects(SCHEMA.name).length, 3);

    realm1.close();

    // Clean slate
    Realm.deleteFile(config);

    const realm2 = await Realm.open(config);

    await realm2.syncSession.downloadAllServerChanges();

    const objects = realm2.objects(SCHEMA.name);

    TestCase.assertEqual(objects.length, 3);

    const first = objects[0];
    TestCase.assertInstanceOf(first._id, UUID);
    TestCase.assertEqual(first._id.toString(), "a2a26ae1-3ba0-4c2c-a730-52f7e0825b85");
    TestCase.assertInstanceOf(first.mandatory, UUID);
    TestCase.assertEqual(first.mandatory.toString(), "176845e7-b463-4735-a125-82a926e298b4");
    TestCase.assertInstanceOf(first.optional, UUID);
    TestCase.assertEqual(first.optional.toString(), "1af1761a-566f-434d-b1a9-2ad38165db68");
    TestCase.assertArraysEqual(first.list, []);

    const second = objects[1];
    TestCase.assertInstanceOf(second._id, UUID);
    TestCase.assertEqual(second._id.toString(), "b283c9fd-2821-4582-8f1c-04bc0e680ecf");
    TestCase.assertInstanceOf(second.mandatory, UUID);
    TestCase.assertEqual(second.mandatory.toString(), "22515690-186b-4c24-a2a6-a84d991ace9e");
    TestCase.assertNull(second.optional);
    TestCase.assertArraysEqual(second.list, []);

    const third = objects[2];
    TestCase.assertInstanceOf(third._id, UUID);
    TestCase.assertEqual(third._id.toString(), "c2a26ae1-3ba0-4c2c-a730-52f7e0825b85");
    TestCase.assertInstanceOf(third.mandatory, UUID);
    TestCase.assertEqual(third.mandatory.toString(), "3ecad6e1-3fab-4a51-ade9-d0f733221adb");
    TestCase.assertNull(third.optional);
    TestCase.assertArraysEqual(third.list, uuidTestArray);

    realm2.close();
  },
};
