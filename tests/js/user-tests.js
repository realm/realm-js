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
  TestCase.assertType(user.accessToken, 'string');
  TestCase.assertType(user.refreshToken, 'string');
  TestCase.assertType(user.id, 'string');
  TestCase.assertType(user.customData, 'object');
  TestCase.assertInstanceOf(user, Realm.User);
}

function assertIsSameUser(value, user) {
  assertIsUser(value);
  TestCase.assertEqual(value.accessToken, user.accessToken);
  TestCase.assertEqual(value.id, user.id);
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

function randomNonVerifiableEmail() {
  // according to the custom register function, emails will not register if they don't contain "realm_tests_do_autoverify"
  return `should-not-register-${Utils.uuid()}_@test.com`;
}

async function registerAndLogInEmailUser(app) {
  const validEmail = randomVerifiableEmail();
  const validPassword = "test1234567890";
  await app.emailPasswordAuth.registerUser(validEmail, validPassword);
  let user = await app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword))
  assertIsUser(user);
  assertIsSameUser(user, app.currentUser);
  return user;
}

async function logOutExistingUsers(app) {
  let users = app.allUsers;
  Object.keys(app.allUsers).forEach(async id => await users[id].logOut());
}

module.exports = {

  // tests also logIn() and currentUser
  async testLogout() {
    let app = new Realm.App(appConfig);
    await logOutExistingUsers(app);
    let credentials = Realm.Credentials.anonymous();

    let user = await app.logIn(credentials);
    assertIsUser(user);
    assertIsSameUser(user, app.currentUser);
    await user.logOut();
    // Is now logged out.
    TestCase.assertNull(app.currentUser);
  },

  testEmailPasswordMissingUsername() {
    let err = TestCase.assertThrows(() => Realm.Credentials.emailPassword(undefined, 'password'));
    TestCase.assertEqual(err.message, "email must be of type 'string', got (undefined)");
  },

  testEmailPasswordMissingPassword() {
    const username = Utils.uuid();
    let err = TestCase.assertThrows(() => Realm.Credentials.emailPassword(username, undefined));
    TestCase.assertEqual(err.message, "password must be of type 'string', got (undefined)");
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

  async testEmailPasswordAuth() {
    let app = new Realm.App(appConfig);
    let provider = app.emailPasswordAuth;
    TestCase.assertTrue(provider instanceof Realm.Auth.EmailPasswordAuth);
  },

  async testRegisterAutoVerifyEmailPassword() {
    let app = new Realm.App(appConfig);
    const validEmail = randomVerifiableEmail();
    const invalidEmail = randomNonVerifiableEmail();
    const invalidPassword = 'pass'; // too short
    const validPassword = "password123456";

    { // invalid email, invalid password
      let credentials = Realm.Credentials.emailPassword(invalidEmail, invalidPassword);
      let err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user does not exist yet
      err = await TestCase.assertThrowsAsync(async() => app.emailPasswordAuth.registerUser(invalidEmail, invalidPassword));
      TestCase.assertEqual(err.message, "password must be between 6 and 128 characters");
      err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user did not register
    }
    { // invalid email, valid password
      let credentials = Realm.Credentials.emailPassword(invalidEmail, validPassword);
      let err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user does not exist yet
      err = await TestCase.assertThrowsAsync(async() => app.emailPasswordAuth.registerUser(invalidEmail, validPassword));
      TestCase.assertEqual(err.message, `failed to confirm user ${invalidEmail}`);
      err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user did not register
    }
    { // valid email, invalid password
      let credentials = Realm.Credentials.emailPassword(validEmail, invalidPassword);
      let err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user does not exist yet
      err = await TestCase.assertThrowsAsync(async() => app.emailPasswordAuth.registerUser(validEmail, invalidPassword));
      TestCase.assertEqual(err.message, "password must be between 6 and 128 characters");
      err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user did not register
    }
    { // valid email, valid password
      let credentials = Realm.Credentials.emailPassword(validEmail, validPassword);
      let err = await TestCase.assertThrowsAsync(async() => app.logIn(credentials));
      TestCase.assertEqual(err.message, "invalid username/password"); // this user does not exist yet
      await app.emailPasswordAuth.registerUser(validEmail, validPassword);
      let user = await app.logIn(credentials)
      assertIsUser(user);
      assertIsSameUser(user, app.currentUser);
      await user.logOut();
    }
  },

  async testApiKeyAuth() {
    let app = new Realm.App(appConfig);

    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);
    TestCase.assertTrue(user.apiKeys instanceof Realm.Auth.ApiKeyAuth);

    //TODO: Enable when fixed: Disabling this test since the CI stitch integration returns cryptic error.
    // const apikey = await user.apiKeys.create("mykey");
    // const keys = await user.apiKeys.fetchAll();
    // TestCase.assertTrue(Array.isArray(keys));
    
    // TestCase.assertEqual(keys.length, 1);
    // TestCase.assertDefined(keys[0].id);
    // TestCase.assertEqual(keys[0].name, mykey);

    await user.logOut();
  },

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
    let collection = mongo.db('test_data').collection('testRemoteMongoClient');

    await collection.deleteMany({});
    await collection.insertOne({hello: "world"});
    TestCase.assertEqual(await collection.count({}), 1);
    TestCase.assertEqual(await collection.count({hello: "world"}), 1);
    TestCase.assertEqual(await collection.count({hello: "pineapple"}), 0);
  },

  async testRemoteMongoClientWatch() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);
    let collection = user.remoteMongoClient('BackingDB').db('test_data').collection('testRemoteMongoClient');

    const sleep = async time => new Promise(resolve => setInterval(resolve, time));
    const str = 'use some odd chars to force weird encoding %\n\r\n\\????>>>>';
    await Promise.all([
      (async () => {
        // There is a race with creating the watch() streams, since they won't
        // see inserts from before they are created. 
        // Wait 500ms (490+10) before first insert to try to avoid it.
        await sleep(490);
        for (let i = 0; i < 10; i++) {
          await sleep(10);
          await collection.insertOne({_id: i, hello: "world", str});
        }
        await collection.insertOne({_id: 'done', done: true}); // break other sides out of loop
      })(),
      (async () => {
        let expected = 0;
        for await (let event of collection.watch()) {
          if (event.fullDocument.done)
            break;
          TestCase.assertEqual(event.fullDocument._id, expected++);
        }
        TestCase.assertEqual(expected, 10);
      })(),
      (async () => {
        const filter = {$or:[
          {'fullDocument._id': 3, 'fullDocument.str': str},
          {'fullDocument.done': true},
        ]}
        let seenIt = false;
        for await (let event of collection.watch({filter})) {
          if (event.fullDocument.done)
            break;
          TestCase.assertEqual(event.fullDocument._id, 3);
          seenIt = true;
        }
        TestCase.assertTrue(seenIt, "seenIt for filter");
      })(),
      (async () => {
        let seenIt = false;
        for await (let event of collection.watch({ids: [5, 'done']})) {
          if (event.fullDocument.done)
            break;
          TestCase.assertTrue(event.fullDocument._id, 5);
          seenIt = true;
        }
        TestCase.assertTrue(seenIt, "seenIt for ids");
      })(),
    ]);

    // Test failure of initial request by logging out.
    await user.logOut();
    let err = await TestCase.assertThrowsAsync(async () => {
      for await (let _ of collection.watch()) {
        TestCase.assertTrue(false, "This should be unreachable");
      }
    });
    if (err.code != 401)
      throw err;
  },

  async testPush() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);

    let push = user.push('gcm');

    await push.deregister(); // deregister never registered not an error
    await push.register("hello");
    await push.register("hello"); // double register not an error
    await push.deregister();
    await push.deregister(); // double deregister not an error

    const err = await TestCase.assertThrowsAsync(async() => await user.push('nonesuch').register('hello'))
    TestCase.assertEqual(err.message, "service not found: 'nonesuch'");
  },

  async testAllWithAnonymous() {
    let app = new Realm.App(appConfig);
    await logOutExistingUsers(app);

    let all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 0, "Noone to begin with");

    let credentials = Realm.Credentials.anonymous();
    let user1 = await app.logIn(credentials);
    all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 1, "One user");
    assertIsSameUser(all[user1.id], user1);
    let user2 = await app.logIn(Realm.Credentials.anonymous());
    all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 1, "still one user");
    // NOTE: the list of users is in latest-first order.
    assertIsSameUser(all[user2.id], user2);
    assertIsSameUser(all[user1.id], user1);

    await user2.logOut(); // logs out the shared anonymous session
    all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 0, "All gone");
  },

  async testCurrentWithAnonymous() {
    let app = new Realm.App(appConfig);
    await logOutExistingUsers(app);
    TestCase.assertNull(app.currentUser);

    let firstUser = await app.logIn(Realm.Credentials.anonymous());
    assertIsSameUser(app.currentUser, firstUser);
    let secondUser = await app.logIn(Realm.Credentials.anonymous());
    // the most recently logged in user is considered current
    TestCase.assertTrue(firstUser.isLoggedIn);
    TestCase.assertTrue(secondUser.isLoggedIn);
    assertIsSameUser(app.currentUser, secondUser);
    secondUser.logOut();
    // since anonymous user sessions are shared, firstUser is logged out as well
    TestCase.assertNull(app.currentUser);
    TestCase.assertFalse(firstUser.isLoggedIn);
    TestCase.assertFalse(secondUser.isLoggedIn);
  },

  async testCurrentWithEmail() {
    let app = new Realm.App(appConfig);
    await logOutExistingUsers(app);
    TestCase.assertNull(app.currentUser);

    let firstUser = await registerAndLogInEmailUser(app);
    assertIsSameUser(app.currentUser, firstUser);
    let secondUser = await registerAndLogInEmailUser(app);
    assertIsSameUser(app.currentUser, secondUser); // the most recently logged in user is considered current
    await secondUser.logOut();
    assertIsSameUser(app.currentUser, firstUser); // auto change back to another logged in user
    await firstUser.logOut();
    TestCase.assertNull(app.currentUser);
  },

  async testAllWithEmail() {
    let app = new Realm.App(appConfig);
    await logOutExistingUsers(app);

    let all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 0, "Noone to begin with");

    let credentials = Realm.Credentials.anonymous();
    let user1 = await registerAndLogInEmailUser(app);
    all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 1, "One user");
    assertIsSameUser(all[user1.id], user1);
    let user2 = await registerAndLogInEmailUser(app);
    all = app.allUsers;
    TestCase.assertArrayLength(Object.keys(all), 2, "Two users");
    // NOTE: the list of users is in latest-first order.
    assertIsSameUser(all[user2.id], user2);
    assertIsSameUser(all[user1.id], user1);

    await user2.logOut();
    all = app.allUsers;
    assertIsSameUser(all[user2.id], user2);
    assertIsSameUser(all[user1.id], user1);
    TestCase.assertFalse(user2.isLoggedIn);
    TestCase.assertTrue(user1.isLoggedIn);
    TestCase.assertArrayLength(Object.keys(all), 2, "still holds references to both users");

    await user1.logOut();
    all = app.allUsers;
    TestCase.assertFalse(user1.isLoggedIn);
    TestCase.assertFalse(user2.isLoggedIn);
    TestCase.assertArrayLength(Object.keys(all), 2, "still holds references to both users"); // FIXME: is this actually expected?
  }
};
