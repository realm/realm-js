////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires  */

const path = require("path");

const tsConfigPath = path.resolve(__dirname, "../src/tests/tsconfig.json");
process.env.TS_NODE_PROJECT = tsConfigPath;
console.log(`Loading TypeScript configuration from ${tsConfigPath}`);

// We can disable no-restricted-globals, since we know this will run on node.js
// eslint-disable-next-line no-restricted-globals
global.__SDK_VERSION__ = "0.0.0-test";
