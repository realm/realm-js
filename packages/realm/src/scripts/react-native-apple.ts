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

import { ARCHIVE_INSTALL_PATH, SUPPORTED_PLATFORMS, XcodeSDKName, xcode } from "./xcode";
import {
  REALM_CORE_LIBRARY_NAMES_DENYLIST as COMMON_REALM_CORE_LIBRARY_NAMES_DENYLIST,
  PACKAGE_PATH,
  REALM_CORE_PATH,
  REALM_CORE_VERSION,
  collectHeaders as commonCollectHeaders,
} from "./common";

const REALM_CORE_BUILD_PATH = path.resolve(REALM_CORE_PATH, "build-xcode");
const REALM_CORE_CMAKE_TOOLCHAIN_PATH = path.resolve(REALM_CORE_PATH, "tools/cmake/xcode.toolchain.cmake");
const REALM_CORE_COMBINED_LIBRARY_NAME = "librealm-combined.a";
const REALM_CORE_LIBRARY_NAMES_DENYLIST = [
  ...COMMON_REALM_CORE_LIBRARY_NAMES_DENYLIST,
  REALM_CORE_COMBINED_LIBRARY_NAME,
];
const REALM_CORE_HEADERS_PATH = path.resolve(REALM_CORE_BUILD_PATH, "include");

const REALM_CORE_PRODUCTS_INSTALL_PATH = `Products${ARCHIVE_INSTALL_PATH}`;

const XCFRAMEWORK_PATH = path.resolve(PACKAGE_PATH, "prebuilds/apple/realm-core.xcframework");

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

export function validatePlatforms(values: readonly (XcodeSDKName | "all" | "none")[]): readonly XcodeSDKName[] {
  if (values.includes("none")) {
    assert(values.length === 1, "Expected 'none' to be the only platform");
    return [];
  } else if (values.includes("all")) {
    return SUPPORTED_PLATFORMS;
  } else {
    return values as readonly XcodeSDKName[];
  }
}

function ensureBuildDirectory() {
  // Ensure the build directory exists
  if (!fs.existsSync(REALM_CORE_BUILD_PATH)) {
    console.log("Creating build directory:", REALM_CORE_BUILD_PATH);
    fs.mkdirSync(REALM_CORE_BUILD_PATH);
  }
}

type GenerateXcodeProjectOptions = {
  cmakePath: string;
};

export function generateXcodeProject({ cmakePath }: GenerateXcodeProjectOptions) {
  ensureBuildDirectory();
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
  ensureBuildDirectory();

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
  commonCollectHeaders({ buildPath: REALM_CORE_BUILD_PATH, includePath: REALM_CORE_HEADERS_PATH });
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
  assert(fs.existsSync(REALM_CORE_HEADERS_PATH), "Collect headers before creating XCFramework");
  // Delete any existing xcframework to prevent
  // “librealm-combined.a” couldn’t be copied to “...” because an item with the same name already exists
  // Ideally, it would only be necessary to delete the specific platform+arch, to allow selectively building from source.
  fs.rmSync(XCFRAMEWORK_PATH, { recursive: true, force: true });
  xcode.createXcframework({
    archivePaths,
    libraryNames: [REALM_CORE_COMBINED_LIBRARY_NAME],
    outputPath: XCFRAMEWORK_PATH,
    headerPaths: [REALM_CORE_HEADERS_PATH],
  });
}
