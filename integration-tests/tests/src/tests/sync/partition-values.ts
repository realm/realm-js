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
import { ObjectId, UUID } from "bson";
import { expect } from "chai";
import Realm from "realm";
import { authenticateUserBefore } from "../../hooks/authenticate-user-before";
import { importAppBefore } from "../../hooks/import-app-before";

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
        realm1.create("Dog", { _id: new ObjectId(), name: "King" });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      expect(realm1.objects("Dog").length).equals(1);
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(1);
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
        realm1.create("Dog", { _id: new ObjectId(), name: "King" });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      expect(realm1.objects("Dog").length).equals(1);
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(1);
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
      const realmConfigPrimary = createConfig(PvUuidDog, this.user, new UUID("57eade47-8406-4397-ab97-49abcc4d681f"));
      const realmConfigSecondary = createConfig(PvUuidDog, this.user, new UUID("90d82df4-6037-4eb6-869b-a62f7af522b0"));

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);

      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new ObjectId(), name: "King" });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      expect(realm1.objects("Dog").length).equals(1);
      realm1.close();

      // cleanup, re-sync & check changes are synced
      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(1);
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
      const realmConfigPrimary = createConfig(PvObjectIdDog, this.user, new ObjectId("606d8cdf33e41d1409245e60"));
      const realmConfigSecondary = createConfig(PvObjectIdDog, this.user, new ObjectId("606d8cdf33e41d1409245e63"));

      // ensure clean starting point
      Realm.deleteFile(realmConfigPrimary);
      const realm1 = await Realm.open(realmConfigPrimary);
      realm1.write(() => {
        realm1.create("Dog", { _id: new ObjectId(), name: "King" });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      expect(realm1.objects("Dog").length).equals(1);
      realm1.close();

      Realm.deleteFile(realmConfigPrimary);

      const realm2 = await Realm.open(realmConfigPrimary);
      await realm2.syncSession?.downloadAllServerChanges();

      expect(realm2.objects("Dog").length).equals(1);
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
