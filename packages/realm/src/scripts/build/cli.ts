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

const { env } = process;

import assert from "node:assert";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { Option, program } from "@commander-js/extra-typings";

import * as apple from "./apple";
import * as android from "./android";
import * as xcode from "./xcode";
import { REALM_CORE_PATH, SUPPORTED_CONFIGURATIONS } from "./common";

export { program };

const applePlatformOption = new Option("--platform <name...>", "Platform to build for")
  .makeOptionMandatory()
  .choices([...xcode.SUPPORTED_PLATFORMS, "all", "none"] as const)
  .default(["all"] as const);

const configurationOption = new Option("--configuration <name>", "Build configuration")
  .makeOptionMandatory()
  .choices(SUPPORTED_CONFIGURATIONS)
  .default("Release" as const);

const androidArchOption = new Option("--architecture <name...>", "Architecture to build for")
  .makeOptionMandatory()
  .choices([...android.SUPPORTED_ARCHITECTURES, "all", "infer"] as const)
  .default(["infer"] as const);

function actionWrapper<Args extends unknown[]>(action: (...args: Args) => Promise<void> | void) {
  return async (...args: Args) => {
    try {
      await action(...args);
    } catch (err) {
      process.exitCode = 1;
      if (err instanceof Error) {
        console.error(`ERROR: ${err.stack}`);
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
  .command("build-apple")
  .description("Build native code for Apple platforms")
  .option("--clean", "Delete any build directory first", false)
  .addOption(applePlatformOption)
  .addOption(configurationOption)
  .option("--skip-creating-xcframework", "Skip creating an xcframework from all frameworks in the build directory")
  .option("--skip-collecting-headers", "Skip collecting headers from the build directory and copy them to the SDK")
  .action(
    actionWrapper(
      ({ clean, platform: rawPlatforms, configuration, skipCollectingHeaders, skipCreatingXcframework }) => {
        assert(fs.existsSync(REALM_CORE_PATH), `Expected Realm Core at '${REALM_CORE_PATH}'`);
        const { CMAKE_PATH: cmakePath = execSync("which cmake", { encoding: "utf8" }).trim() } = env;
        const platforms = apple.pickPlatforms(rawPlatforms);

        if (platforms.length > 0) {
          group("Generate Xcode project", () => {
            apple.generateXcodeProject({ cmakePath, clean });
          });
        } else {
          console.log("Skipped generating Xcode project (no platforms to build for)");
        }

        const producedArchivePaths = platforms.map((platform) => {
          return group(`Build ${platform} / ${configuration}`, () => {
            return apple.buildFramework({ platform, configuration });
          });
        });

        if (skipCollectingHeaders) {
          console.log("Skipped collecting headers");
        } else {
          group(`Collecting headers`, () => {
            apple.collectHeaders();
          });
        }

        // Collect the absolute paths of all available archives in the build directory
        // This allows for splitting up the invocation of the build command
        const archivePaths = apple.collectArchivePaths();
        for (const producedArchivePath of producedArchivePaths) {
          // As a sanity check, we ensure all produced archives are passed as input for the creation of the xcframework
          assert(
            archivePaths.includes(producedArchivePath),
            `Expected produced archive '${producedArchivePath}' to be one of the collected paths`,
          );
        }

        if (skipCreatingXcframework) {
          console.log("Skipped creating Xcframework");
        } else {
          group(`Creating xcframework`, () => {
            apple.createXCFramework({ archivePaths });
          });
        }

        console.log("Great success! 🥳");
      },
    ),
  );

program
  .command("build-android")
  .description("Build native code for Android platforms")
  .option("--clean", "Delete any build directory first", false)
  .addOption(androidArchOption)
  .addOption(configurationOption)
  .option("--ndk-version <version>", "The NDK version used when building", android.DEFAULT_NDK_VERSION)
  .option("--skip-collecting-headers", "Skip collecting headers from the build directory and copy them to the SDK")
  .action(
    actionWrapper(({ architecture: rawArchitectures, configuration, ndkVersion, clean }) => {
      assert(fs.existsSync(REALM_CORE_PATH), `Expected Realm Core at '${REALM_CORE_PATH}'`);
      const { ANDROID_HOME, CMAKE_PATH: cmakePath = execSync("which cmake", { encoding: "utf8" }).trim() } = env;
      assert(typeof ANDROID_HOME === "string", "Missing env variable ANDROID_HOME");
      assert(fs.existsSync(ANDROID_HOME), `Expected the Android SDK at ${ANDROID_HOME}`);
      const installNdkCommand = `sdkmanager --install "ndk;${ndkVersion}"`;
      const ndkPath = path.resolve(ANDROID_HOME, "ndk", ndkVersion);
      assert(fs.existsSync(ndkPath), `Missing Android NDK v${ndkVersion} (at ${ndkPath}) - run: ${installNdkCommand}`);

      const architectures = android.pickArchitectures(rawArchitectures);

      architectures.map((architecture) => {
        return group(`Build ${architecture} / ${configuration}`, () => {
          return android.buildArchive({ cmakePath, architecture, configuration, ndkPath, clean });
        });
      });

      console.log("Great success! 🥳");
    }),
  );

if (require.main === module) {
  program.parse();
}
