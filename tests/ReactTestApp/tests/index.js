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

import {NativeEventEmitter, NativeModules} from 'react-native';
import * as RealmTests from 'realm-tests';

const realmTestEmitter = new NativeEventEmitter(
  NativeModules.RealmTestEventEmitter,
);
// Listen for event signalling native is ready to receive test names
realmTestEmitter.addListener('test-names', () => {
  NativeModules.Realm.emit('realm-test-names', getTestNames());
});

// Listen for event to run a particular test.
realmTestEmitter.addListener('run-test', async ({suite, name}) => {
  let error;
  try {
    await RealmTests.runTest(suite, name);
  } catch (e) {
    error = '' + e;
  }

  NativeModules.Realm.emit('realm-test-finished', error);
});
realmTestEmitter.addListener('dummy', () => {});

export function getTestNames() {
  return RealmTests.getTestNames();
}

export async function runTests() {
  let testNames = getTestNames();
  let passed = true;

  for (let suiteName in testNames) {
    console.log('Starting ' + suiteName);

    for (let testName of testNames[suiteName]) {
      try {
        await runTest(suiteName, testName);
      } catch (e) {
        passed = false;
      }
    }
  }

  return passed;
}

export async function runTest(suiteName, testName) {
  await RealmTests.runTest(suiteName, 'beforeEach');

  try {
    await RealmTests.runTest(suiteName, testName);
    console.warn('+ ' + testName);
  } catch (e) {
    console.error('- ' + testName);
    console.error(e.message || e);
    throw e;
  } finally {
    await RealmTests.runTest(suiteName, 'afterEach');
  }
}
