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

import { NativeAppEventEmitter, NativeModules } from 'react-native';
import * as RealmTests from 'realm-tests';
import ListViewTest from './listview-test';

RealmTests.registerTests({
    ListViewTest,
});

// Listen for event to run a particular test.
NativeAppEventEmitter.addListener('realm-run-test', (test) => {
    let error;
    try {
        RealmTests.runTest(test.suite, test.name);
    } catch (e) {
        error = '' + e;
    }

    NativeModules.Realm.emit('realm-test-finished', error);
});

// Inform the native test harness about the test suite once it's ready.
setTimeout(() => {
    // The emit() method only exists on iOS, for now.
    if (NativeModules.Realm.emit) {
        NativeModules.Realm.emit('realm-test-names', getTestNames());
    }
}, 0);

export function getTestNames() {
    return RealmTests.getTestNames();
}

export function runTests() {
    let testNames = getTestNames();

    for (let suiteName in testNames) {
        console.log('Starting ' + suiteName);

        for (let testName of testNames[suiteName]) {
            runTest(suiteName, testName);
        }
    }
}

export function runTest(suiteName, testName) {
    RealmTests.runTest(suiteName, 'beforeEach');

    try {
        RealmTests.runTest(suiteName, testName);
        console.log('+ ' + testName);
    }
    catch (e) {
        console.warn('- ' + testName);
        console.warn(e.message || e);
        throw e;
    }
    finally {
        RealmTests.runTest(suiteName, 'afterEach');
    }
}
