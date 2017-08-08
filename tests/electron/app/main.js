"use strict";

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js

const electron = require("electron");
// Module to control application life.
const app = electron.app;
// Increasing memory
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require("path");
const url = require("url");

const JASMIN_FILTER_KEY = "--filter";

function getJasminFilter() {
  const filterArg = process.argv.find((arg) => arg.indexOf(JASMIN_FILTER_KEY) === 0);
  return filterArg ? filterArg.slice(JASMIN_FILTER_KEY.length + 1) : null;
}

global.jasminOptions = {
  filter: getJasminFilter()
};

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

app.on("ready", () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file:",
    slashes: true
  }));
});

app.on("quit", (e, exitCode) => {
  console.log("Electron process stopped, with status", exitCode);
});
