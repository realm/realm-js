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

const Realm = require("realm");
const BSON = require("bson");

if (typeof Realm.App !== "undefined" && Realm.App !== null) {
  global.WARNING = "global is not available in React Native. Use it only in tests";
  global.enableSyncTests = process.env.REALM_DISABLE_SYNC_TESTS ? false : true;
}

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const isElectronProcess = typeof process === "object" && process.versions && process.versions.electron;
const require_method = require;
function node_require(module) {
  return require_method(module);
}

if (isNodeProcess && process.platform === "win32") {
  global.enableSyncTests = false;
}

var TESTS = {
  RealmTests: require("./realm-tests"),
  ResultsTests: require("./results-tests"),
  MigrationTests: require("./migration-tests"),
  EncryptionTests: require("./encryption-tests"),
  BsonTests: require("./bson-tests"),
  // Garbagecollectiontests: require('./garbage-collection'),
  SetTests: require("./set-tests"),
};

// If sync is enabled, run the sync tests
if (global.enableSyncTests) {
  //TODO: remove when Atlas App Services test server can be hosted on Mac or other options exists
  if (isNodeProcess) {
    TESTS.SessionTests = require("./session-tests");
    TESTS.UUIDSyncTests = node_require("./uuid-sync-tests");
    TESTS.PartitionValueTests = node_require("./partition-value-tests");
    TESTS.SetSyncTests = node_require("./set-sync-tests");
    TESTS.DictionarySyncTests = node_require("./dictionary-sync-tests");
  }
}

// If on node, run the async tests
if (isNodeProcess && process.platform !== "win32") {
  TESTS.AsyncTests = node_require("./async-tests");
}

var SPECIAL_METHODS = {
  beforeEach: true,
  afterEach: true,
};

exports.getTestNames = function () {
  var testNames = {};

  for (var suiteName in TESTS) {
    var testSuite = TESTS[suiteName];

    testNames[suiteName] = Object.keys(testSuite).filter(function (testName) {
      return !(testName in SPECIAL_METHODS) && typeof testSuite[testName] == "function";
    });
  }

  return testNames;
};

exports.registerTests = function (tests) {
  for (var suiteName in tests) {
    TESTS[suiteName] = tests[suiteName];
  }
};

exports.prepare = function (done) {
  done();
};

exports.runTest = function (suiteName, testName) {
  const testSuite = TESTS[suiteName];
  const testMethod = testSuite && testSuite[testName];

  if (testMethod) {
    Realm.clearTestState();
    var result = testMethod.call(testSuite);

    //make sure v8 GC can collect garbage after each test and does not fail
    if (isNodeProcess || isElectronProcess) {
      if (result instanceof Promise) {
        result.finally(() => global.gc());
        return result;
      } else {
        global.gc();
      }
    }

    return result;
  }

  if (!testSuite || !(testName in SPECIAL_METHODS)) {
    throw new Error(`Missing test: ${suiteName}.${testName}`);
  }
};
