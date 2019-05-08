'use strict';

const jasmineReporters = require('jasmine-reporters');
const SpecReporter = require('jasmine-spec-reporter').SpecReporter;

jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
    savePath: '.',
    consolidateAll: false
}));
jasmine.getEnv().addReporter(new SpecReporter({
  spec: {
    displayPending: true
  }
}));
