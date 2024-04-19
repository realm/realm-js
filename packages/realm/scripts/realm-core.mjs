#!/usr/bin/env node

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

// Disabling the header rule, since its incompatible with the shebang at the top
/* eslint-disable header/header */
/* eslint-disable no-console */
/* eslint-env node */

import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { program } from "commander";
import { globSync } from "glob";

const PACKAGE_PATH = new URL("..", import.meta.url).pathname;
const PACKAGE_JSON_PATH = path.resolve(PACKAGE_PATH, "package.json");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH));
const PACKAGE_VERSION = PACKAGE_JSON.version;

const REALM_CORE_RELATIVE_PATH = "bindgen/vendor/realm-core";
const REALM_CORE_PATH = path.resolve(PACKAGE_PATH, REALM_CORE_RELATIVE_PATH);
const REALM_CORE_DEPENDENCIES_PATH = path.resolve(REALM_CORE_PATH, "dependencies.yml");
const REALM_CORE_DEPENDENCIES = fs.readFileSync(REALM_CORE_DEPENDENCIES_PATH, "utf8");
// We could add a dependency on 'yaml', but it seems a bit overkill for this
const REALM_CORE_VERSION = REALM_CORE_DEPENDENCIES.split("\n")
  .find((line) => line.startsWith("VERSION:"))
  .split(" ")[1];

const IOS_INPUT_FILES_PATH = path.resolve(PACKAGE_PATH, "react-native/ios/input-files.xcfilelist");
const IOS_LIB_PATH = path.resolve(PACKAGE_PATH, "react-native/ios/lib");
const IOS_LIB_NAMES = ["librealm.a", "librealm-sync.a", "librealm-parser.a", "librealm-object-store.a"];

const CDN_BASE_URL = `https://static.realm.io/downloads/realm-js-prebuilds/${PACKAGE_VERSION}`;

function getPrebuildUrl(platform) {
  return `${CDN_BASE_URL}/${platform}/realm-core-${REALM_CORE_VERSION}.tgz`;
}

function checkCmakeVersion(cmakePath) {
  try {
    assert.notEqual(cmakePath.length, 0, "Expected a path to cmake");
    const result = spawnSync(cmakePath, ["--version"], { encoding: "utf8" });
    assert.equal(result.status, 0, `Failed getting cmake version (status was ${result.status}): ${result.output}`);
    const [firstLine] = result.stdout.split("\n");
    const version = firstLine.split(" ").pop();
    console.log("Using cmake version", version);
  } catch (cause) {
    throw new Error("You need to install cmake to build Realm from source", { cause });
  }
}

function actionWrapper(action) {
  return (...args) => {
    try {
      action(...args);
    } catch (err) {
      console.error(`💥 ${err.message}`);
      if (err.cause) {
        console.error(err.cause.message);
      }
      process.exitCode = 1;
    }
  };
}

program.name("realm-core");

program
  .command("podspec-prepare")
  .description("Prepares the package for either prebuild or download")
  .option("--assert-cmake <path>", "Assert the availability of cmake", false)
  .option("--assert-prebuilds", "Assert the existance of prebuilds", false)
  .action(
    actionWrapper(({ assertPrebuilds, assertCmake }) => {
      if (assertCmake !== false) {
        console.log("Asserting cmake");
        checkCmakeVersion(assertCmake);
      }

      if (assertPrebuilds) {
        // TODO: If using prebuilds, check that they're either already downloaded or available online
        // Print an error asking the developer to run "pod install" with REALM_BUILD_FROM_SOURCE=true
        console.log("Asserting Realm Core prebuilds");
        getPrebuildUrl("asd");
      }

      console.log("Generating dummy libs");
      if (!fs.existsSync(IOS_LIB_PATH)) {
        console.log("Creating lib directory", IOS_LIB_PATH);
        fs.mkdirSync(IOS_LIB_PATH);
      }
      for (const libName of IOS_LIB_NAMES) {
        const libPath = path.resolve(IOS_LIB_PATH, libName);
        if (!fs.existsSync(libPath)) {
          console.log("Creating dummy lib", libPath);
          fs.writeFileSync(libPath, Buffer.from([]));
        }
      }

      console.log("Generating input list");
      const inputFiles = globSync(
        [
          "dependencies.yml",
          "tools/build-apple-device.sh",
          "**/*.h",
          "**/*.cpp",
          "**/*.hpp",
          "**/*.cmake",
          "**/CMakeLists.txt",
        ],
        {
          cwd: REALM_CORE_PATH,
          ignore: ["test/**", "_CPack_Packages/**"],
        },
      );
      fs.writeFileSync(
        IOS_INPUT_FILES_PATH,
        inputFiles.map((filePath) => path.join("$(SRCROOT)", REALM_CORE_RELATIVE_PATH, filePath)).join("\n"),
        "utf-8",
      );
    }),
  );

program.parse();
