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
                        const namedSub = realm.subscriptions("named-test")[0];
                        TestCase.assertEqual(namedSub.name, "named-test");
                        TestCase.assertEqual(namedSub.name, "Bar");
                        TestCase.assertEqual(namedSub.state, Realm.Sync.SubscriptionState.Pending);
                        TestCase.assertEqual(namedSub.error, '');
                        // TestCase.assertEqual(namedSub.objectType, "ObjectA");
                        // TestCase.assertTrue(namedSub.createdAt >= now && subscription.createdAt < now_plus_2_sec);
                        TestCase.assertEqual(namedSub.updatedAt, subscription.createdAt);
                        TestCase.assertEqual(namedSub.expiresAt, undefined);
                        TestCase.assertEqual(namedSub.timeToLive, undefined);

                        namedSub.timeToLive = 5;
                        TestCase.assertEqual(namedSub.timeToLive, 5);
                        resolve()
                    }
                });
            });
        });
    }
};