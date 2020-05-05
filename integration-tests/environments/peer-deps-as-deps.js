////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

const path = require("path");
const fs = require("fs-extra");
const { execSync } = require("child_process");

// For Electron:
//   Ideally we would just call "electron-builder --dir", but "realm" and "realm-integration-tests" must be actual dependencies to be included in the packaged app.
// For React Native:
//   Ideally we would just call "pod install", but "realm" must be actual dependencies to be installed.
// Instead we modify the package.json by moving peerDependencies into dependencies when building the app and restoring the package.json afterwards.

const packageJsonPath = path.resolve("package.json");
if (!fs.existsSync(packageJsonPath)) {
    console.error(`Expected a package.json at ${packageJsonPath}`);
    process.exit(1);
}
const packageJson = fs.readFileSync(packageJsonPath, "utf8");
const parsedPackageJson = JSON.parse(packageJson);

// Merge peerDependencies into dependencies to make "app-builder node-dep-tree --dir ."
const updatedPackageJson = {
    ...parsedPackageJson,
    dependencies: {
        ...parsedPackageJson.dependencies,
        ...parsedPackageJson.peerDependencies,
    },
};

function restorePackageJson() {
    fs.writeFileSync(packageJsonPath, packageJson, "utf8");
    console.log("Restored the package.json");
}

// Restore the package.json when the process exits
process.once("exit", restorePackageJson);
process.once("SIGINT", restorePackageJson);

// Write the updated package.json
console.log("Writing a temporary package.json (with peerDependencies as dependencies)");
fs.writeFileSync(packageJsonPath, JSON.stringify(updatedPackageJson), "utf8");

// Run the command passed as runtime argument
const { argv } = process;
const doubleDashIndex = argv.indexOf("--");
if (doubleDashIndex === -1) {
    console.error("Skipped executing a command since, as no double dash (--) followed by the command was found");
} else {
    const parts = argv.slice(doubleDashIndex + 1, argv.length);
    const command = parts.join(" ");
    console.log(`Executing command (${command})`);
    execSync(command, { stdio: "inherit" });
}
