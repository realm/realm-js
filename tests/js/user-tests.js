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
const schemas = require('./schemas');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
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

function assertIsError(error, code) {
    TestCase.assertInstanceOf(error, Error, 'The API should return an Error');
    if (code) {
        TestCase.assertEqual(error.code, code);
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

module.exports = {
    testRegisterUser() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                if (error) {
                    reject(error);
                }
                assertIsUser(user);

                // Can we open a realm with the registered user?
                var realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
                TestCase.assertInstanceOf(realm, Realm);
                resolve();
            });
        });
    },

    testRegisterExistingUser() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                if (error) {
                    reject(error);
                }
                assertIsUser(user);

                Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                    assertIsAuthError(error, 613, 'https://realm.io/docs/object-server/problems/existing-account');
                    TestCase.assertUndefined(user);
                    resolve();
                });
            });
        });
    },

    testRegisterMissingUsername() {
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', undefined, 'password', (error, user) => {
                assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testRegisterMissingPassword() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, undefined, (error, user) => {
                assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testRegisterServerOffline() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            // Because it waits for answer this takes some time..
            Realm.Sync.User.register('http://fake_host.local', username, 'password', (error, user) => {
                assertIsError(error, 'ECONNRESET');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testLogin() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            // Create user, logout the new user, then login
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                user.logout();
                Realm.Sync.User.login('http://localhost:9080', username, 'password', (error, user) => {
                    assertIsUser(user);

                    var realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
                    TestCase.assertInstanceOf(realm, Realm);
                    resolve();
                });
            });
        });
    },

    testLoginMissingUsername() {
        return new Promise((resolve, reject) => {
            Realm.Sync.User.login('http://localhost:9080', undefined, 'password', (error, user) => {
                assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testLoginMissingPassword() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.login('http://localhost:9080', username, undefined, (error, user) => {
                assertIsAuthError(error, 602, 'https://realm.io/docs/object-server/problems/missing-parameters');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testLoginNonExistingUser() {
        return new Promise((resolve, reject) => {
            Realm.Sync.User.login('http://localhost:9080', 'does_not', 'exist', (error, user) => {
                assertIsAuthError(error, 612, 'https://realm.io/docs/object-server/problems/unknown-account');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

    testLoginServerOffline() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            // Because it waits for answer this takes some time..
            Realm.Sync.User.register('http://fake_host.local', username, 'password', (error, user) => {
                assertIsError(error, 'ECONNRESET');
                TestCase.assertUndefined(user);
                resolve();
            });
        });
    },

};

