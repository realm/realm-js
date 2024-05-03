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

import { globSync } from "glob";

import { BuildConfiguration, XcodeSDKName, xcode } from "./xcode";

const { env } = process;

const PACKAGE_PATH = path.resolve(__dirname, "../..");

const REALM_CORE_RELATIVE_PATH = "bindgen/vendor/realm-core";
const REALM_CORE_PATH = path.resolve(PACKAGE_PATH, REALM_CORE_RELATIVE_PATH);
const REALM_CORE_BUILD_PATH = path.resolve(REALM_CORE_PATH, "build-xcode");
const REALM_CORE_CMAKE_TOOLCHAIN_PATH = path.resolve(REALM_CORE_PATH, "tools/cmake/xcode.toolchain.cmake");
const REALM_CORE_COMBINED_LIBRARY_NAME = "librealm-combined.a";
const REALM_CORE_LIBRARY_NAMES_DENYLIST = [
  "librealm-ffi-static.a",
  "librealm-ffi-static-dbg.a",
  REALM_CORE_COMBINED_LIBRARY_NAME,
];

const REALM_CORE_DEPENDENCIES_PATH = path.resolve(REALM_CORE_PATH, "dependencies.yml");
const REALM_CORE_DEPENDENCIES = fs.readFileSync(REALM_CORE_DEPENDENCIES_PATH, "utf8");
// We could add a dependency on 'yaml', but it seems a bit overkill for this
const REALM_CORE_VERSION_MATCH = REALM_CORE_DEPENDENCIES.match(/^VERSION: ?(.+)$/m);
assert(REALM_CORE_VERSION_MATCH, "Failed to determine Realm Core version");
const REALM_CORE_VERSION = REALM_CORE_VERSION_MATCH[1];

const INCLUDE_PATH = path.resolve(PACKAGE_PATH, "react-native/ios/include");
const XCFRAMEWORK_PATH = path.resolve(PACKAGE_PATH, "react-native/ios/realm-js.xcframework");

const APPLE_DESTINATIONS_PR_PLATFORM = new Map<XcodeSDKName, string[]>([
  ["iphoneos", ["generic/platform=iOS"]],
  ["iphonesimulator", ["generic/platform=iOS Simulator"]],
  ["macosx", ["generic/platform=macOS,variant=Mac Catalyst"]],
]);

function getDestinations(platform: XcodeSDKName) {
  const destinations = APPLE_DESTINATIONS_PR_PLATFORM.get(platform);
  if (!destinations) {
    throw new Error(`Missing destinations for '${platform}'`);
  }
  return destinations;
}

function getDeveloperDir() {
  return env.DEVELOPER_DIR || execSync("xcode-select --print-path", { encoding: "utf8" }).trim();
}

type GenerateXcodeProjectOptions = {
  cmakePath: string;
};

function generateXcodeProject({ cmakePath }: GenerateXcodeProjectOptions) {
  // Ensure the build directory exists
  if (!fs.existsSync(REALM_CORE_BUILD_PATH)) {
    fs.mkdirSync(REALM_CORE_BUILD_PATH);
  }
  // Generate Xcode project
  spawnSync(
    cmakePath,
    [
      "-G",
      "Xcode",
      "-S",
      REALM_CORE_PATH,
      "-B",
      REALM_CORE_BUILD_PATH,
      "--toolchain",
      REALM_CORE_CMAKE_TOOLCHAIN_PATH,
      "-D",
      `REALM_VERSION=${REALM_CORE_VERSION}`,
      "-D",
      "REALM_BUILD_LIB_ONLY=ON",
    ],
    { stdio: "inherit" },
  );
}

type BuildXcframeworkOptions = {
  platforms: readonly XcodeSDKName[];
  configuration: "Release" | "Debug" | "MinSizeRel" | "RelWithDebInfo";
};

function buildXcframework({ platforms, configuration }: BuildXcframeworkOptions) {
  assert(fs.existsSync(REALM_CORE_BUILD_PATH), `Expected Xcode project in '${REALM_CORE_BUILD_PATH}'`);

  const archivePaths = platforms.map((platform) => {
    console.log(`Building archive for '${platform}'`);
    const archivePath = path.join(REALM_CORE_BUILD_PATH, platform + ".xcarchive");
    xcode.archive({
      cwd: REALM_CORE_BUILD_PATH,
      scheme: "ALL_BUILD",
      configuration,
      sdkName: platform,
      archivePath,
      destinations: getDestinations(platform),
    });
    assert(fs.existsSync(archivePath), `Expected xcodebuild to emit ${archivePath}`);
    return archivePath;
  });

  console.log(`Using libtool to combine libraries into a single ${REALM_CORE_COMBINED_LIBRARY_NAME}`);
  for (const archivePath of archivePaths) {
    const archiveInstallPath = path.join(archivePath, "Products/usr/local/lib");
    const inputPaths = fs
      .readdirSync(archiveInstallPath)
      .filter((name) => !REALM_CORE_LIBRARY_NAMES_DENYLIST.includes(name))
      .map((name) => path.join(archiveInstallPath, name));
    xcode.libtool({
      outputPath: path.join(archiveInstallPath, REALM_CORE_COMBINED_LIBRARY_NAME),
      inputPaths,
    });
  }

  // Collect generated headers from the build
  fs.rmSync(INCLUDE_PATH, { recursive: true, force: true });
  const buildSrcPath = path.join(REALM_CORE_BUILD_PATH, "src");
  const headerPaths = globSync(["**/*.h", "**/*.hpp"], {
    cwd: buildSrcPath,
    ignore: ["external/**"],
  });
  for (const headerPath of headerPaths) {
    // Create any parent directories
    fs.mkdirSync(path.join(INCLUDE_PATH, path.dirname(headerPath)), { recursive: true });
    fs.copyFileSync(path.join(buildSrcPath, headerPath), path.join(INCLUDE_PATH, headerPath));
  }

  // Delete any existing xcframework to prevent
  // “librealm-combined.a” couldn’t be copied to “...” because an item with the same name already exists
  // Ideally, it would only be necessary to delete the specific platform+arch, to allow selectively building from source.
  fs.rmSync(XCFRAMEWORK_PATH, { recursive: true, force: true });

  xcode.createXcframework({
    archivePaths,
    libraryNames: [REALM_CORE_COMBINED_LIBRARY_NAME],
    outputPath: XCFRAMEWORK_PATH,
  });
}

export function buildApple(platforms: readonly XcodeSDKName[], configuration: BuildConfiguration) {
  const { CMAKE_PATH: cmakePath = execSync("which cmake", { encoding: "utf8" }).trim() } = env;
  const developerDir = getDeveloperDir();
  console.log(`Building for Apple platforms: ${platforms.join(", ")} using`, {
    cmakePath,
    developerDir,
    REALM_CORE_PATH,
    REALM_CORE_VERSION,
    REALM_CORE_BUILD_PATH,
    REALM_CORE_CMAKE_TOOLCHAIN_PATH,
  });

  generateXcodeProject({ cmakePath });

  buildXcframework({
    platforms,
    configuration,
  });
}
