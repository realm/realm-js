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

function createCollectionChangePromise(config, createCollection, messages, expected) {
    return new Promise((resolve, reject) => {
        let realm = new Realm(config);
        let collection = createCollection(realm);
        let worker = new Worker(__dirname + '/worker-tests-script.js');

        // Test will fail if it does not receive a change event within a second.
        let timer = setTimeout(() => {
            reject(new Error('Timed out waiting for change notification'));
        }, 1000);

        let cleanup = () => {
            clearTimeout(timer);
            worker.terminate();
        };

        // Test will pass if it receives a change event and the Realm changed.
        var notificationCount = 0;
        collection.addListener((name, changes) => {
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

module.exports = {
    testChangeNotifications() {
        return new Promise((resolve, reject) => {
            let config = {schema: [schemas.TestObject]};
            let realm = new Realm(config);
            let objects = realm.objects('TestObject');
            let worker = new Worker(__dirname + '/worker-tests-script.js');

            // Test will fail if it does not receive a change event within a second.
            let timer = setTimeout(() => {
                reject(new Error('Timed out waiting for change notification'));
            }, 1000);

            let cleanup = () => {
                clearTimeout(timer);
                worker.terminate();
            };

            // Test will pass if it receives a change event and the Realm changed.
            realm.addListener('change', () => {
                try {
                    TestCase.assertEqual(objects.length, 1);
                    TestCase.assertEqual(objects[0].doubleCol, 42);
                    resolve();
                } catch (e) {
                    reject(e);
                } finally {
                    cleanup();
                }
            });

            worker.onmessage = (message) => {
                if (message.error) {
                    cleanup();
                    reject(message.error);
                }
            };

            worker.postMessage([config, 'create', 'TestObject', { doubleCol: 42 }]);
        });
    },
    testResultsChangeNotifications() {
        var config = { schema: [schemas.TestObject] };
        return createCollectionChangePromise(
            config,
            function(realm) {
                return realm.objects('TestObject');
            },
            [
                [config, 'create', 'TestObject', { doubleCol: 42 }]
            ],
            [
                [[], [], []],
                [[0], [], []]
            ]
        );
        /*
        return new Promise((resolve, reject) => {
            let config = {schema: [schemas.TestObject]};
            let realm = new Realm(config);
            let objects = realm.objects('TestObject');
            let worker = new Worker(__dirname + '/worker-tests-script.js');

            // Test will fail if it does not receive a change event within a second.
            let timer = setTimeout(() => {
                reject(new Error('Timed out waiting for change notification'));
            }, 1000);

            let cleanup = () => {
                clearTimeout(timer);
                worker.terminate();
            };

            // Test will pass if it receives a change event and the Realm changed.
            var first = true;
            objects.addListener((name, changes) => {
                if (first) {
                    TestCase.assertArraysEqual(changes.insertions, []);
                    TestCase.assertArraysEqual(changes.deletions, []);
                    TestCase.assertArraysEqual(changes.modifications, []);

                    first = false;
                    return;
                }

                try {
                    TestCase.assertEqual(objects.length, 1);
                    TestCase.assertArraysEqual(changes.insertions, [0]);
                    TestCase.assertArraysEqual(changes.deletions, []);
                    TestCase.assertArraysEqual(changes.modifications, []);
                    resolve();
                } catch (e) {
                    reject(e);
                } finally {
                    cleanup();
                }
            });

            worker.onmessage = (message) => {
                if (message.error) {
                    cleanup();
                    reject(message.error);
                }
            };

            worker.postMessage([config, 'create', 'TestObject', { doubleCol: 42 }]);
        });*/
    }
};
