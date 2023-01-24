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

import { ObjectId } from "bson";
import { expect } from "chai";
import { importAppBefore } from "../../hooks";
import { generatePartition } from "../../utils/generators";

const TestObjectSchema: Realm.ObjectSchema = {
  name: "TestObject",
  properties: {
    doubleCol: "double",
  },
};

const PersonForSyncSchema: Realm.ObjectSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    dogs: "Dog[]",
    firstName: "string",
    lastName: "string",
    realm_id: "string?",
  },
};

const DogForSyncSchema: Realm.ObjectSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "string?",
  },
};

interface IPersonForSyncSchema {
  _id: ObjectId;
  age: number;
  dogs: IDogForSyncSchema[];
  firstName: string;
  lastName: string;
  realm_id: string | undefined;
}

interface IDogForSyncSchema {
  _id: ObjectId;
  breed: string | undefined;
  name: string;
  realm_id: string | undefined;
}

describe("App", () => {
  describe("instantiation", function () {
    afterEach(async () => {
      Realm.clearTestState();
    });
    const conf = { id: "smurf", baseUrl: "http://localhost:9090" };

    it("from config", () => {
      const app = new Realm.App(conf);
      expect(app).instanceOf(Realm.App);
    });

    it("from string", () => {
      const app = new Realm.App(conf.id);
      expect(app).instanceOf(Realm.App);
      expect(app.id).equals(conf.id);
    });

    it("throws on undefined app", function () {
      //@ts-expect-error creating an app without a config should fail
      expect(() => new Realm.App()).throws(Error, "Invalid arguments: 1 expected, but 0 supplied.");
    });

    it("throws on invalid input", function () {
      //@ts-expect-error creating an app with an invalid config should fail
      expect(() => new Realm.App(1234)).throws(Error, "Expected either a configuration object or an app id string.");
    });

    it("throws on invalid baseURL", async function () {
      const invalid_url_conf = { id: "smurf", baseUrl: "http://localhost:9999" };
      const app = new Realm.App(invalid_url_conf);

      const credentials = Realm.Credentials.anonymous();
      await expect(app.logIn(credentials)).to.be.rejectedWith(
        "request to http://localhost:9999/api/client/v2.0/app/smurf/location failed, reason: connect ECONNREFUSED",
      );
    });

    it("throws on non existing app", async function () {
      const app = new Realm.App(conf);
      const credentials = Realm.Credentials.anonymous();
      await expect(app.logIn(credentials)).to.be.rejectedWith("cannot find app using Client App ID 'smurf'");
    });
  });

  describe("with valid app", async () => {
    importAppBefore("with-db");

    it("logins successfully ", async function (this: Mocha.Context & AppContext & RealmContext) {
      let user;
      try {
        expect(this.app).instanceOf(Realm.App);
        const credentials = Realm.Credentials.anonymous();
        user = await this.app.logIn(credentials);
        expect(user).instanceOf(Realm.User);
        expect(user.deviceId).to.not.be.null;
        expect(user.providerType).equals("anon-user");
      } finally {
        await user?.logOut();
      }
    });

    it("logout and allUsers works", async function (this: Mocha.Context & AppContext & RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      let users = this.app.allUsers;
      const nUsers = Object.keys(users).length;

      const user = await this.app.logIn(credentials);
      users = this.app.allUsers;
      expect(Object.keys(users).length).equals(nUsers + 1);
      await user.logOut();

      users = this.app.allUsers;
      expect(Object.keys(users).length).equals(nUsers);
    });

    it("currentUser works", async function (this: Mocha.Context & AppContext & RealmContext) {
      expect(this.app.currentUser).to.be.null;

      const credentials = Realm.Credentials.anonymous();

      const user1 = await this.app.logIn(credentials);
      const user2 = this.app.currentUser;
      expect(user1.id).equals(user2?.id);

      await user1.logOut();
      expect(this.app.currentUser).to.be.null;
    });

    it("changeListeners works", async function (this: Mocha.Context & AppContext & RealmContext) {
      let eventListenerCalls = 0;
      expect(this.app).instanceOf(Realm.App);

      const listenerEvent = () => {
        eventListenerCalls += 1;
      };

      this.app.addListener(listenerEvent);

      let credentials = Realm.Credentials.anonymous();
      let user = await this.app.logIn(credentials);
      expect(eventListenerCalls).equals(1);

      await user.logOut();
      expect(eventListenerCalls).equals(2);
      credentials = Realm.Credentials.anonymous();

      user = await this.app.logIn(credentials);
      expect(eventListenerCalls).equals(3);

      // Remove the listener and verify that the event listener was not fired
      this.app.removeListener(listenerEvent);
      await user.logOut();
      expect(eventListenerCalls).equals(3);

      // Test remove all
      let eventListener1Calls = 0;
      let eventListener2Calls = 0;
      const listenerEvent1 = () => {
        eventListener1Calls += 1;
      };
      const listenerEvent2 = () => {
        eventListener2Calls += 1;
      };
      this.app.addListener(listenerEvent1);
      this.app.addListener(listenerEvent2);

      user = await this.app.logIn(credentials);
      expect(eventListener1Calls).equals(1);
      expect(eventListener2Calls).equals(1);

      this.app.removeAllListeners();
      await user.logOut();
      expect(eventListener1Calls).equals(1);
      expect(eventListener2Calls).equals(1);
    });
  });

  describe("with email-password auth", () => {
    importAppBefore("with-email-password");
    it("throws on login with non existing user ", async function (this: Mocha.Context & AppContext & RealmContext) {
      expect(this.app).instanceOf(Realm.App);
      const credentials = Realm.Credentials.emailPassword("me", "secret");
      let didFail = false;
      const user = await this.app.logIn(credentials).catch((err) => {
        expect(err.message).equals("invalid username/password");
        expect(err.code).equals(50);
        didFail = true;
      });
      expect(user).to.be.undefined;
      expect(didFail).equals(true);
    });
  });

  describe("with sync", () => {
    importAppBefore("with-db");

    it("migration while sync is enabled throws", async function (this: Mocha.Context & AppContext & RealmContext) {
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const config = {
        schema: [TestObjectSchema],
        sync: { user, partitionValue: '"Lolo"' },
        deleteRealmIfMigrationNeeded: true,
      };
      //@ts-expect-error deleteRealmIfMigrationNeeded is not a field on a syncConfiguration.
      expect(() => new Realm(config)).throws(
        "Cannot set 'deleteRealmIfMigrationNeeded' when sync is enabled ('sync.partitionValue' is set).",
      );
      await user.logOut();
    });

    it("MongoDB Realm sync works", async function (this: Mocha.Context & AppContext & RealmContext) {
      const dogNames = ["King", "Rex"]; // must be sorted
      let nCalls = 0;

      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      const partition = generatePartition();
      const realmConfig = {
        schema: [PersonForSyncSchema, DogForSyncSchema],
        shouldCompact: () => {
          nCalls++;
          return true;
        },
        sync: {
          user: user,
          partitionValue: partition,
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
      };
      //@ts-expect-error TYPEBUG: SyncConfiguration interfaces misses a user property.
      Realm.deleteFile(realmConfig);
      //@ts-expect-error TYPEBUG: SyncConfiguration interfaces misses a user property.
      const realm = await Realm.open(realmConfig);
      expect(nCalls).equals(1);
      realm.write(() => {
        const tmpDogs: IDogForSyncSchema[] = [];
        dogNames.forEach((n) => {
          const dog = realm.create<IDogForSyncSchema>(DogForSyncSchema.name, { _id: new ObjectId(), name: n });
          tmpDogs.push(dog);
          return tmpDogs;
        });
        realm.create(PersonForSyncSchema.name, {
          _id: new ObjectId(),
          age: 12,
          firstName: "John",
          lastName: "Smith",
          dogs: tmpDogs,
        });
      });

      await realm.syncSession?.uploadAllLocalChanges();
      expect(realm.objects("Dog").length).equals(2);
      realm.close();

      //@ts-expect-error TYPEBUG: SyncConfiguration interfaces misses a user property.
      Realm.deleteFile(realmConfig);

      //@ts-expect-error TYPEBUG: SyncConfiguration interfaces misses a user property.
      const realm2 = await Realm.open(realmConfig);
      expect(nCalls).equals(2);
      await realm2.syncSession?.downloadAllServerChanges();

      const dogs = realm2.objects<IDogForSyncSchema>(DogForSyncSchema.name).sorted("name");
      expect(dogs.length).equals(dogNames.length);
      for (let i = 0; i < dogNames.length; i++) {
        expect(dogs[i].name).equals(dogNames[i]);
      }
      const persons = realm2.objects<IPersonForSyncSchema>(PersonForSyncSchema.name);
      expect(persons.length).equals(1);
      expect(persons[0].dogs.length).equals(dogNames.length);
      realm2.close();
      await user.logOut();
    });
  });
});
