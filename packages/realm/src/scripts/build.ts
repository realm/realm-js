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

/* eslint-disable no-console */
/* eslint-env node */

import assert from "node:assert";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { Option, program } from "@commander-js/extra-typings";
import { globSync } from "glob";

import { XcodeSDKName } from "./xcode";
import {
  buildFramework,
  collectArchivePaths,
  collectHeaders,
  createXCFramework,
  ensureBuildDirectory,
  generateXcodeProject,
} from "./apple";

export { program };

const SUPPORTED_APPLE_PLATFORMS = [
  "iphoneos",
  "iphonesimulator",
  "macosx",
  // "tvos",
  // "tvsimulator",
  // "watchos",
  // "watchsimulator",
  // "xros",
  // "xrsimulator",
  // "maccatalyst",
] as const satisfies readonly XcodeSDKName[];

const { env } = process;

const applePlatformOption = new Option("--platform <name...>", "Platform to build for")
  .makeOptionMandatory()
  .choices([...SUPPORTED_APPLE_PLATFORMS, "all", "none"] as const)
  .default(["all"] as const);

const configurationOption = new Option("--configuration <name>", "Build configuration")
  .makeOptionMandatory()
  .choices(["Release", "Debug", "MinSizeRel", "RelWithDebInfo"] as const)
  .default("Release" as const);

function validatePlatforms(values: readonly (XcodeSDKName | "all" | "none")[]): readonly XcodeSDKName[] {
  if (values.includes("none")) {
    assert(values.length === 1, "Expected 'none' to be the only platform");
    return [];
  } else if (values.includes("all")) {
    return SUPPORTED_APPLE_PLATFORMS;
  } else {
    return values as readonly XcodeSDKName[];
  }
}

const PACKAGE_PATH = path.resolve(__dirname, "../..");

const REALM_CORE_RELATIVE_PATH = "bindgen/vendor/realm-core";
const REALM_CORE_PATH = path.resolve(PACKAGE_PATH, REALM_CORE_RELATIVE_PATH);

const IOS_INPUT_FILES_PATH = path.resolve(PACKAGE_PATH, "react-native/ios/input-files.xcfilelist");

function checkCmakeVersion(cmakePath: string) {
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

function actionWrapper<Args extends unknown[]>(action: (...args: Args) => Promise<void> | void) {
  return async (...args: Args) => {
    try {
      await action(...args);
    } catch (err) {
      process.exitCode = 1;
      if (err instanceof Error) {
        console.error(`ERROR: ${err.message}`);
        if (err.cause instanceof Error) {
          console.error(`CAUSE: ${err.cause.message}`);
        }
      } else {
        throw err;
      }
    }
  };
}

function group<ReturnType>(title: string, callback: () => ReturnType) {
  try {
    if (env.GITHUB_ACTIONS === "true") {
      console.log(`::group::${title}`);
    }
    return callback();
  } finally {
    if (env.GITHUB_ACTIONS === "true") {
      console.log("::endgroup::");
    } else {
      console.log();
    }
  }
}

program.name("build-realm");

program
  .command("podspec-prepare")
  .description("Prepares the package for either prebuild or download")
  .option("--generate-input-files", "Generate input and output lists", false)
  .option("--assert-cmake <path>", "Assert the availability of cmake", false)
  .action(
    actionWrapper(async ({ assertCmake, generateInputFiles }) => {
      assert(fs.existsSync(REALM_CORE_PATH), `Expected Realm Core at '${REALM_CORE_PATH}'`);

      if (assertCmake !== false) {
        console.log("Asserting cmake");
        checkCmakeVersion(assertCmake);
      }

      if (generateInputFiles) {
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
      }
    }),
  );

program
  .command("build-apple")
  .description("Build native code for Apple platforms")
  .addOption(applePlatformOption)
  .addOption(configurationOption)
  .option("--skip-creating-xcframework", "Skip creating an xcframework from all frameworks in the build directory")
  .option("--skip-collecting-headers", "Skip collecting headers from the build directory and copy them to the SDK")
  .action(
    actionWrapper(({ platform: rawPlatforms, configuration, skipCollectingHeaders, skipCreatingXcframework }) => {
      assert(fs.existsSync(REALM_CORE_PATH), `Expected Realm Core at '${REALM_CORE_PATH}'`);
      const { CMAKE_PATH: cmakePath = execSync("which cmake", { encoding: "utf8" }).trim() } = env;
      const platforms = validatePlatforms(rawPlatforms);

      ensureBuildDirectory();

      group("Generate Xcode project", () => {
        if (platforms.length > 0) {
          generateXcodeProject({ cmakePath });
        } else {
          console.log("Skipped generating Xcode project (no platforms to build for)");
        }
      });

      const producedArchivePaths = platforms.map((platform) => {
        return group(`Build ${platform} / ${configuration}`, () => {
          return buildFramework({ platform, configuration });
        });
      });

      group(`Collecting headers`, () => {
        if (skipCollectingHeaders) {
          console.log("Skipped collecting headers");
        } else {
          collectHeaders();
        }
      });

      // Collect the absolute paths of all available archives in the build directory
      // This allows for splitting up the invocation of the build command
      const archivePaths = collectArchivePaths();
      for (const producedArchivePath of producedArchivePaths) {
        // As a sanity check, we ensure all produced archives are passed as input for the creation of the xcframework
        assert(
          archivePaths.includes(producedArchivePath),
          `Expected produced archive '${producedArchivePath}' to be one of the collected paths`,
        );
      }

      group(`Creating xcframework`, () => {
        if (skipCreatingXcframework) {
          console.log("Skipped creating Xcframework");
        } else {
          createXCFramework({ archivePaths });
        }
      });

      console.log("Great success! 🥳");
    }),
  );

if (require.main === module) {
  program.parse();
}
