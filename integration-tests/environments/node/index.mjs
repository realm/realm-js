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

import os from "node:os";
import { Client } from "mocha-remote-client";
import fs from "fs-extra";
import path from "path";

import v8 from "node:v8";
import vm from "node:vm";

v8.setFlagsFromString("--expose_gc");

const client = new Client({
  title: `Node.js v${process.versions.node} on ${os.platform()}`,
  async tests(context) {
    // Exposing the Realm constructor as a global
    global.fs = fs;
    global.path = path;
    global.environment = { ...context, node: true };
    global.gc = vm.runInNewContext("gc");

    // Add the integration test suite
    await import("@realm/integration-tests");
    // Load the Node.js specific part of the integration tests
    await import("@realm/integration-tests/node");
  },
});

client.on("error", (err) => {
  console.error("Failure from Mocha Remote Client:", err);
  process.exitCode = 1;
});

global.client = client;

// TODO: Setup a watch to re-run when the tests change
