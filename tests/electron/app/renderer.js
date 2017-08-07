"use strict";

const Jasmine = require("jasmine");
const JasmineConsoleReporter = require('jasmine-console-reporter');
const path = require("path");

const remote = require("electron").remote;

const SPEC_PATH = path.join(__dirname, "..", "spec.js");

const jasmine = new Jasmine();

jasmine.clearReporters();
jasmine.addReporter(new JasmineConsoleReporter({
  colors: 2,
  cleanStack: 3,
  verbosity: 4,
  activity: false
}));
jasmine.onComplete((passed) => {
  // Exit - but wait for the WebDriver to connect
  // Add a delay if this happens too fast, to allow the WebDriver to connect first.
  remote.process.exit(passed ? 0 : -1);
});

jasmine.execute([ SPEC_PATH ]);
