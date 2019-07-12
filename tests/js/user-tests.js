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

const require_method = require;
function node_require(module) {
    return require_method(module);
}

let fs, jwt, rosDataDir;
if (isNodeProcess) {
  fs = node_require('fs');
  jwt = node_require('jsonwebtoken');
  rosDataDir = process.env.ROS_DATA_DIR || '../realm-object-server-data';
}

function assertIsUser(user, isAdmin) {
  TestCase.assertType(user, 'object');
  TestCase.assertType(user.token, 'string');
  TestCase.assertType(user.identity, 'string');
  TestCase.assertInstanceOf(user, Realm.Sync.User);
  if (isAdmin !== undefined) {
    TestCase.assertEqual(user.isAdmin, isAdmin);
  }
}

function assertIsSameUser(value, user) {
  assertIsUser(value);
  TestCase.assertEqual(value.token, user.token);
  TestCase.assertEqual(value.identity, user.identity);
  TestCase.assertEqual(value.isAdmin, user.isAdmin);
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

function signToken(userId, isAdmin) {
  return jwt.sign({isAdmin, userId}, fs.readFileSync(`${rosDataDir}/keys/jwt.pem`), {
    expiresIn: "1d",
    algorithm: "RS256",
  });
}

module.exports = {

  testLogout() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      assertIsUser(user);

      assertIsSameUser(user, Realm.Sync.User.current);
      user.logout();

      // Is now logged out.
      TestCase.assertUndefined(Realm.Sync.User.current);

      // Can we open a realm with the registered user?
      TestCase.assertThrows(() => new Realm({sync: {user: user, url: 'realm://127.0.0.1:9080/~/test'}}));
    });
  },

  testRegisterUser() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      // Can we open a realm with the registered user?
      const realm = new Realm({sync: {user: user, url: 'realm://127.0.0.1:9080/~/test'}});
      TestCase.assertInstanceOf(realm, Realm);
    });
  },

  testRegisterExistingUser() {
    const username = Utils.uuid();
    const credentials = Realm.Sync.Credentials.usernamePassword(username, 'password', true);
    return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then((user) => {
      assertIsUser(user);
      return Realm.Sync.User.login('http://127.0.0.1:9080', credentials)
        .then((user) => { throw new Error(user); })
        .catch((e) => {
            assertIsAuthError(e, 611, "The provided credentials are invalid or the user does not exist.");
        })
    });
  },

  testRegisterMissingUsername() {
    TestCase.assertThrows(() => Realm.Sync.Credentials.usernamePassword(undefined, 'password'));
  },

  testRegisterMissingPassword() {
    TestCase.assertThrows(() => Realm.Sync.Credentials.usernamePassword(Utils.uuid(), undefined));
  },

  testRegisterServerOffline() {
    // Because it waits for answer this takes some time..
    return Realm.Sync.User.login('http://fake_host.local', Realm.Sync.Credentials.anonymous())
      .catch((e) => {})
      .then((user) => { if (user) { throw new Error('should not have been able to register'); }})
  },

  testLogin() {
    const username = Utils.uuid();
    const registerCredentials = Realm.Sync.Credentials.usernamePassword(username, 'password', true);
    // Create user, logout the new user, then login
    return Realm.Sync.User.login('http://127.0.0.1:9080', registerCredentials).then((user) => {
      user.logout();
      const loginCredentials = Realm.Sync.Credentials.usernamePassword(username, 'password', false);
      return Realm.Sync.User.login('http://127.0.0.1:9080', loginCredentials);
    }).then((user => {
      assertIsUser(user);
      // Can we open a realm with the logged-in user?
      const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/test' }});
      const realm = new Realm(config);
      TestCase.assertInstanceOf(realm, Realm);
      realm.close();
    }))
  },

  testAuthenticateWithPassword() {
    const username = Utils.uuid();
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.usernamePassword(username, 'password', true)).then((user) => {
      user.logout();
      return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.usernamePassword(username, 'password'));
    }).then((user => {
      assertIsUser(user);
      const realm = new Realm(user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/test' } }));
      TestCase.assertInstanceOf(realm, Realm);
      realm.close();
    }))
  },

  testLoginMissingUsername() {
    TestCase.assertThrows(() => Realm.Sync.User.login('http://127.0.0.1:9080', undefined, 'password'));
  },

  testLoginMissingPassword() {
    const username = Utils.uuid();
    TestCase.assertThrows(() => Realm.Sync.User.login('http://127.0.0.1:9080', username, undefined));
  },

  testLoginNonExistingUser() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.usernamePassword('foo', 'pass', false))
      .then((user) => { throw new Error(user); })
      .catch((e) => assertIsAuthError(e, 611, "The provided credentials are invalid or the user does not exist."))
  },

  testLoginTowardsMisbehavingServer() {
    // Try authenticating using an endpoint that doesn't exist
    return Realm.Sync.User.login('http://127.0.0.1:9080/invalid-auth-endpoint', Realm.Sync.Credentials.anonymous())
      .then(() => { throw new Error('Login should have failed'); })
      .catch((e) => {
        assertIsError(e);
        TestCase.assertEqual(
          e.message,
          "Could not authenticate: Realm Object Server didn't respond with valid JSON"
        );
      });
  },

  testAuthenticateJWT() {
    if (!isNodeProcess) {
      return;
    }

    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.jwt(signToken('user_name', false)))
      .then(user => {
          TestCase.assertEqual(user.identity, 'user_name');
          TestCase.assertFalse(user.isAdmin);
          return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.jwt(signToken('admin_user', true)))
      }).then(user => {
          TestCase.assertEqual(user.identity, 'admin_user');
          TestCase.assertTrue(user.isAdmin);
      });
  },

  testAuthenticateCustom() {
    // Assert that we can create custom credentials without specifying userInfo
    Realm.Sync.Credentials.custom("foo", "bar");
  },

  testAuthenticateAdminToken() {
    if (!isNodeProcess) {
      return;
    }

    // read admin token from ROS
    const adminToken = JSON.parse(fs.readFileSync(`${rosDataDir}/keys/admin.json`, 'utf8'))['ADMIN_TOKEN'];
    const credentials = Realm.Sync.Credentials.adminToken(adminToken);
    const user = Realm.Sync.User.login('http://127.0.0.1:9080', credentials);
    TestCase.assertTrue(user.isAdmin);
  },

  testAll() {
    const all = Realm.Sync.User.all;
    TestCase.assertArrayLength(Object.keys(all), 0);

    let user1;
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      const all = Realm.Sync.User.all;
      TestCase.assertArrayLength(Object.keys(all), 1);
      assertIsSameUser(all[user.identity], user);
      user1 = user;

      return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
    }).then((user2) => {
        let all = Realm.Sync.User.all;
        TestCase.assertArrayLength(Object.keys(all), 2);
        // NOTE: the list of users is in latest-first order.
        assertIsSameUser(all[user2.identity], user2);
        assertIsSameUser(all[user1.identity], user1);

        user2.logout();
        all = Realm.Sync.User.all;
        TestCase.assertArrayLength(Object.keys(all), 1);
        assertIsSameUser(all[user1.identity], user1);

        user1.logout();
        all = Realm.Sync.User.all;
        TestCase.assertArrayLength(Object.keys(all), 0);
      });
  },

  testCurrent() {
    TestCase.assertUndefined(Realm.Sync.User.current);

    let user1;
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      user1 = user;
      assertIsSameUser(Realm.Sync.User.current, user1);

      return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
    }).then((user2) => {
      TestCase.assertThrows(() => Realm.Sync.User.current, 'We expect Realm.Sync.User.current to throw if > 1 user.');
      user2.logout();

      assertIsSameUser(Realm.Sync.User.current, user1);

      user1.logout();
      TestCase.assertUndefined(Realm.Sync.User.current);
    });
  },

  testGetExistingUser() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      let identity = user.identity;
      let user1 = Realm.Sync.User._getExistingUser('http://127.0.0.1:9080', identity);
      assertIsSameUser(user1, user);
      user.logout();
      let user2 = Realm.Sync.User._getExistingUser('http://127.0.0.1:9080', identity);
      TestCase.assertUndefined(user2);
    });
  },

  testRetrieveAccount() {
    if (!isNodeProcess) {
      return;
    }

    if (!global.testAdminUserInfo) {
      throw new Error("Test requires an admin user");
    }

    const credentials = Realm.Sync.Credentials.usernamePassword(global.testAdminUserInfo.username, global.testAdminUserInfo.password);
    return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then((user) => {
      TestCase.assertTrue(user.isAdmin, "Test requires an admin user");

      return user.retrieveAccount('password', global.testAdminUserInfo.username)
    }).then((account) => {
      TestCase.assertEqual(account.accounts[0].provider_id, global.testAdminUserInfo.username);
      TestCase.assertEqual(account.accounts[0].provider, 'password');
      TestCase.assertTrue(account.is_admin);
      TestCase.assertTrue(account.user_id);
    });
  },

  testRetrieveNonExistentAccount() {
    if (!isNodeProcess) {
      return;
    }

    if (!global.testAdminUserInfo) {
      throw new Error("Test requires an admin user");
    }

    const credentials = Realm.Sync.Credentials.usernamePassword(global.testAdminUserInfo.username, global.testAdminUserInfo.password);
    return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then((user) => {
      TestCase.assertTrue(user.isAdmin, "Test requires an admin user");

      let notExistingUsername = Utils.uuid();
      return user.retrieveAccount('password', notExistingUsername)
    }).then(() => { throw new Error("Retrieving nonexistent account should fail") }, (e) => {
      TestCase.assertEqual(e.status, 404);
      TestCase.assertEqual(e.code, 612);
      TestCase.assertEqual(e.message, "The account does not exist.");
      TestCase.assertEqual(e.type, "https://docs.realm.io/server/troubleshoot/errors#unknown-account");
    });
  },

  testCreateConfiguration_defaultConfig() {
      return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
          let config = user.createConfiguration();
          TestCase.assertEqual(config.sync.url, "realm://127.0.0.1:9080/default");
          TestCase.assertFalse(config.sync.fullSynchronization);
      });
  },

  testConfiguration_urlConversion() {
    const tests = [

        // If no URL is provided default to using `/default`
        { auth: 'http://127.0.0.1/auth', sync: undefined, output:'realm://127.0.0.1/default' },
        { auth: 'http://127.0.0.1/auth?foo', sync: undefined, output:'realm://127.0.0.1/default' },
        { auth: 'http://127.0.0.1:1234/auth?foo', sync: undefined, output:'realm://127.0.0.1:1234/default' },
        { auth: 'https://127.0.0.1/auth', sync: undefined, output:'realms://127.0.0.1/default' },

        // If relative URL is used, use auth host
        { auth: 'http://127.0.0.1/auth', sync: '/default1', output: 'realm://127.0.0.1/default1' },
        { auth: 'http://127.0.0.1/auth', sync: '/~/default1', output: 'realm://127.0.0.1/~/default1' },
        { auth: 'http://127.0.0.1/auth', sync: '~/default1', output: 'realm://127.0.0.1/~/default1' },
        { auth: 'http://127.0.0.1/auth?foo', sync: '/default1', output:'realm://127.0.0.1/default1' },
        { auth: 'http://127.0.0.1:1234/auth?foo', sync: '/default1', output:'realm://127.0.0.1:1234/default1' },
        { auth: 'https://127.0.0.1/auth', sync: '/default1', output:'realms://127.0.0.1/default1' },

        // If full URL is used, no automatic conversions should be applied
        { auth: 'http://127.0.0.1/auth', sync: 'realm://foo.bar.com/default', output: 'realm://foo.bar.com/default' },
        { auth: 'http://127.0.0.1/auth', sync: 'realms://foo.bar.com/default', output: 'realms://foo.bar.com/default' },
        { auth: 'http://127.0.0.1:1234/auth', sync: 'realm://foo.bar.com:5678/~/default', output: 'realm://foo.bar.com:5678/~/default' },
    ];

    const adminCreds = Realm.Sync.Credentials.adminToken("foo"); // Fake user
    for (var i = 0; i < tests; i++) {
        const test = tests[i];
        const user = Realm.Sync.User.login(test.auth, adminCreds);

        let customConfig = {
            sync: {}
        };
        if (test.sync !== undefined) {
            customConfig.sync['url'] = test.sync
        }
        const realmConfig = user.createConfiguration(customConfig);
        TestCase.assertEqual(realmConfig.sync.url, test.output, `Test ${i}`);
    }
  },

  testSerialize() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((user) => {
      const serialized = user.serialize();
      TestCase.assertFalse(serialized.isAdmin);
      TestCase.assertEqual(serialized.identity, user.identity);
      TestCase.assertEqual(serialized.server, 'http://127.0.0.1:9080');
      TestCase.assertEqual(serialized.refreshToken, user.token);
    });
  },

  testDeserialize() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous())
      .then((user) => {
        const userConfig = user.createConfiguration({
          schema: [{ name: 'Dog', properties: { name: 'string' } }],
          sync: {
            url: 'realm://127.0.0.1:9080/~/foo',
            fullSynchronization: true,
          }
        });

        const realm = new Realm(userConfig);
        realm.write(() => {
          realm.create('Dog', {
            name: 'Doggo'
          });
        });

        const session = realm.syncSession;
        return new Promise((resolve, reject) => {
          let callback = (transferred, total) => {
              if (transferred >= total) {
                  session.removeProgressNotification(callback);
                  realm.close();
                  Realm.deleteFile(userConfig);
                  resolve(user.serialize());
              }
          }
          session.addProgressNotification('upload', 'forCurrentlyOutstandingWork', callback);
        });
      }).then((serialized) => {
        const deserialized = Realm.Sync.User.deserialize(serialized);
        const config = deserialized.createConfiguration({
          schema: [{ name: 'Dog', properties: { name: 'string' } }],
          sync: {
            url: 'realm://127.0.0.1:9080/~/foo',
            fullSynchronization: true,
          }
        });

        return Realm.open(config);
      }).then((realm) => {
        const dogs = realm.objects('Dog');
        TestCase.assertEqual(dogs.length, 1);
        TestCase.assertEqual(dogs[0].name, 'Doggo');
      });
  },

  testSerializeAdminToken() {
    const adminToken = 'this-is-admin-token';
    const server = 'http://foo/bar';
    const user = Realm.Sync.User.login(server, Realm.Sync.Credentials.adminToken(adminToken))
    const serialized = user.serialize();
    TestCase.assertEqual(serialized.adminToken, adminToken);
    TestCase.assertEqual(serialized.server, server);

    const deserialized = Realm.Sync.User.deserialize(serialized);
    TestCase.assertEqual(deserialized.token, adminToken);
    TestCase.assertEqual(deserialized.server, server);
    TestCase.assertTrue(deserialized.isAdminToken);
  },

  testDeserializeInvalidInput() {
    const dummy = {
      server: '123',
      identity: '123',
      refreshToken: '123',
      isAdmin: false,
    };

    for (const name of Object.getOwnPropertyNames(dummy)) {
      const clone = Object.assign({}, dummy);
      // Set to invalid type
      clone[name] = 123;

      TestCase.assertThrowsContaining(() => Realm.Sync.User.deserialize(clone), `${name} must be of type '${typeof dummy[name]}'`);

      // Set to undefined
      clone[name] = undefined;
      TestCase.assertThrowsContaining(() => Realm.Sync.User.deserialize(clone), `${name} is required, but a value was not provided.`);
    }
  }

  /* This test fails because of realm-object-store #243 . We should use 2 users.
  testSynchronizeChangesWithTwoClientsAndOneUser() {
    // Test Schema
    class Foo {}
    Foo.schema = {
      name:       'Foo',
      properties: {
        string: 'string',
        bars:   { type: 'list', objectType: 'Bar' },
      },
    };

    class Bar {}
    Bar.schema = {
      name:       'Bar',
      properties: { integer: 'int' },
    };

    const schema = [Foo.schema, Bar.schema];

    // Create a user, open two clients at different local paths, synchronize changes
    const username = Utils.uuid();
    return new Promise((resolve) => {
      Realm.Sync.User.register('http://127.0.0.1:9080', username, 'password', (error ,user) => {
        failOnError(error);

        const clientA = new Realm({
          path:   'testSynchronizeChangesWithTwoClientsAndOneUser_clientA.realm',
          schema: schema,
          sync:   {
            user: user,
            url:  'http://127.0.0.1:9080/~/test',
          },
        });

        const clientB = new Realm({
          path:   'testSynchronizeChangesWithTwoClientsAndOneUser_clientB.realm',
          schema: schema,
          sync:   {
            user: user,
            url:  'http://127.0.0.1:9080/~/test',
          },
        });

        clientB.addListener('change', () => {
          const foos = clientB.objects('Foo');
          if (foos.length > 0) {
            TestCase.assertEqual(foos.length, 1);
            TestCase.assertEqual(foos[0].string, 'Hello, World!');
            resolve();
          }
        });

        clientA.write(() => {
          clientA.create('Foo', { string: 'Hello, World!' });
        });
      });
    });
  }, */

};
