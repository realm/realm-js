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

const { spawn } = require("child_process");
const path = require("path");
const { MochaRemoteServer } = require("mocha-remote-server");

let ELECTRON_PATH = path.join(__dirname, "node_modules", ".bin", "electron");
if (process.platform === "win32") {
    ELECTRON_PATH += ".cmd";
}

async function run() {
    const mochaConfig = {};

    // Check if an argument for junit path was requested
    const processType = process.argv[2];
    const junitFilePath = process.argv[3];
    if (junitFilePath) {
        mochaConfig.reporter = "mocha-junit-reporter";
        // Probably due to an issue in "mocha-junit-reporter", this needs to be wrapped twice in `reporterOptions`
        mochaConfig.reporterOptions = { reporterOptions: { mochaFile: junitFilePath } };
    }
    // Start the mocha remote server
    const server = new MochaRemoteServer(mochaConfig, {
        id: processType,
        // Listing on all interfaces
        host: "0.0.0.0",
        port: 0,
    });
    await server.start();

    const electronProcess = spawn(
        ELECTRON_PATH,
        [".", processType, server.getUrl()],
        { stdio: "inherit" }
    );

    const electronProcessExit = new Promise((resolve, reject) => {
        process.on("exit", () => {
            electronProcess.kill("SIGHUP");
        });
        electronProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(code);
            }
        });
    });

    const mochaTests = new Promise((resolve, reject) => {
        server.run(resolve);
    });

    await Promise.race([electronProcessExit, mochaTests]);
}

run().then(failures => {
    // Exit with the same status as the Electron process
    process.exit(failures > 0 ? 1 : 0);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error.stack);
    process.exit(1);
});
