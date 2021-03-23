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

// Adjust this as the expected execution time increases
const TIMEOUT_MS = 1000 * 30; // 30 seconds

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
            command: require("electron"),
            args: [".", processType, serverUrl, "--enable-logging"],
        };
    }
}

function runElectron(processType, serverUrl) {
    const { command, args } = determineSpawnParameters(processType, serverUrl);
    // Spawn the Electron app
    const env = Object.create(process.env);
    env.ELECTRON_DISABLE_SANDBOX = 1;
    const appProcess = spawn(command, args, { stdio: "inherit", env });
    // If the runner closes, we should kill the Electron app
    process.on("exit", () => {
        appProcess.kill("SIGHUP");
    });
    return appProcess;
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
        // We want to manually start to ensure we can get to the URL
        autoStart: false,
    });
    await server.start();

    // Spawn the electron process
    const appProcess = runElectron(processType, server.getUrl());
    console.log(`Started the Electron app (pid = ${appProcess.pid})`);

    try {
        await new Promise((resolve, reject) => {
            // Succeed after the tests has run
            server.run(resolve);
            // Fail if the electron app closes (before the mocha tests completes)
            appProcess.on("close", (code) => {
                const err = new Error(`Electron app closed before tests completed (code = ${code})`);
                reject(err);
            });
        });
    } finally {
        console.log("Shutting down the Electron app");
        appProcess.kill("SIGKILL");
    }
}

function timeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => {
            const err = new Error(`Timed out after ${ms}ms`);
            reject(err);
        }, ms);
    });
}

Promise.race([
    run(),
    timeout(TIMEOUT_MS),
]).then(failures => {
    // Exit with the same status as the Electron process
    process.exit(failures > 0 ? 1 : 0);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error);
    process.exit(1);
});
