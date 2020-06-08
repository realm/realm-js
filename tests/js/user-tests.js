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

/* eslint-env es6, node */

'use strict';

const Realm = require('realm');
const TestCase = require('./asserts');
const Utils = require('./test-utils');
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const AppConfig = require('./support/testConfig');

const require_method = require;
function node_require(module) {
    return require_method(module);
}
let appConfig = AppConfig.integrationAppConfig;

let fs, jwt, rosDataDir;
if (isNodeProcess) {
  fs = node_require('fs');
  jwt = node_require('jsonwebtoken');
  rosDataDir = process.env.ROS_DATA_DIR || '../realm-object-server-data';
}

function assertIsUser(user) {
  TestCase.assertDefined(user);
  TestCase.assertType(user, 'object');
  TestCase.assertType(user.token, 'string');
  TestCase.assertType(user.identity, 'string');
  TestCase.assertType(user.customData, 'object');
  TestCase.assertInstanceOf(user, Realm.User);
}

function assertIsSameUser(value, user) {
  assertIsUser(value);
  TestCase.assertEqual(value.token, user.token);
  TestCase.assertEqual(value.identity, user.identity);
}

function assertIsError(error, message) {
  TestCase.assertInstanceOf(error, Error, 'The API should return an Error');
  if (message) {
    TestCase.assertEqual(error.message, message);
  }
}

function assertIsAuthError(error, code, title) {
  TestCase.assertInstanceOf(error, Realm.Sync.AuthError, 'The API should return an AuthError');
  if (code) {
    TestCase.assertEqual(error.code, code);
  }
  if (title) {
    TestCase.assertEqual(error.title, title);
  }
}

function signToken(userId) {
  return jwt.sign({userId}, fs.readFileSync(`${rosDataDir}/keys/jwt.pem`), {
    expiresIn: "1d",
    algorithm: "RS256",
  });
}

function randomVerifiableEmail() {
    // according to the custom register function, emails will register if they contain "realm_tests_do_autoverify"
    return `realm_tests_do_autoverify_${Utils.uuid()}_@test.com`;
}

