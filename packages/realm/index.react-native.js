////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

/* eslint-disable @typescript-eslint/no-var-requires -- We're exporting using CJS assignment */
/* eslint-env commonjs */

// eslint-disable-next-line no-undef -- In React Native, process is not defined, but in Jest it is
const isJest = process?.env?.JEST_WORKER_ID !== undefined;

let entryPoint;

if (isJest) {
  // Define a require function that will load the node bundle
  // otherwise, metro will preemptively load the node bundle
  const nodeRequire = require;
  // Jest is running, use the node bundle
  entryPoint = nodeRequire("./dist/bundle.node");
} else {
  entryPoint = require("./dist/bundle.react-native");
}

module.exports = entryPoint.Realm;
