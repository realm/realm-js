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

function promisifiedRegister(server, username, password) {
    return new Promise((resolve, reject) => {
        Realm.Sync.User.register(server, username, password, (error, user) => {
            if (error) {
                reject(error);
            } else {
                resolve(user);
            }
        });
    });
}

function wait(delay) {
    return new Promise((resolve, reject) => setTimeout(resolve, delay));
}

module.exports = {
    testLocalRealmHasNoSession() {
        let realm = new Realm();
        TestCase.assertNull(realm.syncSession);
    },

    testProperties() {
        return promisifiedRegister('http://localhost:9080', uuid(), 'password').then(user => {
            let config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' } };
            let realm = new Realm(config);
            let session = realm.syncSession;

            TestCase.assertInstanceOf(session, Realm.Sync.Session);
            TestCase.assertEqual(session.user.identity, user.identity);
            TestCase.assertEqual(session.config.url, config.sync.url);
            TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
            TestCase.assertUndefined(session.url);
            TestCase.assertEqual(session.state, 'active');

            // give the session enough time to refresh its access token and bind itself
            let timeout = 500;
            if (typeof window !== 'undefined') {
                timeout = 2500; // need a longer timeout under React Native because remote debugging
            }
            return wait(timeout).then(() => {
                TestCase.assertEqual(session.url, `realm://localhost:9080/${user.identity}/myrealm`);
            });
        });
    },

    testErrorHandling() {
        return promisifiedRegister('http://localhost:9080', uuid(), 'password').then(user => {
            let errors = [];
            let config = { sync: { user,
                url: 'realm://localhost:9080/~/myrealm',
                error: (sender, error) => errors.push([sender, error])
            } };
            let realm = new Realm(config);
            let session = realm.syncSession;

            TestCase.assertEqual(session.config.error, config.sync.error);
            session._simulateError(123, 'simulated error');

            return wait(100).then(() => {
                TestCase.assertArrayLength(errors, 1);
                TestCase.assertEqual(errors[0][0].config.url, session.config.url);
                TestCase.assertEqual(errors[0][1].message, 'simulated error');
                TestCase.assertEqual(errors[0][1].code, 123);
            });
        });
    }
}