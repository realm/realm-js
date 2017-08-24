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


'use strict';

var Realm = require('realm');
var TestCase = require('./asserts');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function failOnError(error) {
  if (error) {
    throw new Error(`Error ${error} was not expected`);
  }
}

function createUsersWithTestRealms(count) {
  const createUserWithTestRealm = username => new Promise((resolve, reject) => {
    Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
      if (error) {
        reject(error);
      } else {
        new Realm({ sync: { user, url: 'realm://localhost:9080/~/test'}}).close();
        resolve(user);
      }
    })
  });

  // Generate some usernames: ["user1", "user2", ...]
  const usernames = (function f(a, acc) { return (a === 0) ? acc : f(a - 1, ["user" + a, ...acc])})(count, []);

  // And turn them into users and realms
  const userPromises = usernames.map(createUserWithTestRealm);
  return Promise.all(userPromises);
}


module.exports = {
    testApplyAndGetGrantedPermissions() {
      return createUsersWithTestRealms(1)
        .then(([user]) => {
          return user.applyPermissions({ userId: '*' }, `/${user.identity}/test2`, 'Read')
            .then((result) => {
              return user.getGrantedPermissions('Any')
                .then(permissions => {
                  TestCase.assertEqual(permissions[1].path, `/${user.identity}/test`);
                  TestCase.assertEqual(permissions[1].mayRead, true);
                  TestCase.assertEqual(permissions[1].mayWrite, false);
                  TestCase.assertEqual(permissions[1].mayManage, false);
                })
            });
        });
    },

    _testApplyAndGetGrantedPermissions() {
      var username = uuid();
      // Create user, logout the new user, then login
      return new Promise((resolve, reject) => {
        Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
          failOnError(error);
          const r = new Realm({sync: {user, url: 'realm://localhost:9080/~/test'}})
          r.close();

          user.applyPermissions({ userId: '*' }, `/${user.identity}/test`, 'Read')
            .then((result) => {
              return user.getGrantedPermissions('Any')
                .then(permissions => {
                  TestCase.assertEqual(permissions[1].path, `/${user.identity}/test`);
                  TestCase.assertEqual(permissions[1].mayRead, true);
                  TestCase.assertEqual(permissions[1].mayWrite, false);
                  TestCase.assertEqual(permissions[1].mayManage, false);
                  resolve();
                })
            })
            .catch(reject);
        });
      });
    },

    testOfferPermissions() {
      var username1 = uuid();
      var username2 = uuid();
      // Create user, logout the new user, then login
      return new Promise((resolve, reject) => {
        Realm.Sync.User.register('http://localhost:9080', username1, 'password', (error, user1) => {
          failOnError(error);
          const r = new Realm({ sync: { user: user1, url: 'realm://localhost:9080/~/test' } })
          r.close();

          Realm.Sync.User.register('http://localhost:9080', username2, 'password', (error, user2) => {
            user1.offerPermissions(`/${user1.identity}/test`, 'Read')
              .then((token) => {
                return user2.acceptPermissionOffer(token)
                  .then(realmUrl => {
                    TestCase.assertEqual(realmUrl, `/${user1.identity}/test`);
                    return user2.getGrantedPermissions('Any')
                      .then(permissions => {
                        TestCase.assertEqual(permissions[0].path, `/${user1.identity}/test`);
                        TestCase.assertEqual(permissions[0].mayRead, true);
                        TestCase.assertEqual(permissions[0].mayWrite, false);
                        TestCase.assertEqual(permissions[0].mayManage, false);
                        resolve();
                      });
                  });
              })
              .catch(reject);
          });
        });
      });
    },
    
    testInvalidatePermissionOffer() {
      var username1 = uuid();
      var username2 = uuid();
      // Create user, logout the new user, then login
      return new Promise((resolve, reject) => {
        Realm.Sync.User.register('http://localhost:9080', username1, 'password', (error, user1) => {
          failOnError(error);
          const r = new Realm({ sync: { user: user1, url: 'realm://localhost:9080/~/test' } })
          r.close();

          Realm.Sync.User.register('http://localhost:9080', username2, 'password', (error, user2) => {
            user1.offerPermissions(`/${user1.identity}/test`, 'Read')
              .then((token) => {
                return user1.invalidatePermissionOffer(token)
                  .then(() => {
                    // Since we don't yet support notification when the invalidation has gone through,
                    // wait for a bit and hope the server is done processing.
                    setTimeout(() => {
                      user2.acceptPermissionOffer(token)
                        .then(() => reject("User was able to accept an invalid permission offer token"))
                        .catch(error => {
                          try {
                            TestCase.assertEqual(error.message, 'The permission offer is expired.');
                            TestCase.assertEqual(error.statusCode, 701);
                          }
                          catch (e) {
                            reject(e);
                          }
                          resolve();
                        });
                    }, 100);
                  })
              })
              .catch(reject);
          });
        });
      });
    },
}

