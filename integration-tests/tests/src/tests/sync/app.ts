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
import { importAppBefore, openRealmBefore } from "../../hooks";

const conf = {
  id: "smurf",
  baseUrl: "http://localhost:9999",
  timeout: 500,
  app: {
    name: "realm-sdk-integration-tests",
    version: "42",
  },
};

describe("App", () => {
  describe("instantiation", () => {
    it("from config", function () {
      const app = new Realm.App(conf);
      expect(app).instanceOf(Realm.App);
    });
    it("from string", function () {
      const app = new Realm.App(conf.id);
      expect(app).instanceOf(Realm.App);
      expect(app.id).equals(conf.id);
    });
    it("throws on undefined app", function () {
      //@ts-expect-error creating an app without a config should fail
      expect(() => new Realm.App()).throws(Error, "Invalid arguments: 1 expected, but 0 supplied.");
    });
    it("throws on undefined invalid input", function () {
      //@ts-expect-error creating an app with an invalid config should fail
      expect(() => new Realm.App(1234)).throws(Error, "Expected either a configuration object or an app id string.");
    });
    it("throws on invalid server", function () {
      const app = new Realm.App(conf);
      const credentials = Realm.Credentials.anonymous();
      return new Promise<void>((resolve, reject) => {
        return app
          .logIn(credentials)
          .then((user) => {
            return reject(`Able to log in with config ${JSON.stringify(conf)}`);
          })
          .catch((err) => {
            expect(err.message).contains(
              "request to http://localhost:9999/api/client/v2.0/app/smurf/location failed, reason: connect ECONNREFUSED",
            );
            return resolve();
          });
      });
    });
  });
  describe("with valid app", () => {
    importAppBefore("with-db");
    openRealmBefore({
      schema: [],
    });

    it("logins successfully ", async function (this: Mocha.Context & AppContext & RealmContext) {
      expect(this.app).instanceOf(Realm.App);
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      expect(user).instanceOf(Realm.User);
      expect(user.deviceId).to.not.be.null;
      expect(user.providerType).equals("anon-user");
      await user.logOut();
    });
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
  describe("with sync", () => {
    importAppBefore("with-db");
    //TODO
  });
});
