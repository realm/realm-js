////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

/* eslint-env commonjs */
/* global process */

// Runtime check to provide our Node.js entrypoint instead of requiring end-users to apply a mock
if (typeof process !== "undefined" && typeof process.env?.JEST_WORKER_ID !== "undefined") {
  // Re-naming "require" to obfuscate the call from Metro
  const nodeRequire = require;
  module.exports = nodeRequire("./dist/platform/node/index.js");
} else {
  module.exports = require("./dist/platform/react-native/index.js");
}
