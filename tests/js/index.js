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

var Realm = require('realm');

var TESTS = {
    ListTests: require('./list-tests'),
    LinkingObjectsTests: require('./linkingobjects-tests'),
    ObjectTests: require('./object-tests'),
    RealmTests: require('./realm-tests'),
    ResultsTests: require('./results-tests'),
    QueryTests: require('./query-tests'),
    MigrationTests: require('./migration-tests')
};

// encryption is not supported on windows
if (!(typeof process === 'object' && process.platform === 'win32')) {
    TESTS.EncryptionTests = require('./encryption-tests');
}

// If sync is enabled, run the sync tests
if (Realm.Sync) {
    TESTS.UserTests = require('./user-tests');
    TESTS.SessionTests = require('./session-tests');
}

function node_require(module) { return require(module); }

// If on node, run the async tests
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
if (isNodeProcess) {
    TESTS.AsyncTests = node_require('./async-tests');
}

var SPECIAL_METHODS = {
    beforeEach: true,
    afterEach: true,
};

exports.getTestNames = function() {
    var testNames = {};

    for (var suiteName in TESTS) {
        var testSuite = TESTS[suiteName];

        testNames[suiteName] = Object.keys(testSuite).filter(function(testName) {
            return !(testName in SPECIAL_METHODS) && typeof testSuite[testName] == 'function';
        });
    }

    return testNames;
};

exports.registerTests = function(tests) {
    for (var suiteName in tests) {
        TESTS[suiteName] = tests[suiteName];
    }
};

exports.prepare = function(done) {
    if (!isNodeProcess || global.testAdminUserInfo) {
        done();
    }

    let helper = require('./admin-user-helper');
    helper.createAdminUser().then(userInfo => {
        global.testAdminUserInfo = userInfo;
        done();
    })
        .catch(error => {
            console.error("Error running admin-user-helper: " + error);
            done();
        });
};

exports.runTest = function(suiteName, testName) {
    var testSuite = TESTS[suiteName];
    var testMethod = testSuite && testSuite[testName];

    if (testMethod) {
        // Start fresh in case of a crash in a previous run.
        Realm.clearTestState();
        console.log("Starting test " + testName);
        var promise;
        try {
            promise = testMethod.call(testSuite);

            // If the test returns a promise, then clear state on success or failure.
            if (promise) {
                promise.then(
                    function() { Realm.clearTestState(); },
                    function() { Realm.clearTestState(); }
                );
            }

            return promise;
        } finally {
            // Synchronously clear state if the test is not async.
            if (!promise) {
                Realm.clearTestState();
            }
        }
    } else if (!testSuite || !(testName in SPECIAL_METHODS)) {
        throw new Error('Missing test: ' + suiteName + '.' + testName);
    }
}
