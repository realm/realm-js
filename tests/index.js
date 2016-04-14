'use strict';

const mockery = require('mockery');

function runTests() {
    const RealmTests = require('./js');
    const testNames = RealmTests.getTestNames();

    for (let suiteName in testNames) {
        let testSuite = RealmTests[suiteName];

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
            }
            finally {
                RealmTests.runTest(suiteName, 'afterEach');
            }
        }
    }
}

if (require.main == module) {
    mockery.enable();
    mockery.warnOnUnregistered(false);
    mockery.registerMock('realm', require('..'));

    runTests();
}
