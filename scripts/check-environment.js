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

const fs = require("fs-extra");
const path = require("path");
const exec = require("child_process").execSync;

const packagePath = path.resolve(__dirname, "..");
const packageJsonPath = path.resolve(packagePath, "package.json");
const packageJson = fs.readJSONSync(packageJsonPath);

console.log("\nChecking setup...");

function successLog(msg) {
  console.log(` \x1b[32m✓\x1b[0m ${msg}`);
}

const nodeVersion = exec("node --version", { encoding: "utf8" }).trim();
successLog(`node version is ${nodeVersion}`);

const npmVersion = exec("npm --version", { encoding: "utf8" }).trim();
successLog(`npm version is ${npmVersion}`);

const objectStoreDir = path.resolve(packagePath, "vendor/realm-core");
if (fs.existsSync(objectStoreDir)) {
  successLog("Realm Core submodule is checked out");
} else {
  console.error("Realm Core folder not found. Did you remember to pull submodules?");
  process.exit(1);
}

// Go through workspaces, looking for package-lock.json (which shouldn't be present in a NPM mono-repo)
function checkWorkspaces() {
  let passed = true;
  for (const relativeWorkspacePath of packageJson.workspaces) {
    const workspacePath = path.resolve(packagePath, relativeWorkspacePath);
    const workspaceLockPath = path.resolve(workspacePath, "package-lock.json");
    if (workspacePath !== packagePath && fs.existsSync(workspaceLockPath)) {
      console.error(`⚠️ Unexpected package-lock.json: ${workspaceLockPath}`);
      passed = false;
    }
  }
  return passed;
}

const workspacesPassed = checkWorkspaces();
if (!workspacesPassed) {
  process.exit(1);
}

// TODO: Check ANDROID_NDK and SDK for Android, and XCode for iOS.
