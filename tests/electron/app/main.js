"use strict";

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js

const electron = require("electron");
const path = require("path");
const url = require("url");

// Module to control application life.
const app = electron.app;
// Increasing memory
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const SPEC_PATH = path.resolve(__dirname, "../spec.js");

const JASMIN_FILTER_KEY = "--filter";
const MAIN_PROCESS_KEY = "--process";

function getProcess() {
  const filterArg = process.argv.find((arg) => arg.indexOf(MAIN_PROCESS_KEY) === 0);
  return filterArg ? filterArg.slice(MAIN_PROCESS_KEY.length + 1) : 'render';
}

const jasmine = require("realm-tests/jasmine.js")
const filter = jasmine.getFilterFromProcess();
const runIn = getProcess();

// Keep a global reference of the window object, if you don´t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

console.log("The following messages are logs from the Electron process:");

app.on("ready", () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false
  });

  global.options = {
    filter,
    specs: [ SPEC_PATH ],
    runIn
  };

  // Load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.resolve(__dirname, "index.html"),
    protocol: "file:",
    slashes: true
  }));

  if (runIn === "main") {
    console.log("Running tests in the main process.");
    jasmine.onComplete((passed) => {
      process.exit(passed ? 0 : -1);
    });
    jasmine.execute(global.options.specs, filter);
  } else if(runIn === "render") {
    console.log("Running tests in the render process.");
  } else {
    throw new Error("Can only run the tests in the 'main' or 'render' process");
  }
});

app.on("quit", (e, exitCode) => {
  console.log("Electron process stopped, with status", exitCode);
});
