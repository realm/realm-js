'use strict';

var jasmineReporters = require('jasmine-reporters');
var junitReporter = new jasmineReporters.JUnitXmlReporter({
    savePath: '.',
    consolidateAll: false
});
jasmine.getEnv().addReporter(junitReporter);

var JasmineConsoleReporter = require('jasmine-console-reporter');
jasmine.getEnv().addReporter(new JasmineConsoleReporter()); 