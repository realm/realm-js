"use strict";

////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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
const fs = require("fs");
const path = require("path");
const { MochaRemoteServer } = require("mocha-remote-server");

const appPaths = {
    darwin: "dist/mac/realm-electron-tests.app/Contents/MacOS/realm-electron-tests",
    linux: "dist/linux-unpacked/realm-electron-tests",
    win32: "dist/win-unpacked/realm-electron-tests.exe",
};

function determineSpawnParameters(processType, serverUrl) {
    const platform = process.platform;
    const appPath = path.resolve(appPaths[platform]);
    if (fs.existsSync(appPath)) {
        if (platform === "darwin") {
            return {
                command: appPath,
                args: ["--", processType, serverUrl],
            };
        } else {
            throw new Error(`Running tests on ${platform} is not supported yet`);
        }
    } else {
        console.warn("🚧 Running an unpackaged version of the app 🚧");
        return {
            command: path.resolve(__dirname, "node_modules/.bin/electron", process.platform === "win32" ? ".cmd" : ""),
            args: [".", processType, serverUrl],
        };
    }
}

function runElectron(processType, serverUrl) {
    const { command, args } = determineSpawnParameters(processType, serverUrl);
    // Spawn the Electron app
    const appProcess = spawn(command, args, { stdio: "inherit" });
    process.on("exit", () => {
        appProcess.kill("SIGHUP");
    });
    // Return a promise that resolves when the app close
    return new Promise((resolve, reject) => {
        appProcess.on("close", (code) => {
            resolve(code);
        });
    });
}

async function run() {
    const mochaConfig = {};

    const processType = process.argv[2];
    if (processType !== "main" && processType !== "renderer") {
        throw Error("You need to call this with a runtime argument specifying the process type");
    }

    // Check if an argument for junit path was requested
    const junitFilePath = process.argv[3];
    if (junitFilePath) {
        mochaConfig.reporter = "mocha-junit-reporter";
        mochaConfig.reporterOptions = {
            mochaFile: junitFilePath,
        };
    }

    // Start the mocha remote server
    const server = new MochaRemoteServer(mochaConfig, {
        id: processType,
        // Listing on all interfaces
        host: "0.0.0.0",
        port: 0,
    });
    await server.start();

    const electronApp = runElectron(processType, server.getUrl());
    const mochaTests = new Promise((resolve, reject) => {
        server.run(resolve);
    });

    await Promise.all([electronApp, mochaTests]);
}

run().then(failures => {
    // Exit with the same status as the Electron process
    process.exit(failures > 0 ? 1 : 0);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error.stack);
    process.exit(1);
});
