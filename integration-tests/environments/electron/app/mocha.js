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

const { Client } = require("mocha-remote-client");
const { platform } = require("os");

const processType = process.type === "browser" ? "main" : process.type;

console.log("Required Mocha client");

const client = new Client({
  id: processType,
  title: `Electron v${process.versions.electron} ${processType} process on ${platform()}`,
  tests(context) {
    console.log("Loading tests!");
    // Set the Realm global for the tests to use
    global.fs = require("fs-extra");
    global.path = require("path");
    global.environment = {
      ...context,
      electron: processType,
    };
    // Add the integration test suite (in TypeScript)
    require("ts-node/register/transpile-only");
    require("@realm/integration-tests");
  },
});

client.on("error", (err) => {
  console.error("Failure from Mocha Remote Client:", err);
  process.exitCode = 1;
});
