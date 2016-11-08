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

module.exports = {
    testRegisterUser() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                TestCase.assertEqual(typeof user, 'object');
                TestCase.assertEqual(typeof user.token, 'string');
                TestCase.assertEqual(typeof user.identity, 'string');
                TestCase.assertEqual(user.isAdmin, false);

                var realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
                TestCase.assertNotEqual(realm instanceof Realm);
                resolve();
            });
        });
    },

    testRegisterExistingUser() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                TestCase.assertEqual(typeof user, 'object');
                Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                    TestCase.assertTrue(error instanceof Realm.Sync.AuthError);
                    TestCase.assertEqual(error.code, 613);
                    TestCase.assertEqual(error.type, 'https://realm.io/docs/object-server/problems/existing-account');
                    TestCase.assertEqual(user, undefined);
                    resolve();
                });
            });
        });
    },

    testRegisterInvalidUsername() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', undefined, 'password', (error, user) => {
                TestCase.assertTrue(error instanceof Realm.Sync.AuthError);
                TestCase.assertEqual(error.code, 602);
                TestCase.assertEqual(error.type, 'https://realm.io/docs/object-server/problems/missing-parameters');
                TestCase.assertEqual(user, undefined);
                resolve();
            });
        });
    },

    testLogin() {
        var username = uuid();
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
                user.logout();
                //TestCase.assertEqual(Realm.Sync.User.all.length, 0);

                Realm.Sync.User.login('http://localhost:9080', username, 'password', (error, user) => {
                    TestCase.assertEqual(typeof user, 'object');
                    TestCase.assertEqual(typeof user.token, 'string');
                    TestCase.assertEqual(typeof user.identity, 'string');
                    TestCase.assertEqual(user.isAdmin, false);

                    var realm = new Realm({sync: {user: user, url: 'realm://localhost:9080/~/test'}});
                    TestCase.assertNotEqual(realm instanceof Realm);

                    //TestCase.assertEqual(Realm.Sync.User.all.length, 1);

                    resolve();
                });
            });
        });
    },
};

