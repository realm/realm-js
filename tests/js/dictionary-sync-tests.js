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
  async testDictionarySync() {
    // test that we can create a synced realm with a Dictionary
    // that isn't required
    if (!global.enableSyncTests) return;

    const schema = {
      name: "Dictionary",
      primaryKey: "_id",
      properties: {
        _id: "int",
        columnStringDictionary: "string{}",
        columnIntegerDictionary: "int{}",
        columnFloatDictionary: "float{}",
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

    realm.write(() => {
      realm.create(schema.name, {
        _id: 1,
        columnStringDictionary: { foo: "bar" },
        columnIntegerDictionary: { n: 3 },
        columnFloatDictionary: { x: 3.14 },
      });
    });

    await realm.syncSession.uploadAllLocalChanges();

    let objects = realm.objects(schema.name);
    TestCase.assertEqual(objects.length, 1, "There should be 1 object");

    realm.close();
  },
};
