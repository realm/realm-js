/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

exports.ListTests = require('./list-tests');
exports.ObjectTests = require('./object-tests');
exports.RealmTests = require('./realm-tests');
exports.ResultsTests = require('./results-tests');
exports.QueryTests = require('./query-tests');

var SPECIAL_METHODS = {
    beforeEach: true,
    afterEach: true,
};

// Only the test suites should be iterable members of exports.
Object.defineProperties(exports, {
    getTestNames: {
        value: function() {
            var testNames = {};

            for (var suiteName in exports) {
                var testSuite = exports[suiteName];

                testNames[suiteName] = Object.keys(testSuite).filter(function(testName) {
                    return !(testName in SPECIAL_METHODS) && typeof testSuite[testName] == 'function';
                });
            }

            return testNames;
        }
    },
    runTest: {
        value: function(suiteName, testName) {
            exports[suiteName][testName]();
        }
    },
});
