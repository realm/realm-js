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

import { Realm, BSON } from "realm";
import { expect } from "chai";
import { importAppBefore } from "../../hooks";
import { getRegisteredEmailPassCredentials } from "../../utils/credentials";
import { buildAppConfig } from "../../utils/build-app-config";

const DogForSyncSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    partition: { type: "string", default: "partition" },
  },
};

const PersonForSyncSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    dogs: "Dog[]",
    firstName: "string",
    lastName: "string",
    partition: { type: "string", default: "partition" },
  },
};

describe.skip("Realm conversions", async () => {
  importAppBefore(buildAppConfig("with-pbs").anonAuth().partitionBasedSync());
  afterEach(() => Realm.clearTestState());

  describe("converting between Realms", () => {
    before(function (this: AppContext) {
      this.encryptedKeyLocal = new Int8Array(64);
      this.encryptedKeySync = new Int8Array(64);
      for (let i = 0; i < 64; i++) {
        this.encryptedKeyLocal[i] = 1;
        this.encryptedKeySync[i] = 2;
      }
    });

    interface ConversionTestContext {
      configSrc: Realm.Configuration;
      configDst: Realm.Configuration;
      encryptKeyLocal: Int8Array;
      encryptKeySync: Int8Array;
    }

    interface ConversionTestConfig {
      encrypted: boolean;
      sync: boolean;
    }

    /** Returns a Realm Config from a given conversion test configuration. */
    async function getRealmConfig(
      context: AppContext & ConversionTestContext,
      testConfig: ConversionTestConfig,
      isDestination?: boolean,
    ): Promise<Realm.Configuration> {
      let sync;
      let encryptionKey;
      if (testConfig.sync) {
        const credentials = await getRegisteredEmailPassCredentials(context.app);
        sync = {
          user: await context.app.logIn(credentials),
          partitionValue: "foo",
          // @ts-expect-error This is an internal API
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        };
      }

      if (testConfig.encrypted) {
        encryptionKey = testConfig.sync ? context.encryptedKeySync : context.encryptedKeyLocal;
      }

      return {
        sync,
        encryptionKey,
        schema: [DogForSyncSchema],
        path: `dog${testConfig.sync ? "_sync" : "_local"}${testConfig.encrypted ? "_encrypted" : ""}${
          isDestination ? "_dst" : ""
        }.realm`,
      };
    }

    /**
     * Helper function to create tests that convert between local/synced, unencrypted/encrypted Realms.
     * Adds 5 dogs to source Realm, runs a writeCopy to destination Realm and makes sure that all 5 dogs were copied.
     */
    async function itShouldConvertRealm(source: ConversionTestConfig, destination: ConversionTestConfig) {
      const testConfigAsString = (testConfig: ConversionTestConfig) =>
        `${testConfig.sync ? "synced" : "local"}, ${testConfig.encrypted ? "encrypted" : "unencrypted"}`;

      it(`convert ${testConfigAsString(source)} -> ${testConfigAsString(
        destination,
      )}`, async function (this: AppContext & ConversionTestContext) {
        this.configSrc = await getRealmConfig(this, source);
        this.configDst = await getRealmConfig(this, destination, true);

        const realmSrc = await Realm.open(this.configSrc);

        expect(realmSrc.objects("Dog").length).equals(0);
        realmSrc.write(() => {
          for (let i = 0; i < 5; i++) {
            realmSrc.create("Dog", {
              _id: new BSON.ObjectId(),
              breed: "Domestic Short Hair",
              name: `Dog no. ${i}`,
              partition: "foo",
            });
          }
        });

        if (source.sync) {
          await realmSrc.syncSession.uploadAllLocalChanges();
          await realmSrc.syncSession.downloadAllServerChanges();
        }
        realmSrc.writeCopyTo(this.configDst);
        realmSrc.close();

        const realmDst = await Realm.open(this.configDst);
        if (destination.sync) {
          await realmDst.syncSession.downloadAllServerChanges();
        }
        expect(realmDst.objects("Dog").length).equals(5);
        realmDst.close();
      });
    }

    afterEach(async function (this: AppContext & ConversionTestContext) {
      const configSrc = this.currentTest?.ctx?.configSrc;
      const configDst = this.currentTest?.ctx?.configDst;

      if (configSrc.sync) {
        // Clean up synced source Realm
        const realmSrc = await Realm.open(configSrc);
        realmSrc.write(() => realmSrc.deleteAll());
        await realmSrc.syncSession.uploadAllLocalChanges();
        realmSrc.close();
      }

      if (configDst.sync) {
        // Clean up synced destination Realm
        const realmDst = await Realm.open(configDst);
        realmDst.write(() => realmDst.deleteAll());
        await realmDst.syncSession.uploadAllLocalChanges();
        realmDst.close();
      }
    });

    describe("from local realm to local realm", () => {
      [
        {
          source: { encrypted: false, sync: false },
          destination: { encrypted: false, sync: false },
        },
        {
          source: { encrypted: false, sync: false },
          destination: { encrypted: true, sync: false },
        },
        {
          source: { encrypted: true, sync: false },
          destination: { encrypted: false, sync: false },
        },
        {
          source: { encrypted: true, sync: false },
          destination: { encrypted: true, sync: false },
        },
      ].forEach(({ source, destination }) => itShouldConvertRealm(source, destination));
    });

    describe("from synced realm to local realm", () => {
      [
        {
          source: { encrypted: false, sync: true },
          destination: { encrypted: false, sync: false },
        },
        {
          source: { encrypted: false, sync: true },
          destination: { encrypted: true, sync: false },
        },
        {
          source: { encrypted: true, sync: true },
          destination: { encrypted: false, sync: false },
        },
        {
          source: { encrypted: true, sync: true },
          destination: { encrypted: true, sync: false },
        },
      ].forEach(({ source, destination }) => itShouldConvertRealm(source, destination));
    });

    describe("from local realm to synced realm", () => {
      [
        {
          source: { encrypted: false, sync: false },
          destination: { encrypted: false, sync: true },
        },
        {
          source: { encrypted: false, sync: false },
          destination: { encrypted: true, sync: true },
        },
        {
          source: { encrypted: true, sync: false },
          destination: { encrypted: false, sync: true },
        },
        {
          source: { encrypted: true, sync: false },
          destination: { encrypted: true, sync: true },
        },
      ].forEach(({ source, destination }) => itShouldConvertRealm(source, destination));
    });

    describe("from synced realm to synced realm", () => {
      [
        {
          source: { encrypted: false, sync: true },
          destination: { encrypted: false, sync: true },
        },
        {
          source: { encrypted: false, sync: true },
          destination: { encrypted: true, sync: true },
        },
        {
          source: { encrypted: true, sync: true },
          destination: { encrypted: false, sync: true },
        },
        {
          source: { encrypted: true, sync: true },
          destination: { encrypted: true, sync: true },
        },
      ].forEach(({ source, destination }) => itShouldConvertRealm(source, destination));
    });
  });

  describe("invalid conversions", () => {
    it("throw correct errors", async function (this: AppContext) {
      // simple local realm
      const configLocal = {
        schema: [PersonForSyncSchema, DogForSyncSchema],
        path: "dogsLocal.realm",
      };

      // user for flexible sync test
      const credentials = await getRegisteredEmailPassCredentials(this.app);
      const user = await this.app.logIn(credentials);

      /*
       *  Test 1:  check that `writeCopyTo` verifies parameter count and types
       */
      const realm = await Realm.open(configLocal);
      expect(() => {
        //@ts-expect-error too many arguments
        realm.writeCopyTo("path", "encryptionKey", "invalidParameter");
      }).throws("Invalid arguments: at most 1 expected, but 3 supplied.");
      expect(() => {
        //@ts-expect-error too few arguments
        realm.writeCopyTo();
      }).throws("Expected a config object");
      expect(() => {
        //@ts-expect-error wrong argument type
        realm.writeCopyTo(null);
      }).throws("`config` parameter must be an object");
      expect(() => {
        //missing `path` property
        realm.writeCopyTo({});
      }).throws("`path` property must exist in output configuration");
      expect(() => {
        //@ts-expect-error wrong `path` property type
        realm.writeCopyTo({ path: 12345 });
      }).throws("`path` property must be a string");
      expect(() => {
        //@ts-expect-error wrong `encryptionKey` property type
        realm.writeCopyTo({ path: "outputPath", encryptionKey: "notBinary" });
      }).throws("'encryptionKey' property must be an ArrayBuffer or ArrayBufferView");
      expect(() => {
        //@ts-expect-error wrong `sync` property type
        realm.writeCopyTo({ path: "outputPath", sync: "invalidProperty" });
      }).throws("'sync' property must be an object");
      expect(() => {
        realm.writeCopyTo({ path: "output", sync: { flexible: true, user } });
      }).throws("Realm cannot be converted to a flexible sync realm unless flexible sync is already enabled");
      /*
       *  Test 2:  check that `writeCopyTo` can only be called at the right time
       */
      realm.write(() => {
        expect(() => {
          //@ts-expect-error wrong `sync` property type
          realm.writeCopyTo({ path: "outputPath", sync: "invalidProperty" });
        }).throws("Can only convert Realms outside a transaction");
      });
    });
  });
});
