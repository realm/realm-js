////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* global REALM_MODULE_PATH */

const Realm = require('realm');
const TestCase = require('./asserts');
let schemas = require('./schemas');

const isElectronProcess = typeof process === 'object' && process.type === 'renderer';
const isNodeProccess = typeof process === 'object' && process + '' === '[object process]' && !isElectronProcess;

const require_method = require;
function node_require(module) {
    return require_method(module);
}

let tmp;
let fs;
let execFile;
let path;

if (isNodeProccess) {
    tmp = node_require('tmp');
    fs = node_require('fs');
    execFile = node_require('child_process').execFile;
    tmp.setGracefulCleanup();
    path = node_require("path");
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getRealm() {
    const AUTH_URL = 'http://localhost:9080';
    const REALM_URL = 'realm://localhost:9080/~/' + uuid().replace("-", "_");
    return new Promise((resolve, reject) => {
        Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((user) => {
                const schemas = [{
                    name: 'ObjectA',
                    properties: {
                        name: { type: 'string'}
                    }
                }];

                const config = user.createConfiguration({
                    schema: schemas,
                    sync: {
                        url: REALM_URL,
                    }
                });
                resolve(new Realm(config));
            });
    });
}

module.exports = {

    testSubscriptionWrapperProperties() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const subscription = realm.objects("ObjectA").subscribe("test");
                TestCase.assertEqual(subscription.name, "test");
                TestCase.assertEqual(subscription.state, Realm.Sync.SubscriptionState.Creating);
                resolve();
            });
        });
    },

    testNamedSubscriptionProperties() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const now = new Date();
                const now_plus_2_sec = new Date(now.getTime() + 2000);
                const sub = realm.objects("ObjectA").subscribe("named-test");
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Pending) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("named-test")[0];
                        TestCase.assertEqual(namedSub.name, "named-test");
                        TestCase.assertEqual(namedSub.state, Realm.Sync.SubscriptionState.Pending);
                        TestCase.assertEqual(namedSub.error, undefined);
                        TestCase.assertEqual(namedSub.objectType, "ObjectA");
                        TestCase.assertTrue(namedSub.createdAt.getTime() >= now.getTime() && namedSub.createdAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.updatedAt.getTime(), namedSub.createdAt.getTime());
                        TestCase.assertEqual(namedSub.expiresAt, null);
                        TestCase.assertEqual(namedSub.timeToLive, null);
                        resolve();
                    }
                });
            });
        });
    },

    testUpdateQuery: function () {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const sub = realm.objects("ObjectA").filtered("name = 'Foo'").subscribe("update-named-sub-query");
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("update-named-sub-query")[0];
                        let updated = namedSub.updatedAt;
                        setTimeout(function() {
                            realm.beginTransaction();

                            // Updating the query must either be a string or a Results objects
                            TestCase.assertThrows(() => namedSub.query = 0);
                            TestCase.assertThrows(() => namedSub.query = true);
    
                            // Updating the query using a string
                            namedSub.query = "truepredicate";
                            TestCase.assertEqual(namedSub.query, "truepredicate");
                            TestCase.assertEqual(namedSub.state, Realm.Sync.SubscriptionState.Pending);
                            TestCase.assertEqual(namedSub.error, undefined);
                            TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());
                            updated = namedSub.updatedAt;
                            
                            setTimeout(function() {
                                // Updating the query using a Results object
                                namedSub.query = realm.objects('ObjectA').filtered('name = "Bar"');
                                TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());
                                realm.commitTransaction();
                                resolve();
                            }, 2);
                        }, 2);
                    }
                });
            });
        });
    },

    testUpdateTtl() {
        return getRealm().then(realm => {
            const sub = realm.objects("ObjectA").filtered("name = 'Foo'").subscribe("update-named-sub-query");
            return new Promise((resolve, reject) => {
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Pending) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("update-named-sub-query")[0];
                        let updated = namedSub.updatedAt;

                        realm.beginTransaction();
                        TestCase.assertEqual(namedSub.expiresAt, null);
                        namedSub.timeToLive = 1000;
                        TestCase.assertEqual(namedSub.timeToLive, 1000);
                        TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());
                        TestCase.assertTrue(namedSub.expiresAt.getTime() < new Date().getTime() + 2000);
                        realm.commitTransaction();

                        resolve();
                    }
                });
            });
        });
    },

    testUpdateReadOnlyProperties() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const sub = realm.objects("ObjectA").subscribe("read-only-test");
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Pending) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("read-only-test")[0];
                        TestCase.assertThrows(() => namedSub.name = "Foo");
                        TestCase.assertThrows(() => namedSub.createdAt = new Date());
                        TestCase.assertThrows(() => namedSub.updatedAt = new Date());
                        TestCase.assertThrows(() => namedSub.expiresAt = new Date());
                        TestCase.assertThrows(() => namedSub.state = 100);
                        TestCase.assertThrows(() => namedSub.error = "boom");
                        resolve();
                    }
                });
            });
        });
    },

    testSubscribeWithTtl() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const now = new Date();
                const now_plus_2_sec = new Date(now.getTime() + 2000);
                const query = realm.objects("ObjectA");
                const sub = query.subscribe({ name: "with-ttl", timeToLive: 1000});
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Pending) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("with-ttl")[0];
                        TestCase.assertTrue(now.getTime() <= namedSub.createdAt.getTime() && namedSub.createdAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.updatedAt.getTime(), namedSub.createdAt.getTime());
                        TestCase.assertTrue(namedSub.expiresAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.timeToLive, 1000);
                        resolve();
                    }
                });
            });
        });
    },

    testSubscribeAndUpdateQuery() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let query1 = realm.objects("ObjectA");
                const sub1 = query1.subscribe("update-query");
                sub1.addListener((subscription1, state1) => {
                    if (state1 === Realm.Sync.SubscriptionState.Pending) {
                        sub1.removeAllListeners();
                        const namedSub = realm.subscriptions("update-query")[0];
                        const update1 = namedSub.updatedAt;
                        setTimeout(function() {
                            let query2 = realm.objects('ObjectA').filtered("name = 'Foo'");
                            const sub2 = query2.subscribe({name: 'update-query', update: true});
                            sub2.addListener((subscription2, state2) => {
                                if (state2 === Realm.Sync.SubscriptionState.Pending) {
                                    sub2.removeAllListeners();
                                    TestCase.assertFalse(query1.description() === query2.description());
                                    TestCase.assertTrue(update1.getTime() < namedSub.updatedAt.getTime());
                                    resolve();
                                }
                            });
                        }, 2);    
                    }
                });
            });
        });
    },

    testSubscribeAndUpdateTtl() {
        return getRealm().then(realm => {
            const query1 = realm.objects("ObjectA");

            return new Promise((resolve, reject) => {
                const sub1 = query1.subscribe({name: "update-query", timeToLive: 1000});
                sub1.addListener((subscription1, state1) => {
                    if (state1 === Realm.Sync.SubscriptionState.Pending) {
                        sub1.removeAllListeners();
                        const namedSub = realm.subscriptions("update-query")[0];
                        const update1 = namedSub.updatedAt;
                        const expires1 = namedSub.expiresAt;
                        const queryDescription = namedSub.query;
                        setTimeout(function() {
                            const sub2 = query1.subscribe({name: 'update-query', update: true, timeToLive: 5000});
                            sub2.addListener((subscription2, state2) => {
                                if (state2 === Realm.Sync.SubscriptionState.Pending) {
                                    sub2.removeAllListeners();
                                    TestCase.assertTrue(update1.getTime() < namedSub.updatedAt.getTime());
                                    TestCase.assertTrue(expires1.getTime() < namedSub.expiresAt.getTime());
                                    TestCase.assertEqual(namedSub.timeToLive, 5000);
                                    TestCase.assertTrue(queryDescription === namedSub.query);
                                    resolve();
                                }
                            });
                            }, 2);
                    }
                });
            });
        });
    },

    testSubscribeWithInvalidOptions() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let query = realm.objects("ObjectA");
                TestCase.assertThrows(() => query.subscribe({ update: true, timeToLive: 1000})); // Missing name
                resolve();
            });
        });
    },

};