"use strict";

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js
const electron = require("electron");
const { app, BrowserWindow } = electron;

// Increasing memory
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const path = require("path");
const url = require("url");

// Keep a global reference of the window object, if you don´t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

app.on("ready", () => {
    // Create the browser window.
    // This needs to happen even if we are not testing the renderer because otherwise the spectron app.start will never
    // resolve ...
    mainWindow = new BrowserWindow({ show: false });

    // Load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true,
    }));

    const runIn = process.argv[2];
    global.options = { runIn };
    if (runIn === "main") {
        require("./mocha.js")("main");
    } else if (runIn !== "renderer") {
        console.error("Expected a --process runtime argument");
    }
});
