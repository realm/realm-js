"use strict";

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js

const electron = require("electron");
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require("path");
const url = require("url");

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
