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

function createNotificationTest(config, getObservable, addListener, removeListener, messages, expectedCount) {
    return new Promise((resolve, reject) => {
        let realm = new Realm(config);
        let observable = getObservable(realm);

        // Test will fail if it does not receive a change event within a second.
        let timer = setTimeout(() => {
            reject(new Error('Timed out waiting for change notification'));
        }, 5000);

        let cleanup = () => {
            clearTimeout(timer);
        };

        var messageIndex = 0;
        var count = 0;
        var listener;

        function processNextMessage() {
            var message = messages[messageIndex++];
            let realm = new Realm(message[0]);
            try {
                realm.write(() => {
                    if (message[1] == 'create') {
                        var result = message[3].map((value) => realm.create(message[2], value));
                    }
                    else if (message[1] == 'delete') {
                        let objects = realm.objects(message[2]);
                        objects = message[3].map((index) => objects[index]);
                        realm.delete(objects);
                    }
                    else if (message[1] == 'update') {
                        var result = message[3].map((value) => realm.create(message[2], value, true));
                    }
                    else if (message[1] == 'list_method') {
                        var listObject = realm.objects(message[2])[0];
                        var list = listObject[message[3]];
                        var result = list[message[4]].apply(list, message.slice(5));
                    }
                    else if (message[1] == 'removeListener') {
                        removeListener(observable, listener);
                    }
                    else {
                        reject(new Error('Unknown realm method: ' + message[1]));
                        cleanup();
                    }
                });
            }
            catch(error) {
                reject(error);
                cleanup();
            }
        }

        listener = addListener(observable, () => {
            count++;
            if (messageIndex < messages.length) {
                setTimeout(processNextMessage, 0);
            }
            return count;
        }, resolve, reject, cleanup);
    });
}

function createCollectionChangeTest(config, createCollection, messages, expected, removeAll) {
    return createNotificationTest(
        config,
        createCollection,
        (collection, increment, resolve, reject, cleanup) => {
            var listener = (object, changes) => {
                try {
                    var notificationCount = increment();
                    if (notificationCount > expected.length) {
                        throw new Error('Too many notifications');
                    }

                    var notificationIndex = notificationCount - 1;
                    TestCase.assertArraysEqual(changes.insertions, expected[notificationIndex][0]);
                    TestCase.assertArraysEqual(changes.deletions, expected[notificationIndex][1]);
                    TestCase.assertArraysEqual(changes.modifications, expected[notificationIndex][2]);
                    if (notificationCount == expected.length) {
                        resolve();
                        cleanup();
                    }
                } catch (e) {
                    reject(e);
                    cleanup();
                }
            };
            collection.addListener(listener);
            return listener;
        },
        removeAll ? (observable) => observable.removeAllListeners() :
                    (observable, listener) => observable.removeListener(listener),
        messages,
        expected.length
    );
}

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
    testResultsAddNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangeTest(
            config,
            (realm) => realm.objects('TestObject'),
            [
                [config, 'create', 'TestObject', [{ doubleCol: 1 }]],
                [config, 'create', 'TestObject', [{ doubleCol: 2 }, { doubleCol: 3 }]]
            ],
            [
                [[], [], []],
                [[0], [], []],
                [[1, 2], [], []],
            ]
        );
    },

    testResultsRemoveNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangeTest(
            config,
            (realm) => realm.objects('TestObject'),
            [
                [config, 'create', 'TestObject', [{ doubleCol: 1 }]],
                [config, 'removeListener'],
                [config, 'create', 'TestObject', [{ doubleCol: 2 }, { doubleCol: 3 }]]
            ],
            [
                [[], [], []],
                [[0], [], []],
            ]
        );
    },

    testResultsRemoveAllNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangeTest(
            config,
            (realm) => realm.objects('TestObject'),
            [
                [config, 'create', 'TestObject', [{ doubleCol: 1 }]],
                [config, 'removeListener'],
                [config, 'create', 'TestObject', [{ doubleCol: 2 }, { doubleCol: 3 }]]
            ],
            [
                [[], [], []],
                [[0], [], []],
            ],
            true
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
            (realm) => realm.objects('IntPrimaryObject'),
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

    testListRemoveNotifications() {
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
                [config, 'list_method', 'ListObject', 'list', 'push', {doubleCol: 0}, {doubleCol: 1}],
                [config, 'removeListener'],
                [config, 'list_method', 'ListObject', 'list', 'push', {doubleCol: 0}, {doubleCol: 1}],
            ],
            [
                [[], [], []],
                [[0, 1], [], []]
            ]
        );
    },

    testListRemoveAllNotifications() {
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
                [config, 'list_method', 'ListObject', 'list', 'push', {doubleCol: 0}, {doubleCol: 1}],
                [config, 'removeListener'],
                [config, 'list_method', 'ListObject', 'list', 'push', {doubleCol: 0}, {doubleCol: 1}],
            ],
            [
                [[], [], []],
                [[0, 1], [], []]
            ],
            true
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

