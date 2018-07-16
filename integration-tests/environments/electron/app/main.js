"use strict";

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js
const electron = require("electron");
const { app, BrowserWindow } = electron;

// Increasing memory
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const path = require("path");
const url = require("url");

const MAIN_PROCESS_KEY = "--process";
const MAIN_FAILURE_EXIT_CODE = 2;
const HARNESS_FAILURE_EXIT_CODE = 1;

function exit(statusCode) {
    // We use a timeout to prevent the app from endlessly restarting if the tests are fast
    setTimeout(() => {
        process.exit(statusCode);
    }, 1000);
}

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

    const filterArg = process.argv.find((arg) => arg.indexOf(MAIN_PROCESS_KEY) === 0);
    if (filterArg) {
        const runIn = filterArg.slice(MAIN_PROCESS_KEY.length + 1).split(",");
        global.options = { runIn };
    } else {
        console.error("Expected a --process runtime argument");
        exit(HARNESS_FAILURE_EXIT_CODE);
    }

    if (global.options.runIn.indexOf("main") !== -1) {
        const mocha = require("./mocha.js");
        mocha.run(failures => {
            exit(failures ? MAIN_FAILURE_EXIT_CODE : 0);
        });
    }
});

app.on("quit", (e, exitCode) => {
    console.log("Electron process stopped, with status", exitCode);
});
