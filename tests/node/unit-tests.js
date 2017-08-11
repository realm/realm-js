"use strict";

const path = require("path");

const SPEC_PATH = require.resolve("realm-tests/spec/unit_tests.js");
const JASMINE_SPEC_PATH = path.resolve(__dirname, "node_modules", "realm-tests", "spec");
const JASMINE_CONFIG_PATH = require.resolve("realm-tests/spec/support/jasmine.json");

const jasmine = require("realm-tests/jasmine.js");
jasmine.loadConfigFile(JASMINE_CONFIG_PATH);
jasmine.execute([ SPEC_PATH ], jasmine.getFilterFromProcess());
