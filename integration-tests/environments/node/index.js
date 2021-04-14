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

const os = require("os");
const { Client } = require("mocha-remote-client");

const client = new Client({
  title: `Node.js v${process.versions.node} on ${os.platform()}`,
  tests() {
    // Exposing the Realm constructor as a global
    global.fs = require("fs-extra");
    global.path = require("path");
    global.environment = { node: true };
    global.fetch = require("node-fetch");

    // Require the tests
    require("realm-integration-tests");
  }
});
 
// TODO: Setup a watch to re-run when the tests change
