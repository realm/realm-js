////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

function createUsersWithTestRealms(count) {
  const createUserWithTestRealm = username => new Promise((resolve, reject) => {
    Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
      if (error) {
        reject(error);
      }
      else {
        new Realm({ sync: { user, url: 'realm://localhost:9080/~/test'}}).close();
        resolve(user);
      }
    })
  });

  // Generate some usernames
  const usernames = new Array(count).fill(undefined).map(uuid);

  // And turn them into users and realms
  const userPromises = usernames.map(createUserWithTestRealm);
  return Promise.all(userPromises);
}

function wait(t) {
   return new Promise(resolve => setTimeout(resolve, t));
}

function repeatUntil(fn, predicate) {
    let retries = 0
    function check() {
        if (retries > 3) {
            return Promise.reject(new Error("operation timed out"));
        }
        ++retries;
        return fn().then(x => predicate(x) ? x : wait(100).then(check));
    }
    return check;
}

module.exports = {
    testApplyAndGetGrantedPermissions() {
      return createUsersWithTestRealms(1)
        .then(([user]) => {
          return user.applyPermissions({ userId: '*' }, `/${user.identity}/test`, 'read')
            .then(repeatUntil(() => user.getGrantedPermissions('any'),
                              permissions => permissions.length > 1))
            .then(permissions => {
              TestCase.assertEqual(permissions[1].path, `/${user.identity}/test`);
              TestCase.assertEqual(permissions[1].mayRead, true);
              TestCase.assertEqual(permissions[1].mayWrite, false);
              TestCase.assertEqual(permissions[1].mayManage, false);
            });
        });
    },

    testOfferPermissions() {
      return createUsersWithTestRealms(2)
        .then(([user1, user2]) => {
          return user1.offerPermissions(`/${user1.identity}/test`, 'read')
            .then(token => user2.acceptPermissionOffer(token))
            .then(realmUrl => {
              TestCase.assertEqual(realmUrl, `/${user1.identity}/test`);
              return realmUrl;
            })
            .then(repeatUntil(() => user2.getGrantedPermissions('any'),
                              permissions => permissions.length > 1))
            .then(permissions => {
              TestCase.assertEqual(permissions[1].path, `/${user1.identity}/test`);
              TestCase.assertEqual(permissions[1].mayRead, true);
              TestCase.assertEqual(permissions[1].mayWrite, false);
              TestCase.assertEqual(permissions[1].mayManage, false);
            });
        });
    },

    testInvalidatePermissionOffer() {
      return createUsersWithTestRealms(2)
        .then(([user1, user2]) => {
            user1.offerPermissions(`/${user1.identity}/test`, 'read')
              .then((token) => {
                return user1.invalidatePermissionOffer(token)
                    // Since we don't yet support notification when the invalidation has gone through,
                    // wait for a bit and hope the server is done processing.
                  .then(wait(100))
                  .then(user2.acceptPermissionOffer(token))
                  // We want the call to fail, i.e. the catch() below should be called.
                  .then(() => { throw new Error("User was able to accept an invalid permission offer token"); })
                  .catch(error => {
                    try {
                      TestCase.assertEqual(error.message, 'The permission offer is expired.');
                      TestCase.assertEqual(error.statusCode, 701);
                    }
                    catch (e) {
                      throw new Error(e);
                    }
                  });
              });
          });
    },
}

