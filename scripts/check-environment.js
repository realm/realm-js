////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;

console.log("Checking setup...");

function successLog(msg) {
  console.log(` \x1b[32m✓\x1b[0m ${msg}`);
}

exec("npm --version", (err, stdout) => {
  const verRegex = /^(\d+\.)?(\d+\.)?(\*|\d+)$/;
  const npmVer = stdout.trim();
  if (!verRegex.test(npmVer)) {
    console.error(`npm --version returned '${npmVer}. Is Node installed?`);
    process.exit(-1);
  }
  successLog(`npm version is ${npmVer}`);

  const objectStoreDir = path.join(__dirname, "..", "vendor", "realm-core");
  if (fs.existsSync(objectStoreDir)) {
    successLog("Realm Core submodule is checked out");
  } else {
    console.error("Realm Core folder not found. Did you remember to pull submodules?");
  }

  // TODO: Check ANDROID_NDK and SDK for Android, and XCode for iOS.
});
