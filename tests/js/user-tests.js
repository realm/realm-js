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
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

module.exports = {

  testLogout() {
    const username = uuid();
    return Realm.Sync.User.register('http://localhost:9080', username, 'password').then((user) => {
      assertIsUser(user);

      assertIsSameUser(user, Realm.Sync.User.current);
      user.logout();

      // Is now logged out.
      TestCase.assertUndefined(Realm.Sync.User.current);

      // Can we open a realm with the registered user?
      TestCase.assertThrows(() => new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}}));
    });
  },

  testRegisterUser() {
    const username = uuid();
    return Realm.Sync.User.register('http://localhost:9080', username, 'password').then((user) => {
      // Can we open a realm with the registered user?
      const realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
      TestCase.assertInstanceOf(realm, Realm);
    });
  },

  testRegisterExistingUser() {
    const username = uuid();
    return Realm.Sync.User.register('http://localhost:9080', username, 'password').then((user) => {
      assertIsUser(user);
      return Realm.Sync.User.register('http://localhost:9080', username, 'password')
        .then((user) => { throw new Error(user); })
        .catch((e) => {
            assertIsAuthError(e, 611, "The provided credentials are invalid or the user does not exist.");
        })
    });
  },

  testRegisterMissingUsername() {
    TestCase.assertThrows(() => Realm.Sync.User.register('http://localhost:9080', undefined, 'password'));
  },

  testRegisterMissingPassword() {
    const username = uuid();
    TestCase.assertThrows(() => Realm.Sync.User.register('http://localhost:9080', username, undefined));
  },

  testRegisterServerOffline() {
    const username = uuid();
    // Because it waits for answer this takes some time..
    return Realm.Sync.User.register('http://fake_host.local', username, 'password')
      .catch((e) => {})
      .then((user) => { if (user) { throw new Error('should not have been able to register'); }})
  },

  testLogin() {
      const username = uuid();
      // Create user, logout the new user, then login
      return Realm.Sync.User.register('http://localhost:9080', username, 'password').then((user) => {
        user.logout();
        return Realm.Sync.User.login('http://localhost:9080', username, 'password');
      }).then((user => {
          assertIsUser(user);
          // Can we open a realm with the logged-in user?
          const realm = new Realm({ sync: { user: user, url: 'realm://localhost:9080/~/test' } });
          TestCase.assertInstanceOf(realm, Realm);
          realm.close();
      }))
  },

  testAuthenticateWithPassword() {
    const username = uuid();
    return Realm.Sync.User.register('http://localhost:9080', username, 'password').then((user) => {
      user.logout();
      return Realm.Sync.User.authenticate('http://localhost:9080', 'password', { username: username, password: 'password' });
    }).then((user => {
      assertIsUser(user);
      const realm = new Realm({ sync: { user: user, url: 'realm://localhost:9080/~/test' } });
      TestCase.assertInstanceOf(realm, Realm);
      realm.close();
    }))
  },

  testLoginMissingUsername() {
    TestCase.assertThrows(() => Realm.Sync.User.login('http://localhost:9080', undefined, 'password'));
  },

  testLoginMissingPassword() {
    const username = uuid();
    TestCase.assertThrows(() => Realm.Sync.User.login('http://localhost:9080', username, undefined));
  },

  testLoginNonExistingUser() {
    return Realm.Sync.User.login('http://localhost:9080', 'does_not', 'exist')
      .then((user) => { throw new Error(user); })
      .catch((e) => assertIsAuthError(e, 611, "The provided credentials are invalid or the user does not exist."))
  },

  testLoginServerOffline() {
    const username = uuid();

    // Because it waits for answer this takes some time..
    return Realm.Sync.User.register('http://fake_host.local', username, 'password')
      .then((user) => { throw new Error(user); })
      .catch((e) => assertIsError(e));
  },

  testLoginTowardsMisbehavingServer() {
    const username = uuid();

    // Try authenticating towards a server thats clearly not ROS
    return Realm.Sync.User.register('https://github.com/realm/realm-js', username, 'user')
      .catch((e) => {
        assertIsError(e);
        TestCase.assertEqual(
          e.message,
          "Could not authenticate: Realm Object Server didn't respond with valid JSON"
        );
      });
  },

  testAuthenticateInvalidProvider() {
    return Realm.Sync.User.authenticate('http://localhost:9080', 'FooBar', {})
      .then((user) => { Promise.reject() } )
      .catch((e) => { Promise.resolve() } )
  },

  testAuthenticateJWT() {
    let token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhdXN0aW5femhlbmciLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE1MTI2OTI3NDl9.klca-3wYLe5mGdVk7N7dE9YRIlB1el1Dv6BxZNAKMsJ3Ms4vBTweu4-65kVJftiMrYhmSGY6QtTzqQ-xlLH4XzPd3jYIXlPQ45lxO7PW7EkJNs9m83VdcsJmHRHQ3PRP8V_mx0f2Ks4ga3xZ9IycAQB4q5NXLei_HJk8tRRJccZ6qB5nnAoD48Qu8JOEfhO596Mdoi-QCbH51iJZjgXo4gSRZ4KKK8jU0S6twLj_lf9jehENTqHDdtsRHdyCnICcPcz4AjFrNHEvUrsPkGxXSZ2BCGgDcvsSTVgGNV7rWU4IjH4FaDssenumi50R1QcZh8kiO35s9H6MngQsEm-zApRgd0V9_L3A6Ys47_crmKbunYRsATfMNBn2fKm5tS6RXvM2RN2G_Y9AkGgh2boY42CRy7HOcHby2vQ8IoQ-fZfE5xn_YYktNlKeNiCv3_-i86lANFbmB3tcdScrbjsgO6Tfg3u71VmJ_ZW1_vyMi5vCTEysLXfHG-OA85c3o8-25vcfuX5gIpbU-nMLgPagyn5w7Uazd27uhFfwepP9OMc8jz2JTlQICInLCUdESu8aG5d1F_IPUA5NU_ryPmebqUmyaRVDS8cGChxp0gZDNSiIvaggw8N2JCDGvk-s_PSG2pFGq0f4veYyWGBTHD_iX4a0UrhB471QZplRpMwvu7o'
    return Realm.Sync.User.authenticate('http://localhost:9080', 'jwt', { token: token })
      .then((user) => { 
        TestCase.assertEqual(user.identity, 'austin_zheng')
        Promise.resolve() 
      })
      .catch((e) => { Promise.reject(e) } )
  },

  testAll() {
    const all = Realm.Sync.User.all;
    TestCase.assertArrayLength(Object.keys(all), 0);

    let user1;
    return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then((user) => {
      const all = Realm.Sync.User.all;
      TestCase.assertArrayLength(Object.keys(all), 1);
      assertIsSameUser(all[user.identity], user);
      user1 = user;

      return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password');
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
    return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then((user) => {
      user1 = user;
      assertIsSameUser(Realm.Sync.User.current, user1);

      return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password');
    }).then((user2) => {
      TestCase.assertThrows(() => Realm.Sync.User.current, 'We expect Realm.Sync.User.current to throw if > 1 user.');
      user2.logout();

      assertIsSameUser(Realm.Sync.User.current, user1);

      user1.logout();
      TestCase.assertUndefined(Realm.Sync.User.current);
    });
  },

  testManagementRealm() {
    return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then((user) => {
      let realm = user.openManagementRealm();
      TestCase.assertInstanceOf(realm, Realm);

      TestCase.assertArraysEqual(realm.schema.map(o => o.name),
                                 ['PermissionChange', 'PermissionOffer', 'PermissionOfferResponse']);
    });
  },

  testRetrieveAccount() {
    if (!isNodeProcess) {
      return;
    }

    if (!global.testAdminUserInfo) {
      throw new Error("Test requires an admin user");
    }

    return Realm.Sync.User.login('http://localhost:9080', global.testAdminUserInfo.username, global.testAdminUserInfo.password).then((user) => {
      TestCase.assertTrue(user.isAdmin, "Test requires an admin user");

      return user.retrieveAccount('password', global.testAdminUserInfo.username)
    }).then((account) => {
      TestCase.assertEqual(account.accounts[0].provider_id, global.testAdminUserInfo.username);
      TestCase.assertEqual(account.accounts[0].provider, 'password');
      TestCase.assertTrue(account.is_admin);
      TestCase.assertTrue(account.user_id);
    });
  },

  testRetrieveNotExistingAccount() {
    if (!isNodeProcess) {
      return;
    }

    if (!global.testAdminUserInfo) {
      throw new Error("Test requires an admin user");
    }

    return Realm.Sync.User.login('http://localhost:9080', global.testAdminUserInfo.username, global.testAdminUserInfo.password).then((user) => {
      TestCase.assertTrue(user.isAdmin, "Test requires an admin user");

      let notExistingUsername = uuid();
      return user.retrieveAccount('password', notExistingUsername)
    }).catch(e => {
      TestCase.assertEqual(e.status, 404);
      TestCase.assertEqual(e.code, 612);
      TestCase.assertEqual(e.message, "The account does not exist.");
      TestCase.assertEqual(e.type, "https://realm.io/docs/object-server/problems/unknown-account");
    }).then(account => { if (account) { throw new Error("Retrieving nonexistent account should fail"); }});
  },

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
    const username = uuid();
    return new Promise((resolve) => {
      Realm.Sync.User.register('http://localhost:9080', username, 'password', (error ,user) => {
        failOnError(error);

        const clientA = new Realm({
          path:   'testSynchronizeChangesWithTwoClientsAndOneUser_clientA.realm',
          schema: schema,
          sync:   {
            user: user,
            url:  'http://localhost:9080/~/test',
          },
        });

        const clientB = new Realm({
          path:   'testSynchronizeChangesWithTwoClientsAndOneUser_clientB.realm',
          schema: schema,
          sync:   {
            user: user,
            url:  'http://localhost:9080/~/test',
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
