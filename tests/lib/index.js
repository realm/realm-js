/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

var TESTS = {
    ListTests: require('./list-tests'),
    ObjectTests: require('./object-tests'),
    RealmTests: require('./realm-tests'),
    ResultsTests: require('./results-tests'),
    QueryTests: require('./query-tests'),
};

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

exports.runTest = function(suiteName, testName) {
    var testSuite = TESTS[suiteName];
    var testMethod = testSuite && testSuite[testName];

    if (testMethod) {
        testMethod.call(testSuite);
    } else if (!testSuite || !(testName in SPECIAL_METHODS)) {
        throw new Error('Missing test: ' + suiteName + '.' + testName);
    }
};
