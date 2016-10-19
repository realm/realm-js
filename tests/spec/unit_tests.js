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

const fs = require('fs');
const path = require('path');

const Realm = require('realm');
const RealmTests = require('../js');

// Create this method with appropriate implementation for Node testing.
Realm.copyBundledRealmFiles = function() {
    let sourceDir = path.join(__dirname, '../data');
    let destinationDir = path.dirname(Realm.defaultPath);

    for (let filename of fs.readdirSync(sourceDir)) {
        let src = path.join(sourceDir, filename);
        let dest = path.join(destinationDir, filename);

        // If the destination file already exists, then don't overwrite it.
        try {
            fs.accessSync(dest);
            continue;
        } catch (e) {}

        fs.writeFileSync(dest, fs.readFileSync(src));
    }
};

const tests = RealmTests.getTestNames();
for (const suiteName in tests) {
    describe(suiteName, () => {
        beforeEach(() => RealmTests.runTest(suiteName, 'beforeEach'));

        for (const testName of tests[suiteName]) {
            it(testName, () => {
                try {
                    RealmTests.runTest(suiteName, testName)
                }
                catch (e) {
                    fail(e);
                }

            });
        }

        afterEach(() => RealmTests.runTest(suiteName, 'afterEach'));
    });
}

const asyncTests = require('../js/async-tests');
describe('AsyncTests', () => {
    beforeEach(() => Realm.clearTestState());

    for (const testName in asyncTests) {
        it(testName, (done) => asyncTests[testName]().catch((e) => fail(e)).then(done));
    }

    afterEach(() => Realm.clearTestState());
});
