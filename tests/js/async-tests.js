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

function createNotificationTest(config, getObservable, addListener, removeListener, messages, expectedCount) {
    return new Promise((resolve, reject) => {
        let realm = new Realm(config);
        let observable = getObservable(realm);
        let worker = new Worker(__dirname + '/worker-tests-script.js', [REALM_MODULE_PATH]); // eslint-disable-line no-undef 

        // Test will fail if it does not receive a change event within a second.
        let timer = setTimeout(() => {
            reject(new Error('Timed out waiting for change notification'));
        }, 5000);

        let cleanup = () => {
            clearTimeout(timer);
            worker.terminate();
        };

        var count = 0;
        var listener = addListener(observable, () => count++, resolve, reject, cleanup);

        messages.push(['echo', 'resolve']);
        var messageIndex = 0;

        worker.onmessage = (message) => {
            if (message.error) {
                reject(message.error);
                cleanup();
            }
            else if (message.result == 'resolve') {
                if (count != expectedCount) {
                    reject('Notification count ' + count + ' not equal to expected count ' + expectedCount);
                }
                else {
                    resolve();
                }
                cleanup();
            }
            else {
                if (message.result == 'removeListener') {
                    removeListener(observable, listener);
                }
                worker.postMessage(messages[messageIndex++]);
            }
        };

        worker.postMessage(messages[messageIndex++]);
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
                    TestCase.assertArraysEqual(changes.insertions, expected[notificationCount][0]);
                    TestCase.assertArraysEqual(changes.deletions, expected[notificationCount][1]);
                    TestCase.assertArraysEqual(changes.modifications, expected[notificationCount][2]);
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
    testChangeNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createNotificationTest(
            config,
            (realm) => realm,
            (realm, increment, resolve, reject, cleanup) => realm.addListener('change', () => {
                try {
                    var objects = realm.objects('TestObject');
                    TestCase.assertEqual(objects.length, 1);
                    TestCase.assertEqual(objects[0].doubleCol, 42);
                    increment();
                } catch (e) {
                    reject(e);
                    cleanup();
                }
            }),
            undefined,
            [[config, 'create', 'TestObject', [{doubleCol: 42}]]],
            1
        );
    },
};

