'use strict';

const env = jasmine.getEnv();

env.clearReporters();

const jasmineReporters = require('jasmine-reporters');
const junitReporter = new jasmineReporters.JUnitXmlReporter({
    savePath: '.',
    consolidateAll: false
});
env.addReporter(junitReporter);

const JasmineConsoleReporter = require('jasmine-console-reporter');
const consoleReporter = new JasmineConsoleReporter({
  colors: process.platform === 'win32' ? 0 : 2,
  cleanStack: 3,
  verbosity: 4,
  activity: false
});
env.addReporter(consoleReporter);
