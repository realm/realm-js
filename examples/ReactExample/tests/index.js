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

'use strict';

import {
    NativeAppEventEmitter,
    NativeModules,
} from 'react-native';

import ExampleTest from './example-test';

const TESTS = {
    ExampleTest,
};

const SPECIAL_METHODS = {
    beforeEach: true,
    afterEach: true,
};

// Listen for event to run a particular test.
NativeAppEventEmitter.addListener('realm-run-test', async ({suite, name}) => {
    let testSuite = TESTS[suite];
    let testMethod = testSuite && testSuite[name];
    let error;

    try {
        if (testMethod) {
            await testMethod.call(testSuite);
        } else if (!testSuite || !(name in SPECIAL_METHODS)) {
            throw new Error('Missing test: ' + suite + '.' + name);
        }
    } catch (e) {
        error = '' + e;
    }

    NativeModules.Realm.emit('realm-test-finished', error);
});

// Inform the native test harness about the test suite once it's ready.
setTimeout(() => {
    NativeModules.Realm.emit('realm-test-names', getTestNames());
}, 0);

function getTestNames() {
    let testNames = {};

    for (let suiteName in TESTS) {
        let testSuite = TESTS[suiteName];
        testNames[suiteName] = Object.keys(testSuite);
    }

    return testNames;
}
