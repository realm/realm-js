#!/usr/bin/env node
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

const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const Watchman = require("fb-watchman");

const EXCLUDED_PATHS = [
  // Handled by npm installing in the application package
  "react-native/node_modules",
  // Skipping the Pods of the react-native project as these are not used by the application package
  "react-native/ios/Pods",
  // This is handled by the download-realm.js script
  "vendor/realm-*",
];

function readPackageJson(packagePath) {
  const packageJsonPath = path.resolve(packagePath, "package.json");
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  return JSON.parse(packageJsonContent);
}

const realmPackagePath = path.resolve(__dirname, "..");
const realmPackageJson = readPackageJson(realmPackagePath);
const realmPackageFileGlobs = realmPackageJson.files.map((p) => {
  const resolvedPath = path.resolve(realmPackagePath, p);
  if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isDirectory()) {
    return p + "/**";
  } else {
    return p;
  }
});

const watchman = {
  client: new Watchman.Client(),
  command(...args) {
    // Wrap the command API
    return new Promise((resolve, reject) => {
      this.client.command(args, (err, resp) => {
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  },
  watchProject(rootPath) {
    return this.command("watch-project", rootPath);
  },
  trigger(rootPath, triggerObject) {
    return this.command("trigger", rootPath, triggerObject);
  },
  triggerDel(rootPath, name) {
    return this.command("trigger-del", rootPath, name);
  },
  subscribe(rootPath, name, subscriptionObject) {
    return this.command("subscribe", rootPath, name, subscriptionObject);
  },
};

async function run(dependencyPath) {
  // Ensure that a dependency on the "realm" package
  const dependencyPackageJson = readPackageJson(dependencyPath);
  if (Object.keys(dependencyPackageJson.dependencies).includes("realm") === false) {
    console.warn(`Expected the package (${dependencyPath}) to be depending on "realm"`);
  }
  // Ensure that the "realm" package has already been installed
  const dependencyRealmPath = path.resolve(dependencyPath, "node_modules/realm");
  if (fs.existsSync(dependencyRealmPath) === false) {
    throw new Error(`Expected realm to be installed at ${dependencyRealmPath} - run "npm install" first`);
  }

  // Ensure the "realm" directory is being watched
  console.log(`Watching the realm project '${realmPackagePath}'`);
  // Note: Watching a project which is already being watched is a no-op
  const { watch: rootPath } = await watchman.watchProject(realmPackagePath);

  // Register a listner to handle changes
  watchman.client.on("subscription", (resp) => {
    if (resp.canceled) {
      console.log("💥 Subscription cancelled ...");
      process.exit();
    } else if (resp.is_fresh_instance) {
      console.log(`🚀 Performing initial sync on ${resp.files.length} files`);
    } else {
      console.log(`🚀 Performing sync: ${resp.files.length} file(s) changed`);
    }
    cp.spawnSync(
      "rsync",
      [
        // "--verbose",
        "--progress",
        "--archive",
        "--delete",
        ...EXCLUDED_PATHS.map((p) => ["--exclude", p]).flat(),
        // The file or directory itself
        ...realmPackageJson.files.map((f) => ["--include", f]).flat(),
        // Any files under this
        ...realmPackageJson.files.map((f) => ["--include", f + "/**"]).flat(),
        // Exclude anything that was not explicitly included
        "--exclude",
        "*",
        realmPackagePath + "/",
        dependencyRealmPath + "/",
      ],
      { stdio: "inherit" },
    );
    console.log("💤 Waiting for changes\n");
  });

  // Create a subscription
  const subscriptionName = `realm → ${dependencyRealmPath}`;
  console.log("Creating subscription ...\n");
  await watchman.subscribe(rootPath, subscriptionName, {
    expression: [
      "allof",
      // Include all the files included by the package
      ["anyof", ...realmPackageFileGlobs.map((pattern) => ["match", pattern, "wholename"])],
      ...EXCLUDED_PATHS.map((p) => ["not", ["match", p + "/**", "wholename"]]),
    ],
    fields: ["name"],
  });
}

if (module.parent === null) {
  if (process.argv.length < 3) {
    throw new Error("Expected path to a dependent package");
  }
  const lastArg = process.argv[process.argv.length - 1];
  const dependencyPath = path.resolve(lastArg);
  run(dependencyPath).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
