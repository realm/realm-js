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

"use strict";

const { MochaRemoteClient } = require("mocha-remote-client");
const { platform } = require("os");

module.exports = (serverURL, processType) => {
    return new MochaRemoteClient({
        id: processType,
        url: serverURL,
        onInstrumented: mocha => {
            // Set the Realm global for the tests to use
            global.Realm = require("realm");
            global.fs = require("fs-extra");
            global.path = require("path");
            // Sets the root suite title to include the process type
            global.title = `Electron v${process.versions.electron} ${processType} process on ${platform()}`;
            global.environment = {
                electron: process.type === "browser" ? "main" : "renderer",
            };
            // Add the integration test suite
            const testIndexPath = require.resolve("realm-integration-tests");
            mocha.addFile(testIndexPath);
        },
    });
};
