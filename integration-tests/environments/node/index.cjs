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

const os = require("node:os");
const { Client } = require("mocha-remote-client");
const fs = require("fs-extra");
const path = require("path");
const v8 = require("v8");
const vm = require("vm");

v8.setFlagsFromString("--expose_gc");

const client = new Client({
  title: `Node.js v${process.versions.node} on ${os.platform()} (via CommonJS)`,
  tests(context) {
    // Exposing the Realm constructor as a global
    global.fs = fs;
    global.path = path;
    global.environment = { ...context, node: true };
    global.gc = vm.runInNewContext("gc");

    // Add the integration test suite
    require("@realm/integration-tests");
    // Load the Node.js specific part of the integration tests
    require("@realm/integration-tests/node");
  },
});

client.on("error", (err) => {
  console.error("Failure from Mocha Remote Client:", err);
  process.exitCode = 1;
});

global.client = client;

// TODO: Setup a watch to re-run when the tests change
