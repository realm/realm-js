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

const cp = require("child_process");

// Filtering out any npm related environment variables,
// since they mess up React Natives XCode PhaseScriptExecution
// Specifically the npm_config_prefix makes it impossible execute the build if "npm --prefix" is used by upstream commands.
const filteredEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("npm_")));

function sync(...args) {
  const process = cp.spawnSync("node", [require.resolve("react-native/local-cli/cli.js"), ...args], {
    stdio: ["inherit", "inherit", "inherit"],
    env: filteredEnv,
  });
  if (process.status !== 0) {
    throw new Error(`Failed running "react-native ${args.join(" ")}"`);
  }
  return process;
}

module.exports = { sync };
