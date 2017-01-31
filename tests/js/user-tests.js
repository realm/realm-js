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

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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

function assertIsAuthError(error, code, type) {
  TestCase.assertInstanceOf(error, Realm.Sync.AuthError, 'The API should return an AuthError');
  if (code) {
    TestCase.assertEqual(error.code, code);
  }
  if (type) {
    TestCase.assertEqual(error.type, type);
  }
}

function failOnError(error) {
  if (error) {
    throw new Error(`Error ${error} was not expected`);
  }
}

// Test the given requestFunc, passing it the given callback after it's been wrapped appropriately.
// This function makes sure that errors thrown in the async callback rejects the promise (making tests actually run).
function callbackTest(requestFunc, callback) {
  return new Promise((resolve, reject) => {
    function callbackWrapper() {
      try {
        callback.apply(this, Array.from(arguments));
        resolve();
      }
      catch (e) {
        reject(e);
      }
    }
    requestFunc(callbackWrapper);
  });
}

module.exports = {
  
  testLogout() {
    var username = uuid();
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', username, 'password', callback), (error, user) => {
      failOnError(error);
      assertIsUser(user);

      assertIsSameUser(user, Realm.Sync.User.current);
      user.logout();

      // Is now logged out.
      TestCase.assertUndefined(Realm.Sync.User.current);

      // Can we open a realm with the registered user?
      TestCase.assertThrows(function() {
        var _realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
      });
    })
  },

  testRegisterUser() {
    var username = uuid();
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', username, 'password', callback), (error, user) => {
      failOnError(error);
      assertIsUser(user);

      // Can we open a realm with the registered user?
      var realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
      TestCase.assertInstanceOf(realm, Realm);
    });
  },

  testRegisterExistingUser() {
    var username = uuid();
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', username, 'password', callback), (error, user) => {
      failOnError(error);
      assertIsUser(user);

      Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
        assertIsAuthError(error, 611, 'https://realm.io/docs/object-server/problems/invalid-credentials');
        TestCase.assertUndefined(user);
      });
    });
  }, 

  testRegisterMissingUsername() {
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', undefined, 'password', callback), (error, user) => {
      assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
      TestCase.assertUndefined(user);
    });
  },

  testRegisterMissingPassword() {
    var username = uuid();
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', username, undefined, callback), (error, user) => {
      assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
      TestCase.assertUndefined(user);
    });
  },

  testRegisterServerOffline() {
    var username = uuid();
    // Because it waits for answer this takes some time..
    return callbackTest((callback) => Realm.Sync.User.register('http://fake_host.local', username, 'password', callback), (error, user) => {
      assertIsError(error);
      TestCase.assertUndefined(user);
    });
  },

  testLogin() {
    return new Promise((resolve, _reject) => {
      var username = uuid();
      // Create user, logout the new user, then login
      callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', username, 'password', callback), (error, user) => {
        failOnError(error);
        user.logout();

        Realm.Sync.User.login('http://localhost:9080', username, 'password', (error, user) => {
          failOnError(error);
          assertIsUser(user);

          // Can we open a realm with the logged-in user?
          var realm = new Realm({ sync: { user: user, url: 'realm://localhost:9080/~/test' } });
          TestCase.assertInstanceOf(realm, Realm);
          realm.close();
          resolve();
        });
      });
    });
  },

  testLoginMissingUsername() {
    return callbackTest((callback) => Realm.Sync.User.login('http://localhost:9080', undefined, 'password', callback), (error, user) => {
      assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
      TestCase.assertUndefined(user);
    });
  },

  testLoginMissingPassword() {
    var username = uuid();
    return callbackTest((callback) => Realm.Sync.User.login('http://localhost:9080', username, undefined, callback), (error, user) => {
      assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
      TestCase.assertUndefined(user);
    });
  },

  testLoginNonExistingUser() {
    return callbackTest((callback) => Realm.Sync.User.login('http://localhost:9080', 'does_not', 'exist', callback), (error, user) => {
      assertIsAuthError(error, 611, 'https://realm.io/docs/object-server/problems/invalid-credentials');
      TestCase.assertUndefined(user);
    });
  },

  testLoginServerOffline() {
    var username = uuid();

    // Because it waits for answer this takes some time..
    return new Promise((resolve, reject) => {
      Realm.Sync.User.register('http://fake_host.local', username, 'password', (error, user) => {
        try {
          assertIsError(error);
          TestCase.assertUndefined(user);
          resolve();
        }
        catch (e) { reject(e) }
      });
    });
  },

  testAll() {
    return new Promise((resolve, _reject) => {
      let all;
      all = Realm.Sync.User.all;
      TestCase.assertArrayLength(Object.keys(all), 0);

      callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', uuid(), 'password', callback), (error, user1) => {
        failOnError(error);

        all = Realm.Sync.User.all;
        TestCase.assertArrayLength(Object.keys(all), 1);
        assertIsSameUser(all[user1.identity], user1);

        Realm.Sync.User.register('http://localhost:9080', uuid(), 'password', (error, user2) => {
          failOnError(error);

          all = Realm.Sync.User.all;
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

          resolve();
        });
      });
    });
  },

  testCurrent() {
    return new Promise((resolve, _reject) => {
      TestCase.assertUndefined(Realm.Sync.User.current);

      callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', uuid(), 'password', callback), (error, user1) => {
        failOnError(error);
        assertIsSameUser(Realm.Sync.User.current, user1);

        Realm.Sync.User.register('http://localhost:9080', uuid(), 'password', (error, user2) => {
          failOnError(error);
          TestCase.assertThrows(() => Realm.Sync.User.current, 'We expect Realm.Sync.User.current to throw if > 1 user.');
          user2.logout();

          assertIsSameUser(Realm.Sync.User.current, user1);

          user1.logout();
          TestCase.assertUndefined(Realm.Sync.User.current);

          resolve();
        });
      });
    });
  },

  testManagementRealm() {
    return callbackTest((callback) => Realm.Sync.User.register('http://localhost:9080', uuid(), 'password', callback), (error, user) => {
      failOnError(error);

      let realm = user.openManagementRealm();
      TestCase.assertInstanceOf(realm, Realm);

      let objectSchemaNames = realm.schema.map(o => o.name);
      TestCase.assertArraysEqual(objectSchemaNames, [ 'PermissionChange', 'PermissionOffer', 'PermissionOfferResponse' ]);
    });
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

