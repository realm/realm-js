"use strict";

const assert = require("assert");
const path = require("path");
const Application = require("spectron").Application;

let ELECTRON_PATH = path.join(__dirname, "node_modules", ".bin", "electron");
if (process.platform === 'win32') {
  ELECTRON_PATH += '.cmd';
}
const MAIN_PATH = path.join(__dirname, "app", "main.js");
const POLL_LOG_DELAY = 500;

const filterOption = process.argv[2] || null;

const doneMatcher = /Electron process stopped, with status ([-\d]+)/;

const app = new Application({
  path: ELECTRON_PATH,
  args: [ MAIN_PATH ].concat(process.argv.slice(2))
});

console.log("Trying to start an Electron process.");

app.start().then(() => {
  console.log("The following messages are logs from the Electron process:");
  // Keep reading the log, until Jasmine prints "ALL DONE"
  return new Promise((resolve, reject) => {
    const timeout = setInterval(() => {
      app.client.getMainProcessLogs().then((logs) => {
        logs.forEach((msg) => {
          console.log(msg);
          const doneTest = doneMatcher.exec(msg);
          if(doneTest) {
            const statusCode = parseInt(doneTest[1], 10);
            clearTimeout(timeout);
            resolve(statusCode);
          }
        });
        app.client.getWindowCount().then((count) => {
          if(count === 0) {
            const err = new Error("All Electron windows unexpectedly closed.");
            reject(err);
          }
        });
      });
    }, POLL_LOG_DELAY);
  });
}).then((statusCode) => {
  // Exit with the same status as the Electron process
  process.exit(statusCode);
}).catch((error) => {
  // Log any failures
  console.error("Test harness failure:", error.message);
  process.exit(-1);
})
