"use strict";

const remote = require("electron").remote;

const options = remote.getGlobal("options");
if (options.runIn === "render") {
  const jasmine = require("./jasmine.js").execute(options.filter);
  jasmine.onComplete((passed) => {
    console.log(`Testing completed with status ${passed ? 0 : -1}`)
  });
}
