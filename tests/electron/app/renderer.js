"use strict";

const { app } = require("electron");

const remote = require("electron").remote;

process.on("uncaughtException", (error) => {
  console.log(error);
  process.exit(-1);
});

const options = remote.getGlobal("options");
if (options.runIn === "render") {
  const jasmine = require("./jasmine.js").execute(options.filter);
  jasmine.onComplete((passed) => {
    let success = passed ? 0 : -1;
    console.log(`\nTesting completed in renderer process with status ${success}`)
    if (success === -1) {
      process.exit(-1);
    }
  });
}
