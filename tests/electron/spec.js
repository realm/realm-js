"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const Realm = require("realm");

describe("Test harness", () => {
  if(global.options && global.options.runIn === "main") {
    it("runs the test in the main process", () => {
      assert(process.versions.chrome, "Expected a chrome version");
      assert(!global.window, "Expected no window constant");
      assert(!global.navigator, "Expected no navigator global");
    });
  } else {
    it("runs the test in the browser process", () => {
      assert(process.versions.chrome, "Expected a chrome version");
      assert(global.window, "Expected a window constant");

      const userAgent = global.navigator.userAgent;
      assert(userAgent.indexOf("Electron") >= 0, "Expected Electron in the user-agent");
      assert(userAgent.indexOf("Chrome") >= 0, "Expected Chrome in the user-agent");
    });
  }

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

require("realm-tests/spec/unit_tests");
