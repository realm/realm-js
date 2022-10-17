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

const { Realm } = require("realm");
var TestCase = require("./asserts");
var Schemas = require("./schemas");

const { ObjectId } = Realm.BSON;

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
  return require_method(module);
}

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";

module.exports = {
  testEncryptedInvalidKeys: function () {
    // test failure with invalid keys
    TestCase.assertThrows(function () {
      new Realm({ schema: [Schemas.TestObject], encryptionKey: " ".repeat(64) });
    }, "Encryption Key must be an ArrayBuffer");

    TestCase.assertThrows(function () {
      new Realm({ schema: [Schemas.TestObject], encryptionKey: new Int8Array(63) });
    }, "Encryption Key must be 64 bytes");
  },
  testEncryptionValidKey: function () {
    var key = new Int8Array(64);
    key[0] = 1;
    var realm = new Realm({ schema: [Schemas.TestObject], encryptionKey: key });

    realm.write(function () {
      realm.create("TestObject", { doubleCol: 1 });
      TestCase.assertEqual(realm.objects("TestObject").length, 1);
    });

    // test failure with different or missing
    realm.close();
    TestCase.assertThrows(function () {
      new Realm({ schema: [Schemas.TestObject], encryptionKey: new Int8Array(64) });
    });
    TestCase.assertThrows(function () {
      new Realm({ schema: [Schemas.TestObject] });
    });

    // test can reopen with original key
    realm = new Realm({ schema: [Schemas.TestObject], encryptionKey: key });
    TestCase.assertEqual(realm.objects("TestObject").length, 1);
  },
  testRealmSchemaVersion: function () {
    var encryptionKey = new Int8Array(64);
    var realm = new Realm({ schema: [], schemaVersion: 3, path: "encrypted.realm", encryptionKey: encryptionKey });
    TestCase.assertEqual(realm.schemaVersion, 3);
    TestCase.assertEqual(Realm.schemaVersion("encrypted.realm", encryptionKey), 3);

    // The new SDK doesn't check argument count anymore
    // TestCase.assertThrows(function () {
    //   Realm.schemaVersion("encrypted.realm", encryptionKey, "extra");
    // });
    TestCase.assertThrows(function () {
      Realm.schemaVersion("encrypted.realm", "asdf");
    });
  },

  testEncryptionWithSync: function () {
    //TODO: remove when Atlas App Services test server can be hosted on Mac or other options exists
    if (!isNodeProcess) {
      return Promise.resolve();
    }

    if (!global.enableSyncTests) {
      return Promise.resolve();
    }
    const config = nodeRequire("./support/testConfig").integrationAppConfig;
    let app = new Realm.App(config);

    const credentials = Realm.Credentials.anonymous();
    return app.logIn(credentials).then((user) => {
      new Realm({
        path: "encrypted.realm",
        encryptionKey: new Int8Array(64),
        sync: {
          user: user,
          partitionValue: "LoLo",
        },
      });
      return user.logOut(); // FIXME: clearTestState() doesn't clean up enough and Realm.User.current might not work
    });
  },
};
