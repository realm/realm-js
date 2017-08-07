"use strict";

const assert = require("assert");
const Realm = require("realm");
const RealmTests = require("realm-tests");

describe("Test harness", () => {
  it("runs the test in the browser", () => {
    assert(process.versions.chrome, "Expected a chrome version");
    assert(global.window, "Expected a window constant");

    const userAgent = global.navigator.userAgent;
    assert(userAgent.indexOf("Electron") >= 0, "Expected Electron in the user-agent");
    assert(userAgent.indexOf("Chrome") >= 0, "Expected Chrome in the user-agent");
  });

  it("waits for async tests to complete", (done) => {
    setTimeout(() => {
      done();
    }, 1000);
  });

  it("loads Realm", () => {
    assert(Realm);
    assert.equal(typeof(Realm), "function");
    assert.equal(Realm.name, "Realm");
  });

  /*
  it("fails", (done) => {
    assert(false);
  });
  */
});

// Almost a copy-paste from the ../spec/unit_tests.js - so it might be possible to generalize.

const tests = RealmTests.getTestNames();
for (const suiteName in tests) {
  describe(suiteName, () => {

    beforeAll(done => RealmTests.prepare(done));

    beforeEach(() => RealmTests.runTest(suiteName, 'beforeEach'));

    for (const testName of tests[suiteName]) {
      it(testName, (done) => {
        try {
          let result = RealmTests.runTest(suiteName, testName);
          if (result instanceof Promise) {
            result.then(done, done.fail.bind(done));
          } else {
            done();
          }
        } catch (e) {
          done.fail(e);
        }
      });
    }

    afterEach(() => RealmTests.runTest(suiteName, 'afterEach'));
  });
}
