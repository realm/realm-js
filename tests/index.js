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
/* eslint-disable no-console */

'use strict';

const mockery = require('mockery');

function runTests() {
    const RealmTests = require('./js');
    const testNames = RealmTests.getTestNames();
    let passed = true;

    for (let suiteName in testNames) {
        console.log('Starting ' + suiteName);

        for (let testName of testNames[suiteName]) {
            RealmTests.runTest(suiteName, 'beforeEach');

            try {
                RealmTests.runTest(suiteName, testName);
                console.log('+ ' + testName);
            }
            catch (e) {
                console.warn('- ' + testName);
                console.error(e.message, e.stack);
                passed = false;
            }
            finally {
                RealmTests.runTest(suiteName, 'afterEach');
            }
        }
    }

    return passed;
}

if (require.main == module) {
    mockery.enable();
    mockery.warnOnUnregistered(false);
    mockery.registerMock('realm', require('..'));

    if (!runTests()) {
        process.exit(1);
    }
}