module.exports = {

  // tests also logIn() and currentUser()
  testLogout() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();

    return app.logIn(credentials).then(user => {
      assertIsUser(user);

      assertIsSameUser(user, app.currentUser());
      user.logOut();

      // Is now logged out.
      TestCase.assertNull(app.currentUser());
    });
  },

  testEmailPasswordMissingUsername() {
    TestCase.assertThrows(() => Realm.Credentials.emailPassword(undefined, 'password'));
  },

  testEmailPasswordMissingPassword() {
    const username = Utils.uuid();
    TestCase.assertThrows(() => Realm.Credentials.emailPassword(username, undefined));
  },

  testLoginNonExistingUser() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.emailPassword('foo', 'pass');
    return app.logIn(credentials).then((user) => {
      throw new Error("Login should have failed");
    }).catch(err => {
      TestCase.assertEqual(err.message, "invalid username/password");
    });
  },

  // testRegisterAutoVerifyEmailPassword() {
  //   let app = new Realm.App(appConfig);
  //   let credentials = Realm.Credentials.emailPassword(randomVerifiableEmail(), 'pass');
  //   return app.logIn(credentials).then((user) => {
  //     throw new Error("Login should have failed");
  //   }).catch(err => {
  //     TestCase.assertEqual(err.message, "invalid username/password");
  //   });
  // },

  async testFunctions() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);

    TestCase.assertEqual(await user.callFunction('sumFunc', [123]), 123);
    TestCase.assertEqual(await user.functions.sumFunc(123), 123);
    TestCase.assertEqual(await user.functions['sumFunc'](123), 123);

    // Test method stashing / that `this` is bound correctly.
    const sumFunc = user.functions.sumFunc;
    TestCase.assertEqual(await sumFunc(123), 123);
    TestCase.assertEqual(await sumFunc(123), 123); // Not just one-shot

    TestCase.assertEqual(await user.functions.sumFunc(1, 2, 3), 6);

    const err = await TestCase.assertThrowsAsync(async() => await user.functions.error());
    TestCase.assertEqual(err.message, "function not found: 'error'");
  },

  async testRemoteMongoClient() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);

    let mongo = user.remoteMongoClient('BackingDB');
    let collection = mongo.db('test').collection('testRemoteMongoClient');

    await collection.deleteMany({});
    await collection.insertOne({hello: "world"});
    TestCase.assertEqual(await collection.count({}), 1);
    TestCase.assertEqual(await collection.count({hello: "world"}), 1);
    TestCase.assertEqual(await collection.count({hello: "pineapple"}), 0);
  },

  testAll() {
    let app = new Realm.App(appConfig);
    Object.keys(app.allUsers()).forEach(id => users[id].logOut()); // FIXME: we need to reset users for each test

    const all = app.allUsers();
    TestCase.assertArrayLength(Object.keys(all), 0, "Noone to begin with");

    let credentials = Realm.Credentials.anonymous();
    return app.logIn(credentials).then(user1 => {
      const all = app.allUsers();
      TestCase.assertArrayLength(Object.keys(all), 1, "One user");
      assertIsSameUser(all[user1.identity], user1);

      return app.logIn(Realm.Credentials.anonymous()).then(user2 => {
        let all = app.allUsers();
        TestCase.assertArrayLength(Object.keys(all), 1, "still one user");
        // NOTE: the list of users is in latest-first order.
        assertIsSameUser(all[user2.identity], user2);
        assertIsSameUser(all[user1.identity], user1);

        user2.logOut(); // logs out the shared anonymous session
        all = app.allUsers();
        TestCase.assertArrayLength(Object.keys(all), 0, "All gone");
      });
    });
  },

  testCurrentWithAnonymous() {
    let app = new Realm.App(appConfig);
    TestCase.assertNull(app.currentUser());

    let firstUser;
    return app.logIn(Realm.Credentials.anonymous()).then(user1 => {
      assertIsSameUser(app.currentUser(), user1);
      firstUser = user1;
      return app.logIn(Realm.Credentials.anonymous());
    }).then(user2 => {
      // the most recently logged in user is considered current
      TestCase.assertTrue(firstUser.isLoggedIn);
      TestCase.assertTrue(user2.isLoggedIn);
      assertIsSameUser(app.currentUser(), user2);
      user2.logOut();
      // since anonymous user sessions are shared, user1 is logged out as well
      TestCase.assertNull(app.currentUser());
      TestCase.assertFalse(firstUser.isLoggedIn);
      TestCase.assertFalse(user2.isLoggedIn);
    });
  },

  /* do this with a email/pw user 
  testCurrentWithEmail() {
    let app = new Realm.App(appConfig);
    TestCase.assertNull(app.currentUser());

    let firstUser;
    return app.logIn(Realm.Credentials.anonymous()).then(user1 => {
      assertIsSameUser(app.currentUser(), user1);
      firstUser = user1;
      return app.logIn(Realm.Credentials.anonymous());
    }).then(user2 => {
      // the most recently logged in user is considered current
      assertIsSameUser(app.currentUser(), user2);
      user2.logOut();
      // auto change back to another logged in user
      assertIsSameUser(app.currentUser(), firstUser);

      firstUser.logOut();
      TestCase.assertNull(app.currentUser());
    });
  },*/

  /* FIXME: do this with an email/pw user
  testAll() {
    let app = new Realm.App(appConfig);
    Object.keys(app.allUsers()).forEach(id => users[id].logOut()); // FIXME: we need to reset users for each test

    const all = app.allUsers();
    TestCase.assertArrayLength(Object.keys(all), 0, "Noone to begin with");

    let credentials = Realm.Credentials.anonymous();
    return app.logIn(credentials).then(user1 => {
      const all = app.allUsers();
      TestCase.assertArrayLength(Object.keys(all), 1, "One user");
      assertIsSameUser(all[user1.identity], user1);

      return app.logIn(Realm.Credentials.anonymous()).then(user2 => {
        let all = app.allUsers();
        TestCase.assertArrayLength(Object.keys(all), 2, "Two users");
        // NOTE: the list of users is in latest-first order.
        assertIsSameUser(all[user2.identity], user2);
        assertIsSameUser(all[user1.identity], user1);

        user2.logOut();
        all = app.allUsers();
        TestCase.assertArrayLength(Object.keys(all), 1, "Back to one user");
        assertIsSameUser(all[user1.identity], user1);

        user1.logOut();
        all = app.allUsers();
        TestCase.assertArrayLength(Object.keys(all), 0, "All gone");
      });
    });
  },*/
};
