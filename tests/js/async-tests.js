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
const Worker = require('./worker');

function createNotificationTest(config, getObservable, registerListener, messages) {
    return new Promise((resolve, reject) => {
        let realm = new Realm(config);
        let observable = getObservable(realm);
        let worker = new Worker(__dirname + '/worker-tests-script.js');

        // Test will fail if it does not receive a change event within a second.
        let timer = setTimeout(() => {
            reject(new Error('Timed out waiting for change notification'));
        }, 1000);

        let cleanup = () => {
            clearTimeout(timer);
            worker.terminate();
        };

        registerListener(observable, resolve, reject, cleanup);

        worker.onmessage = (message) => {
            if (message.error) {
                cleanup();
                reject(message.error);
            }
        };

        for (let message of messages) {
            worker.postMessage(message);
        }
    });
};

function createCollectionChangeTest(config, createCollection, messages, expected) {
    return createNotificationTest(
        config, 
        createCollection, 
        (collection, resolve, reject, cleanup) => {
            var notificationCount = 0;
            collection.addListener((object, changes) => {
                console.log(JSON.stringify(changes));
                try {
                    TestCase.assertArraysEqual(changes.insertions, expected[notificationCount][0]);
                    TestCase.assertArraysEqual(changes.deletions, expected[notificationCount][1]);
                    TestCase.assertArraysEqual(changes.modifications, expected[notificationCount][2]);

                    notificationCount++;
                    if (notificationCount >= expected.length) {
                        resolve();
                        cleanup();
                    }
                } catch (e) {
                    reject(e);
                    cleanup();
                } 
            });
        },
        messages
    );
};

const ListObject = {
    name: 'ListObject',
    properties: {
        list: {type: 'list', objectType: 'TestObject'},
    }
};

const PrimaryListObject = {
    name: 'PrimaryListObject',
    properties: {
        list: {type: 'list', objectType: 'IntPrimaryObject'},
    }
};

module.exports = {
    testChangeNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createNotificationTest(
            config, 
            (realm) => realm, 
            (realm, resolve, reject, cleanup) => realm.addListener('change', () => {
                try {
                    var objects = realm.objects('TestObject');
                    TestCase.assertEqual(objects.length, 1);
                    TestCase.assertEqual(objects[0].doubleCol, 42);
                    resolve();
                } catch (e) {
                    reject(e);
                } finally {
                    cleanup();
                }
            }),
            [[config, 'create', 'TestObject', [{doubleCol: 42}]]]
        );
    },

    testResultsAddNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                return realm.objects('TestObject');
            },
            [
                [config, 'create', 'TestObject', [{ doubleCol: 1 }]],
                [config, 'create', 'TestObject', [{ doubleCol: 2 }, { doubleCol: 3 }]]
            ],
            [
                [[], [], []],
                [[0], [], []],
                [[1, 2], [], []]
            ]
        );
    },

    testResultsDeleteNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                return realm.objects('TestObject');
            },
            [
                [config, 'create', 'TestObject', [[0], [1], [2], [3], [4]]],
                [config, 'delete', 'TestObject', [4]],
                [config, 'delete', 'TestObject', [0, 2]]
            ],
            [
                [[], [], []],
                [[0, 1, 2, 3, 4], [], []],
                [[], [4], []],
                [[0], [0, 2, 3], []]
            ]
        );
    },

    testResultsUpdateNotifications() {
        var config = { schema: [schemas.IntPrimary] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                return realm.objects('IntPrimaryObject');
            },
            [
                [config, 'create', 'IntPrimaryObject', [[0, '0'], [1, '1'], [2, '2']]],
                [config, 'update', 'IntPrimaryObject', [[0, '00'], [2, '22']]]
            ],
            [
                [[], [], []],
                [[0, 1, 2], [], []],
                [[], [], [0, 2]]
            ]
        );
    },

    testListAddNotifications() {
        var config = { schema: [schemas.TestObject, ListObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                let listObject;
                realm.write(() => {
                    listObject = realm.create('ListObject', {list: []})
                });
                return listObject.list;
            },
            [
                [config, 'list_method', 'ListObject', 'list', 'push', {doubleCol: 0}, {doubleCol: 1}]
            ],
            [
                [[], [], []],
                [[0, 1], [], []]
            ]
        );
    },

    testListDeleteNotifications() {
        var config = { schema: [schemas.TestObject, ListObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                let listObject;
                realm.write(() => {
                    listObject = realm.create('ListObject', {list: [[0], [1], [2]]})
                });
                return listObject.list;
            },
            [
                [config, 'list_method', 'ListObject', 'list', 'splice', 1, 2]
            ],
            [
                [[], [], []],
                [[], [1, 2], []]
            ]
        );
    },

    testListSpliceNotifications() {
        var config = { schema: [schemas.TestObject, ListObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                let listObject;
                realm.write(() => {
                    listObject = realm.create('ListObject', {list: [[0], [1], [2]]})
                });
                return listObject.list;
            },
            [
                [config, 'list_method', 'ListObject', 'list', 'splice', 1, 1, [2]]
            ],
            [
                [[], [], []],
                [[1], [1], []]
            ]
        );
    },

    testListUpdateNotifications() {
        var config = { schema: [schemas.IntPrimary, PrimaryListObject] };
        return createCollectionChangeTest(
            config,
            function(realm) {
                let listObject;
                realm.write(() => {
                    listObject = realm.create('PrimaryListObject', {list: [[0, '0'], [1, '1']]})
                });
                return listObject.list;
            },
            [
                [config, 'update', 'IntPrimaryObject', [[1, '11']]]
            ],
            [
                [[], [], []],
                [[], [], [1]]
            ]
        );
    },
};
