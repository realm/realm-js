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

            worker.postMessage({
                action: 'create',
                config: config,
                type: 'TestObject',
                properties: {
                    doubleCol: 42,
                }
            });
        });
    }
};
