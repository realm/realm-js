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

const Realm = require('realm');

if( typeof Realm.Sync !== 'undefined' && Realm.Sync !== null ) {
    global.WARNING = "global is not available in React Native. Use it only in tests";
    global.enableSyncTests = true;
}

const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isElectronProcess = isNodeProcess && (process.type === 'renderer' || (process.versions && process.versions.electron));
const require_method = require;
function node_require(module) { return require_method(module); }

if (isNodeProcess && process.platform === 'win32') {
    global.enableSyncTests = false;
}

// catching segfaults during testing can help debugging
//uncomment to enable segfault handler
//if (isNodeProcess) {
    //const SegfaultHandler = node_require('segfault-handler');
    //SegfaultHandler.registerHandler("crash.log");
//}

var TESTS = {
    ListTests: require('./list-tests'),
    LinkingObjectsTests: require('./linkingobjects-tests'),
    ObjectTests: require('./object-tests'),
    RealmTests: require('./realm-tests'),
    ResultsTests: require('./results-tests'),
    QueryTests: require('./query-tests'),
    MigrationTests: require('./migration-tests'),
    EncryptionTests: require('./encryption-tests'),
    ObjectIDTests: require('./object-id-tests'),
    AliasTests: require('./alias-tests'),
    // Garbagecollectiontests: require('./garbage-collection'),
};

// If sync is enabled, run the sync tests
if (global.enableSyncTests) {
    TESTS.OpenBehaviorTests = require('./open-behavior-tests');
    TESTS.UserTests = require('./user-tests');
    TESTS.SessionTests = require('./session-tests');
    TESTS.SubscriptionTests = require('./subscription-tests');

    if (isNodeProcess && !isElectronProcess) {
        // FIXME: Permission tests currently fail in react native
        TESTS.PermissionTests = require('./permission-tests');
        node_require('./adapter-tests');
        node_require('./notifier-tests');
    }
}

// If on node, run the async tests
if (isNodeProcess && process.platform !== 'win32') {
    TESTS.AsyncTests = node_require('./async-tests');
}

if (global.enableSyncTests) {
    // Ensure that the sync manager is initialized as initializing it
    // after calling clearTestState() doesn't work
    Realm.Sync.User.all;
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
    if (!global.enableSyncTests || !isNodeProcess || global.testAdminUserInfo) {
        done();
        return;
    }

    require('./admin-user-helper')
        .createAdminUser()
        .then(userInfo => {
            global.testAdminUserInfo = userInfo;
            done();
        })
        .catch(error => {
            console.error("Error running admin-user-helper", error);
            done.fail(error);
        });
};

exports.runTest = function(suiteName, testName) {
    const testSuite = TESTS[suiteName];
    const testMethod = testSuite && testSuite[testName];

    if (testMethod) {
        Realm.clearTestState();
        console.warn("Starting test " + testName);
        var result = testMethod.call(testSuite);

        //make sure v8 GC can collect garbage after each test and does not fail
        global.gc();
        
        return result;
    }

    if (!testSuite || !(testName in SPECIAL_METHODS)) {
        throw new Error(`Missing test: ${suiteName}.${testName}`);
    }
}