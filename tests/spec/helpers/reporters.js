'use strict';

const jasmineReporters = require('jasmine-reporters');
const { SpecReporter } = require('jasmine-spec-reporter');

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
  savePath: '.',
  consolidateAll: false
}));
jasmine.getEnv().addReporter(new SpecReporter({
  spec: {
    displayPending: true
  }
}));
