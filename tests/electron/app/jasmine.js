"use strict";

const Jasmine = require("jasmine");
const JasmineConsoleReporter = require('jasmine-console-reporter');
const path = require("path");
const process = require("process");

const SPEC_PATH = path.join(__dirname, "..", "spec.js");

const ADMIN_TOKEN_PATH = path.join(__dirname, "..", "..", "..", "object-server-for-testing", "admin_token.base64");
process.env.ADMIN_TOKEN_PATH = ADMIN_TOKEN_PATH;

// console.log(require.resolve("realm-spec-helpers"));
exports.execute = (filter) => {
  const jasmine = new Jasmine();

  // The tests expect to be in the realm-js/tests directory
  process.chdir(path.join(__dirname, "..", ".."));

  global.REALM_MODULE_PATH = path.resolve(__dirname, '../node_modules/realm');
  process.env.REALM_ELECTRON_VERSION = process.versions ? process.versions.electron : "unkonwn electron version";

  jasmine.clearReporters();
  jasmine.addReporter(new JasmineConsoleReporter({
    colors: 0,
    cleanStack: 3,
    verbosity: 4,
    activity: false
  }));
  jasmine.execute([ SPEC_PATH ], filter);

  return jasmine;
};
