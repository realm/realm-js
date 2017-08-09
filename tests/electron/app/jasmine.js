"use strict";

const Jasmine = require("jasmine");
const JasmineConsoleReporter = require('jasmine-console-reporter');
const path = require("path");

const SPEC_PATH = path.join(__dirname, "..", "spec.js");

const ADMIN_TOKEN_PATH = path.join(__dirname, "..", "..", "..", "object-server-for-testing", "admin_token.base64");
process.env.ADMIN_TOKEN_PATH = ADMIN_TOKEN_PATH;

// console.log(require.resolve("realm-spec-helpers"));
exports.execute = (filter) => {
  const jasmine = new Jasmine();

  jasmine.clearReporters();
  jasmine.addReporter(new JasmineConsoleReporter({
    colors: 2,
    cleanStack: 3,
    verbosity: 4,
    activity: false
  }));
  jasmine.execute([ SPEC_PATH ], filter);

  return jasmine;
};
