"use strict";

////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

const path = require("path");
const { Application } = require("spectron");
const { MochaRemoteServer } = require("mocha-remote-server");

let ELECTRON_PATH = path.join(__dirname, "node_modules", ".bin", "electron");
if (process.platform === "win32") {
    ELECTRON_PATH += ".cmd";
}
const MAIN_PATH = path.join(__dirname, "app", "main.js");

async function printLogs(app) {
    const messages = await app.client.getMainProcessLogs();
    for (const message of messages) {
        console.log(message);
    }
}

async function run() {
    const mochaConfig = {};

    const runIn = process.argv[2];

    // Check if an argument for junit path was requested
    const junitFilePath = process.argv[3];
    if (junitFilePath) {
        mochaConfig.reporter = "mocha-junit-reporter";
        // Probably due to an issue in "mocha-junit-reporter", this needs to be wrapped twice in `reporterOptions`
        mochaConfig.reporterOptions = { reporterOptions: { mochaFile: junitFilePath } };
    }

    // Start the mocha remote server
    const server = new MochaRemoteServer(mochaConfig, {
        id: runIn,
        port: 0,
    });
    await server.start();
    // Create a spectron handle for the application
    const app = new Application({
        path: ELECTRON_PATH,
        args: [ MAIN_PATH, server.getUrl(), runIn ],
    });
    // Start the app
    await app.start();
    await app.client.waitUntilWindowLoaded();
    // Print any log messages, these may contain errors relevant for the harness
    printLogs(app);
    // Tell the client to run its tests
    const failures = await new Promise((resolve, reject) => {
        server.run(resolve);
    });
    // Print any logs from the process
    if (app.isRunning()) {
        // Print the standard out from the process
        printLogs(app);
    }
    await app.stop();
    // Return the number of failed tests
    return failures;
}

run().then(failures => {
    // Exit with the same status as the Electron process
    process.exit(failures > 0 ? 1 : 0);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error.stack);
    process.exit(1);
});
