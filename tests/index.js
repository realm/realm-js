/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

exports.ArrayTests = require('./ArrayTests');
exports.ObjectTests = require('./ObjectTests');
exports.RealmTests = require('./RealmTests');
exports.ResultsTests = require('./ResultsTests');

var SPECIAL_METHODS = {
    beforeEach: true,
    afterEach: true,
};

Object.defineProperty(exports, 'getTestNames', {
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
});
