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

import { BSON } from "realm";
import { expect } from "chai";
import { importAppBefore } from "../../hooks";
import { getRegisteredEmailPassCredentials } from "../../utils/credentials";

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

describe("Realm conversions", async () => {
  importAppBefore("with-db");

  before(function (this: AppContext) {
    this.encryptedKeyLocal = new Int8Array(64);
    this.encryptedKeySync = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      this.encryptedKeyLocal[i] = 1;
      this.encryptedKeySync[i] = 2;
    }
  });

  afterEach(() => Realm.clearTestState());

  interface ConversionTestConfig {
    encrypted: boolean;
    sync: boolean;
  }

  /** Returns a Realm Config from a given conversion test configuration. */
  async function getRealmConfig(
    context: AppContext,
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
        _sessionStopPolicy: "immediately" as Realm.SessionStopPolicy, // Make it safe to delete files after realm.close()
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

  async function itShouldConvertRealm(source: ConversionTestConfig, destination: ConversionTestConfig) {
    const testConfigAsString = (testConfig: ConversionTestConfig) =>
      `${testConfig.sync ? "synced" : "local"}, ${testConfig.encrypted ? "encrypted" : "unencrypted"}`;

    it(`convert ${testConfigAsString(source)} -> ${testConfigAsString(
      destination,
    )}`, async function (this: AppContext) {
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
        await realmSrc.syncSession?.uploadAllLocalChanges();
        await realmSrc.syncSession?.downloadAllServerChanges();
      }
      realmSrc.writeCopyTo(this.configDst);
      realmSrc.close();

      this.realmDst = await Realm.open(this.configDst);

      if (destination.sync) {
        expect(this.realmDst.syncSession).to.not.be.undefined;
        expect(this.realmDst.syncSession).to.not.be.null;
        await this.realmDst.syncSession?.downloadAllServerChanges();
        await this.realmDst.syncSession?.uploadAllLocalChanges();
      }

      expect(this.realmDst.objects("Dog").length).equals(5);

      if (source.sync) {
        // Clean up synced source Realm
        const realmSrc = await Realm.open(this.configSrc);
        realmSrc.write(() => realmSrc.deleteAll());
        await realmSrc.syncSession?.uploadAllLocalChanges();
        await this.configSrc.sync?.user.logOut();
      }
    });
  }

  afterEach(async function (this: AppContext) {
    // Clean up synced destination Realm
    if (this) this.realmDst.write(() => this.realmDst.deleteAll());
    await this.realmDst.syncSession?.uploadAllLocalChanges();
    this.realmDst.close();

    await this.configDst.sync?.user.logOut();
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

describe("foo", () => {
  importAppBefore("with-db");
  afterEach(() => Realm.clearTestState());
  // TODO:  Realm.open() fails after export_to() of synced -> local
  it("valid conversions", async function (this: AppContext) {
    this.longTimeout();
    const credentials = await getRegisteredEmailPassCredentials(this.app);
    const credentials2 = await getRegisteredEmailPassCredentials(this.app);
    const user = await this.app.logIn(credentials);

    /*
      Tests matrix:
        1)   local, unencrypted Realm -> local, unencrypted Realm
        2)   local, unencrypted Realm -> local, encrypted
        3)   local, encrypted Realm -> local, encrypted Realm
        4)   local, encrypted Realm -> local, unencrypted Realm

        5)   local, unencrypted Realm -> synced, unencrypted Realm
        6)   local, unencrypted Realm -> synced, encrypted
        7)   local, encrypted Realm -> synced, encrypted Realm
        8)   local, encrypted Realm -> synced, unencrypted Realm

        9)   synced, unencrypted Realm -> local, unencrypted Realm
        10)  synced, unencrypted Realm -> local, encrypted Realm
        11)  synced, encrypted Realm -> local, unencrypted Realm
        12)  synced, encrypted Realm -> local, encrypted Realm

        13)  synced, unencrypted Realm -> synced, unencrypted Realm
        14)  synced, unencrypted Realm -> synced, encrypted Realm
        15)  synced, encrypted Realm -> synced, unencrypted Relam
        16)  synced, encrypted Realm -> synced, encrypted Realm
    */

    const sourceLocation = ["local", "synced"];
    const destinationLocation = ["local", "synced"];
    const sourceEncryption = ["plain", "encrypted"];
    const destinationEncryption = ["plain", "encrypted"];

    const encryptionKey1 = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey1[i] = 1;
    }
    const encryptionKey2 = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey2[i] = 2;
    }

    // local realm that we will put a few dogs into
    const configLocal: Realm.Configuration = {
      schema: [PersonForSyncSchema, DogForSyncSchema],
      path: "dogsLocal.realm",
    };

    // local, encrypted, realm that we will put a few dogs into
    const configLocalEnc: Realm.Configuration = {
      schema: [PersonForSyncSchema, DogForSyncSchema],
      encryptionKey: encryptionKey1,
      path: "dogsLocalEnc.realm",
    };

    // shim config for the synced realms
    const configSync: Realm.Configuration = {
      sync: {
        // TODO: export_to doesn't fail is there's no user..?
        user,
        partitionValue: "foo",
        //@ts-expect-error using internal method.
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [DogForSyncSchema],
      path: "dogsSynced.realm",
    };

    // shim config for the synced realms
    const configSyncEnc: Realm.Configuration = {
      sync: {
        // TODO: export_to doesn't fail is there's no user..?
        // TODO:  Realm.open() fails after export_to() of synced -> local
        user,
        partitionValue: "foo",
        //@ts-expect-error using internal method.
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [DogForSyncSchema],
      encryptionKey: encryptionKey2,
      path: "dogsSyncedEnc.realm",
    };

    // create five dogs in our local realm
    const realmLocal = await Realm.open(configLocalEnc);
    realmLocal.write(() => {
      for (let i = 0; i < 5; i++) {
        realmLocal.create("Dog", {
          _id: new BSON.ObjectId(),
          breed: "Domestic Short Hair",
          name: `Brutus no. ${i}`,
          partition: "foo",
        });
      }
    });
    realmLocal.close();

    // create five dogs in our local realm
    const realmLocalEnc = await Realm.open(configLocal);
    realmLocalEnc.write(() => {
      for (let i = 0; i < 5; i++) {
        realmLocalEnc.create("Dog", {
          _id: new BSON.ObjectId(),
          breed: "Domestic Short Hair",
          name: `..Encrypted.. no. ${i}`,
          partition: "foo",
        });
      }
    });
    realmLocalEnc.close();

    const configSyncedDogs = configSync;
    configSyncedDogs.path = "dummy.realm";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    configSyncedDogs.sync!.user = user;

    // create five dogs in our synced realm
    const realmSynced = await Realm.open(configSyncedDogs);
    realmSynced.write(() => {
      for (let i = 0; i < 5; i++) {
        realmSynced.create("Dog", {
          _id: new BSON.ObjectId(),
          breed: "Fancy Long Hair",
          name: `Darletta no. ${i}`,
          partition: "foo",
        });
      }
    });
    realmSynced.close();

    // create five dogs in our synced realm
    const realmSyncedEnc = await Realm.open(configSyncEnc);
    realmSyncedEnc.write(() => {
      for (let i = 0; i < 5; i++) {
        realmSyncedEnc.create("Dog", {
          _id: new BSON.ObjectId(),
          breed: "Fancy Long Hair",
          name: `Darletta no. ${i}`,
          partition: "foo",
        });
      }
    });
    realmSyncedEnc.close();

    await user.logOut();

    // FIXME:
    // The test loops below should be refactored when moving to integration tests.
    // Multiple tests should be generated instead of looping over the test combinations
    // (see https://mochajs.org/#dynamically-generating-tests)
    let testNo = 1;
    for (const source of sourceLocation) {
      for (const destination of destinationLocation) {
        for (const srcEncryption of sourceEncryption) {
          for (const dstEncryption of destinationEncryption) {
            const configSrc = Object.assign(
              {},
              source == "local"
                ? srcEncryption == "plain"
                  ? configLocal
                  : configLocalEnc
                : srcEncryption == "plain"
                ? configSync
                : configSyncEnc,
            );
            const configDst = Object.assign(
              {},
              destination == "local"
                ? dstEncryption == "plain"
                  ? configLocal
                  : configLocalEnc
                : dstEncryption == "plain"
                ? configSync
                : configSyncEnc,
            );

            if (source == "synced") {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              configSrc.sync!.user = await this.app.logIn(credentials);
            }
            if (destination == "synced") {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              configDst.sync!.user = source == "synced" ? configSrc.sync!.user : await this.app.logIn(credentials2);
            }

            console.log(`\nTest ${testNo})  ${source}, ${srcEncryption}  -> ${destination}, ${dstEncryption}...\n`);

            configDst.path += `_test_${testNo}.realm`;

            if (srcEncryption == "encrypted") {
              configSrc.encryptionKey = encryptionKey1;
            }
            if (dstEncryption == "encrypted") {
              configDst.encryptionKey = encryptionKey2;
            }

            const realmSrc = await Realm.open(configSrc);
            if (source == "synced") {
              await realmSrc.syncSession?.uploadAllLocalChanges();
              await realmSrc.syncSession?.downloadAllServerChanges();
            }
            realmSrc.writeCopyTo(configDst);
            realmSrc.close();

            const realmDst = await Realm.open(configDst);
            if (destination == "synced") {
              expect(realmDst.syncSession).to.not.be.undefined;
              expect(realmDst.syncSession).to.not.be.null;
              await realmDst.syncSession?.downloadAllServerChanges();
              await realmDst.syncSession?.uploadAllLocalChanges();
            }
            expect(realmDst.objects("Dog").length).equals(
              10,
              `\nTest ${testNo})  ${source}, ${srcEncryption}  -> ${destination}, ${dstEncryption}...\n`,
            );
            realmDst.close();

            if (source == "synced") {
              await configSrc.sync?.user.logOut();
            }
            if (destination == "synced") {
              await configDst.sync?.user.logOut();
            }
            Realm.deleteFile(configDst);

            testNo++;
          }
        }
      }
    }
  });

  it("invalid conversions throw", async function (this: AppContext) {
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
