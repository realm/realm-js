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

/* global navigator, WorkerNavigator */

const require_method = require;

const Realm = require("realm");
const TestCase = require("./asserts");
const AppConfig = require("./support/testConfig");
const Utils = require("./test-utils");
const schemas = require("./schemas");

const { ObjectId } = Realm.BSON;

const config = AppConfig.integrationAppConfig;

module.exports = {
  testNewApp() {
    let app = new Realm.App(config);
    TestCase.assertInstanceOf(app, Realm.App);
  },

  testNewAppFromString() {
    let app = new Realm.App(config.id);
    TestCase.assertInstanceOf(app, Realm.App);
    TestCase.assertEqual(app.id, config.id);
  },

  testNewAppFromUndefined() {
    const error = TestCase.assertThrows(() => new Realm.App());
    TestCase.assertEqual(error.message, "Invalid arguments: 1 expected, but 0 supplied.");
  },

  testNewAppFromOther() {
    const error = TestCase.assertThrows(() => new Realm.App(1234));
    TestCase.assertEqual(error.message, "Expected either a configuration object or an app id string.");
  },

  testInvalidServer() {
    const conf = {
      id: "smurf",
      baseUrl: "http://localhost:9999",
      timeout: 1000,
      app: {
        name: "realm-sdk-integration-tests",
        version: "42",
      },
    };

    const app = new Realm.App(conf);
    let credentials = Realm.Credentials.anonymous();
    return new Promise((resolve, reject) => {
      return app
        .logIn(credentials)
        .then((user) => {
          return reject(`Able to log in with config ${JSON.stringify(conf)}`);
        })
        .catch((err) => {
          TestCase.assertTrue(
            err.message.startsWith(
              "request to http://localhost:9999/api/client/v2.0/app/smurf/location failed, reason: connect ECONNREFUSED",
            ),
          );
          return resolve();
        });
    });
  },

  async testNonexistingApp() {
    const conf = {
      id: "smurf",
      url: config.url,
      timeout: 1000,
      app: {
        name: "realm-sdk-integration-tests",
        version: "42",
      },
    };

    let app = new Realm.App(conf);
    let credentials = Realm.Credentials.anonymous();
    let failed = false;
    let user = await app.logIn(credentials).catch((err) => {
      failed = true;
      TestCase.assertEqual(err.message, "cannot find app using Client App ID 'smurf'");
    });
    TestCase.assertEqual(failed, true);
  },

  async testLogIn() {
    let app = new Realm.App(config);
    TestCase.assertTrue(app instanceof Realm.App);

    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);
    TestCase.assertInstanceOf(user, Realm.User);
    TestCase.assertNotNull(user.deviceId);
    TestCase.assertEqual(user.providerType, "anon-user");
    await user.logOut();
  },

  async testLogInNonexistingUser() {
    let app = new Realm.App(config);
    TestCase.assertTrue(app instanceof Realm.App);

    let credentials = Realm.Credentials.emailPassword("me", "secret");
    var didFail = false;
    let user = await app.logIn(credentials).catch((err) => {
      TestCase.assertEqual(err.message, "invalid username/password");
      TestCase.assertEqual(err.code, 50);
      didFail = true;
    });
    TestCase.assertUndefined(user);
    TestCase.assertEqual(didFail, true);
  },

  async testLogoutAndAllUsers() {
    let app = new Realm.App(config);
    let credentials = Realm.Credentials.anonymous();
    let users = app.allUsers;
    const nUsers = Object.keys(users).length;

    let user = await app.logIn(credentials);
    users = app.allUsers;
    TestCase.assertEqual(Object.keys(users).length, nUsers + 1);
    await user.logOut();

    users = app.allUsers;
    TestCase.assertEqual(Object.keys(users).length, nUsers);
  },

  async testCurrentUser() {
    let app = new Realm.App(config);
    TestCase.assertNull(app.currentUser);

    let credentials = Realm.Credentials.anonymous();

    let user1 = await app.logIn(credentials);
    let user2 = app.currentUser;
    TestCase.assertEqual(user1.id, user2.id);

    await user1.logOut();
    TestCase.assertNull(app.currentUser);
  },

  async testMongoDBRealmSync() {
    const dogNames = ["King", "Rex"]; // must be sorted
    let nCalls = 0;
    let app = new Realm.App(config);

    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);
    const partition = Utils.genPartition();
    const realmConfig = {
      schema: [schemas.PersonForSync, schemas.DogForSync],
      shouldCompactOnLaunch: (t, u) => {
        nCalls++;
        return true;
      },
      sync: {
        user: user,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
    };
    Realm.deleteFile(realmConfig);
    let realm = await Realm.open(realmConfig);
    TestCase.assertEqual(nCalls, 1);
    realm.write(() => {
      let tmpDogs = [];
      dogNames.forEach((n) => {
        let dog = realm.create("Dog", { _id: new ObjectId(), name: n });
        tmpDogs.push(dog);
      });
      realm.create("Person", {
        _id: new ObjectId(),
        age: 12,
        firstName: "John",
        lastName: "Smith",
        dogs: tmpDogs,
      });
    });

    await realm.syncSession.uploadAllLocalChanges();
    TestCase.assertEqual(realm.objects("Dog").length, 2);
    realm.close();

    Realm.deleteFile(realmConfig);

    let realm2 = await Realm.open(realmConfig);
    TestCase.assertEqual(nCalls, 2);
    await realm2.syncSession.downloadAllServerChanges();

    let dogs = realm2.objects("Dog").sorted("name");
    TestCase.assertEqual(dogs.length, dogNames.length);
    for (let i = 0; i < dogNames.length; i++) {
      TestCase.assertEqual(dogs[i].name, dogNames[i]);
    }
    let persons = realm2.objects("Person");
    TestCase.assertEqual(persons.length, 1);
    TestCase.assertEqual(persons[0].dogs.length, dogNames.length);
    realm2.close();
    await user.logOut();
  },

  async testChangeListener() {
    let app = new Realm.App(config);
    let eventListenerCalls = 0;
    TestCase.assertTrue(app instanceof Realm.App);

    const listenerEvent = () => {
      eventListenerCalls += 1;
    };

    app.addListener(listenerEvent);

    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);
    TestCase.assertEqual(eventListenerCalls, 1);

    await user.logOut();
    TestCase.assertEqual(eventListenerCalls, 2);
    credentials = Realm.Credentials.anonymous();

    user = await app.logIn(credentials);
    TestCase.assertEqual(eventListenerCalls, 3);

    // Remove the listener and verify that the event listener was not fired
    app.removeListener(listenerEvent);
    await user.logOut();
    TestCase.assertEqual(eventListenerCalls, 3);
  },
};
