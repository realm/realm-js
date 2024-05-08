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
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { globSync } from "glob";

import { ARCHIVE_INSTALL_PATH, XcodeSDKName, xcode } from "./xcode";

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
const REALM_CORE_PRODUCTS_INSTALL_PATH = `Products${ARCHIVE_INSTALL_PATH}`;

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

type GenerateXcodeProjectOptions = {
  cmakePath: string;
};

export function ensureBuildDirectory() {
  // Ensure the build directory exists
  if (!fs.existsSync(REALM_CORE_BUILD_PATH)) {
    console.log("Creating build directory:", REALM_CORE_BUILD_PATH);
    fs.mkdirSync(REALM_CORE_BUILD_PATH);
  }
}

export function generateXcodeProject({ cmakePath }: GenerateXcodeProjectOptions) {
  assert(fs.existsSync(REALM_CORE_BUILD_PATH), `Expected Xcode project in '${REALM_CORE_BUILD_PATH}'`);
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

type BuildFrameworkOptions = {
  platform: XcodeSDKName;
  configuration: "Release" | "Debug" | "MinSizeRel" | "RelWithDebInfo";
};

export function buildFramework({ platform, configuration }: BuildFrameworkOptions) {
  assert(fs.existsSync(REALM_CORE_BUILD_PATH), `Expected Xcode project in '${REALM_CORE_BUILD_PATH}'`);

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

  console.log(`Using libtool to combine libraries into a single ${REALM_CORE_COMBINED_LIBRARY_NAME}`);
  const archiveInstallPath = path.join(archivePath, REALM_CORE_PRODUCTS_INSTALL_PATH);
  const inputPaths = fs
    .readdirSync(archiveInstallPath)
    .filter((name) => !REALM_CORE_LIBRARY_NAMES_DENYLIST.includes(name))
    .map((name) => path.join(archiveInstallPath, name));
  const combinedArchivePath = path.join(archiveInstallPath, REALM_CORE_COMBINED_LIBRARY_NAME);
  xcode.libtool({
    outputPath: combinedArchivePath,
    inputPaths,
  });
  assert(fs.existsSync(combinedArchivePath), `Expected libtool to emit ${archivePath}`);

  return archivePath;
}

export function collectHeaders() {
  // Delete any existing files
  fs.rmSync(INCLUDE_PATH, { recursive: true, force: true });

  const srcPath = path.join(REALM_CORE_PATH, "src");
  const sourceHeaderPaths = globSync(["**/*.h", "**/*.hpp"], {
    cwd: srcPath,
    ignore: [
      "external/**",
      "win32/**",
      /* c-api */
      "realm.h",
      "realm/object-store/c_api/**",
      /* executables */
      "realm/exec/**",
      /* executables */
      "realm/exec/**",
    ],
  });
  console.log(`Copying ${sourceHeaderPaths.length} headers\n\tfrom ${srcPath}\n\tinto ${INCLUDE_PATH}`);
  for (const headerPath of sourceHeaderPaths) {
    // Create any parent directories
    fs.mkdirSync(path.join(INCLUDE_PATH, path.dirname(headerPath)), { recursive: true });
    fs.copyFileSync(path.join(srcPath, headerPath), path.join(INCLUDE_PATH, headerPath));
  }

  // Collect generated headers from the build directory
  const buildSrcPath = path.join(REALM_CORE_BUILD_PATH, "src");
  const buildHeaderPaths = globSync(["**/*.h", "**/*.hpp"], {
    cwd: buildSrcPath,
    ignore: ["external/**"],
  });
  console.log(`Copying ${buildHeaderPaths.length} generated headers\n\tfrom ${buildSrcPath}\n\tinto ${INCLUDE_PATH}`);
  for (const headerPath of buildHeaderPaths) {
    // Create any parent directories
    fs.mkdirSync(path.join(INCLUDE_PATH, path.dirname(headerPath)), { recursive: true });
    fs.copyFileSync(path.join(buildSrcPath, headerPath), path.join(INCLUDE_PATH, headerPath));
  }
}

export function collectArchivePaths() {
  const archivePaths = globSync([path.join("*.xcarchive")], {
    cwd: REALM_CORE_BUILD_PATH,
    ignore: ["external/**"],
    absolute: true,
  });
  // Filter the archives by the existence of the combined library
  return archivePaths.filter((archivePath) => {
    const combinedLibraryPath = path.join(
      archivePath,
      REALM_CORE_PRODUCTS_INSTALL_PATH,
      REALM_CORE_COMBINED_LIBRARY_NAME,
    );
    return fs.existsSync(combinedLibraryPath);
  });
}

type CreateXCFrameworkOptions = {
  archivePaths: string[];
};

export function createXCFramework({ archivePaths }: CreateXCFrameworkOptions) {
  console.log(`Creating an xcframework from ${archivePaths.length} archives`);
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
