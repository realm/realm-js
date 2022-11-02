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
import Realm, { BSON } from "realm";
import { authenticateUserBefore } from "../../hooks/authenticate-user-before";
import { importAppBefore } from "../../hooks/import-app-before";
import { generatePartition } from "../../utils/generators";

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

const createConfig = (schema: Realm.ObjectSchema, user: Realm.User, partitionValue: any): Realm.Configuration => ({
  schema: [schema],
  sync: {
    user,
    partitionValue,
    //@ts-expect-error SessionStopPolicy is a const enum which is removed at runtime.
    _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
  },
});

describe("Partition-values", () => {
  describe("setting partition value on config", () => {
    importAppBefore("with-db");
    afterEach(() => Realm.clearTestState());

    it("can set accepted value types", async function (this: AppContext) {
      const testPartitionValues = [
        generatePartition(), // string
        Number.MAX_SAFE_INTEGER,
        6837697641419457,
        26123582,
        0,
        -12342908,
        -7482937500235834,
        -Number.MAX_SAFE_INTEGER,
        new BSON.ObjectId("603fa0af4caa9c90ff6e126c"),
        new BSON.UUID("f3287217-d1a2-445b-a4f7-af0520413b2a"),
        null,
        "",
      ];

      for (const partition of testPartitionValues) {
        const user = await this.app.logIn(Realm.Credentials.anonymous());
        const config = createConfig(PvStringDog, user, partition);
        expect(partition).equals(config.sync?.partitionValue);

        // TODO: Update docker testing-setup to allow for multiple apps and test each type on a supported App.
        // Note: This does NOT await errors from the server, as we currently have limitations in the docker-server-setup. All tests with with non-string fails server-side.
        const realm = new Realm(config);
        expect(realm).to.not.be.null;
        expect(realm).to.not.be.undefined;

        const spv: any = realm.syncSession?.config.partitionValue;

        // BSON types have their own 'equals' comparer
        if (spv instanceof BSON.ObjectId) {
          expect(spv.equals(partition as BSON.ObjectId)).to.be.true;
        } else if (spv && spv.toUUID !== undefined) {
          expect(spv.toUUID().equals(partition)).to.be.true;
        } else {
          expect(spv).equals(partition);
        }

        realm.close();
      }
    });
  });

  describe("integer", () => {
    importAppBefore("pv-int-tests");
    authenticateUserBefore();

    it("works", async function (this: Mocha.Context & AppContext & UserContext) {
      const realmConfigPrimary = createConfig(PvIntDog, this.user, 42);
      const realmConfigSecondary = createConfig(PvIntDog, this.user, 43);

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);

      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new BSON.ObjectId(), name: "King" });
      });

      const dogsBefore = realm1.objects("Dog").length;
      await realm1.syncSession?.uploadAllLocalChanges();
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(dogsBefore);
      realm2.close();

      // cleanup & re-sync with different partitionValue
      Realm.deleteFile(realmConfigPrimary);

      const realm3 = await Realm.open(realmConfigSecondary);
      await realm3.syncSession?.downloadAllServerChanges();

      expect(realm3.objects("Dog").length).equals(0);
      realm3.close();
    });
  });

  describe("string", () => {
    importAppBefore("pv-string-tests");
    authenticateUserBefore();

    it("works", async function (this: Mocha.Context & AppContext & UserContext) {
      const realmConfigPrimary = createConfig(PvStringDog, this.user, "42");
      const realmConfigSecondary = createConfig(PvStringDog, this.user, "43");

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);

      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new BSON.ObjectId(), name: "King" });
      });

      const dogsBefore = realm1.objects("Dog").length;
      await realm1.syncSession?.uploadAllLocalChanges();
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(dogsBefore);
      realm2.close();

      // cleanup & re-sync with different partitionValue
      Realm.deleteFile(realmConfigPrimary);

      const realm3 = await Realm.open(realmConfigSecondary);
      await realm3.syncSession?.downloadAllServerChanges();

      expect(realm3.objects("Dog").length).equals(0);
      realm3.close();
    });
  });

  describe("UUID", () => {
    importAppBefore("pv-uuid-tests");
    authenticateUserBefore();

    it("works", async function (this: Mocha.Context & AppContext & UserContext) {
      const realmConfigPrimary = createConfig(
        PvUuidDog,
        this.user,
        new BSON.UUID("57eade47-8406-4397-ab97-49abcc4d681f"),
      );
      const realmConfigSecondary = createConfig(
        PvUuidDog,
        this.user,
        new BSON.UUID("90d82df4-6037-4eb6-869b-a62f7af522b0"),
      );

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);

      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new BSON.ObjectId(), name: "King" });
      });

      const dogsBefore = realm1.objects("Dog").length;
      await realm1.syncSession?.uploadAllLocalChanges();
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(dogsBefore);
      realm2.close();

      // cleanup & re-sync with different partitionValue
      Realm.deleteFile(realmConfigPrimary);

      const realm3 = await Realm.open(realmConfigSecondary);
      await realm3.syncSession?.downloadAllServerChanges();

      expect(realm3.objects("Dog").length).equals(0);
      realm3.close();
    });
  });

  describe("objectId", () => {
    importAppBefore("pv-objectid-tests");
    authenticateUserBefore();

    it("works", async function (this: Mocha.Context & AppContext & UserContext) {
      const realmConfigPrimary = createConfig(PvObjectIdDog, this.user, new BSON.ObjectId("606d8cdf33e41d1409245e60"));
      const realmConfigSecondary = createConfig(
        PvObjectIdDog,
        this.user,
        new BSON.ObjectId("606d8cdf33e41d1409245e63"),
      );

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);
      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new BSON.ObjectId(), name: "King" });
      });

      const dogsBefore = realm1.objects("Dog").length;
      await realm1.syncSession?.uploadAllLocalChanges();
      realm1.close();

      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(dogsBefore);
      realm2.close();

      // cleanup & re-sync with different partitionValue
      Realm.deleteFile(realmConfigPrimary);

      const realm3 = await Realm.open(realmConfigSecondary);
      await realm3.syncSession?.downloadAllServerChanges();

      expect(realm3.objects("Dog").length).equals(0);
      realm3.close();
    });
  });
});
