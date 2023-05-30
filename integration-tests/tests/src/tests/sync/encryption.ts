////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { expect } from "chai";
import { importAppBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

const TestObjectSchema = {
  name: "TestObject",
  properties: {
    doubleCol: "double",
  },
};

describe.skipIf(environment.browser, "Encryption", () => {
  describe("without sync", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("invalid key throws", () => {
      expect(function () {
        //@ts-expect-error testing invalid string parameter as encryption key
        new Realm({ schema: [TestObjectSchema], encryptionKey: " ".repeat(64) });
      }).throws; // Encryption Key must be an ArrayBuffer

      expect(function () {
        new Realm({ schema: [TestObjectSchema], encryptionKey: new Int8Array(63) });
      }).throws; // Encryption Key must be 64 bytes
    });

    it("test valid key", () => {
      const key = new Int8Array(64);
      key[0] = 1;
      let realm = new Realm({ schema: [TestObjectSchema], encryptionKey: key });

      realm.write(function () {
        realm.create(TestObjectSchema.name, { doubleCol: 2 });
        expect(realm.objects(TestObjectSchema.name).length).equals(1);
      });

      // test failure with different or missing
      realm.close();
      expect(function () {
        new Realm({ schema: [TestObjectSchema], encryptionKey: new Int8Array(64) });
      }).throws;
      expect(function () {
        new Realm({ schema: [TestObjectSchema] });
      }).throws;

      // test can reopen with original key
      realm = new Realm({ schema: [TestObjectSchema], encryptionKey: key });
      expect(realm.objects(TestObjectSchema.name).length).equals(1);
    });

    it("schema version with encrypted realm", () => {
      const encryptionKey = new Int8Array(64);
      const realm = new Realm({ schema: [], schemaVersion: 3, path: "encrypted.realm", encryptionKey: encryptionKey });
      expect(realm.schemaVersion).equals(3);
      expect(Realm.schemaVersion("encrypted.realm", encryptionKey)).equals(3);

      expect(function () {
        //@ts-expect-error test invalid encryptionkey as input to schemaversion
        Realm.schemaVersion("encrypted.realm", "asdf");
      }).throws;
    });
  });

  describe.skipIf(environment.missingServer, "with sync", () => {
    importAppBefore(buildAppConfig("with-pbs").anonAuth().partitionBasedSync());

    it("can set property in config", async function (this: AppContext) {
      this.longTimeout();
      const credentials = Realm.Credentials.anonymous();
      return this.app.logIn(credentials).then((user: Realm.User) => {
        new Realm({
          path: "encrypted.realm",
          encryptionKey: new Int8Array(64),
          sync: {
            user: user,
            partitionValue: "LoLo",
          },
        });
      });
    });
  });
});
