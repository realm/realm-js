"use strict";

const remote = require("electron").remote;

const options = remote.getGlobal("options");
if (options.runIn === "render") {
  const jasmine = require("realm-tests/jasmine.js");
  jasmine.onComplete((passed) => {
    // Add a delay if this happens too fast, to allow the WebDriver to connect first.
    remote.process.exit(passed ? 0 : -1);
  });
  jasmine.execute(options.specs, options.filter);
}
