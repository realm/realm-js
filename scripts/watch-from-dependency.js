#!/usr/bin/env node

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

"use strict";

const cp = require("child_process");
const cla = require("command-line-args");
const path = require("path");
const fs = require("fs");

const realmPackagePath = path.resolve(__dirname, "..");

const EXCLUDED_PATHS = [
  // Handled by npm installing
  "node_modules",
  // This is handled by the download-realm.js script
  "vendor/realm-*",
  // Useful only for Node.js
  "compiled",
  // No need to care about tests, examples or docs
  "integration-tests",
  "tests",
  "examples",
  "docs",
  "contrib",
];

function readPackageJson(packagePath) {
  const packageJsonPath = path.resolve(packagePath, "package.json");
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8")
  return JSON.parse(packageJsonContent);
}

const watchman = {
  exec(command, ...args) {
    return cp.execFileSync("watchman", ["-j"], {
      encoding: "utf8",
      input: JSON.stringify([command, ...args]),
    });
  },
  watchProject(rootPath) {
    return this.exec("watch-project", rootPath);
  },
  trigger(rootPath, triggerObject) {
    return this.exec("trigger", rootPath, triggerObject);
  },
  triggerDel(rootPath, name) {
    return this.exec("trigger-del", rootPath, name);
  }
};

try {
  const options = cla({
    name: "path", alias: "p",
  });
  
  const watchmanVersion = cp.execSync("watchman --version");
  console.log(`Using watchman v${watchmanVersion}`);
  
  const dependencyPath = path.resolve(options.path);
  // Ensure that a dependency on the "realm" package
  const dependencyPackageJson = readPackageJson(dependencyPath);
  if (Object.keys(dependencyPackageJson.dependencies).includes("realm") === false) {
    throw new Error(`Expected the package (${dependencyPath}) to be depending on "realm"`);
  }
  // Ensure that the "realm" package has already been installed
  const dependencyRealmPath = path.resolve(dependencyPath, "node_modules/realm");
  if (fs.existsSync(dependencyRealmPath) === false) {
    throw new Error(`Expected realm to be installed at ${dependencyRealmPath} - run "npm install" first`);
  }

  // Ensure the "realm" directory is being watched
  console.log(`Ensuring a watch is present for the realm project '${realmPackagePath}'`);
  // Note: Watching a project which is already being watched is a no-op
  watchman.watchProject(realmPackagePath);
  
  // Setting up a trigger
  console.log("Setting a trigger");
  const triggerName = `realm → ${dependencyRealmPath}`;
  watchman.trigger(realmPackagePath, {
    name: triggerName,
    expression: ["match", "**"],
    command: [
      "rsync",
      "--verbose",
      "--archive",
      "--delete",
      ...EXCLUDED_PATHS.map(p => ["--exclude", p]).flat(),
      realmPackagePath + "/",
      dependencyRealmPath + "/",
    ],
  });

  function deleteTrigger() {
    console.log("Deleting trigger");
    watchman.triggerDel(realmPackagePath, triggerName);
  }

  process.on('SIGINT', () => {
    console.log("Caught interrupt signal");
    deleteTrigger();
    process.exit();
  });

  process.on("beforeExit", () => {
    deleteTrigger();
  });

  setInterval(() => {
    // Keeping the process alive ...
  }, 1000);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
