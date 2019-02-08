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

const { MochaRemoteClient } = require("mocha-remote-client");
const { platform } = require("os");

module.exports = (serverURL, processType) => {
    return new MochaRemoteClient({
        id: processType,
        url: serverURL,
        whenInstrumented: mocha => {
            // Set the Realm global for the tests to use
            global.Realm = require("realm");
            global.fs = require("fs-extra");
            global.path = require("path");
            // Sets the root suite title to include the process type
            global.title = `Electron ${processType} process on ${platform()}`;
            global.environment = {
                electron: process.type === "browser" ? "main" : "renderer",
            };
            // Add the integration test suite
            const testIndexPath = require.resolve("realm-integration-tests/src/index.js");
            mocha.addFile(testIndexPath);
        },
        whenRunning: (runner) => {
            runner.on("end", () => {
                const p = process.type === "renderer" ? require("electron").remote.process : process;
                // Exit the process with the number of failures
                p.exit(runner.failures);
            });
        },
    });
};
