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

import fs from "node:fs";
import path from "node:path";

import { Configuration, PACKAGE_PATH, PACKAGE_VERSION, REALM_CORE_PATH, REALM_CORE_VERSION } from "./common";
import { spawnSync } from "node:child_process";

export const DEFAULT_NDK_VERSION = "25.1.8937393";
export const ANDROID_API_LEVEL = "16";

type AndroidArchitecture = "x86" | "armeabi-v7a" | "arm64-v8a" | "x86_64";

export const SUPPORTED_ARCHITECTURES = [
  "x86",
  "armeabi-v7a",
  "arm64-v8a",
  "x86_64",
] as const satisfies readonly AndroidArchitecture[];

export function validateArchitectures(
  values: readonly (AndroidArchitecture | "all")[],
): readonly AndroidArchitecture[] {
  if (values.includes("all")) {
    return SUPPORTED_ARCHITECTURES;
  } else {
    return values as readonly AndroidArchitecture[];
  }
}

type BuildDirectoryOptions = {
  architecture: AndroidArchitecture;
};

function ensureBuildDirectory({ architecture }: BuildDirectoryOptions) {
  const buildPath = path.join(REALM_CORE_PATH, "build-android", architecture);
  // Ensure the build directory exists
  if (!fs.existsSync(buildPath)) {
    console.log("Creating build directory:", buildPath);
    fs.mkdirSync(buildPath, { recursive: true });
  }
  return buildPath;
}

type BuildArchiveOptions = {
  cmakePath: string;
  ndkPath: string;
  architecture: AndroidArchitecture;
  configuration: Configuration;
};

export function buildArchive({ cmakePath, ndkPath, architecture, configuration }: BuildArchiveOptions) {
  // Ensure a per architecture build directory
  const buildPath = ensureBuildDirectory({ architecture });
  const toolchainPath = path.join(ndkPath, "build/cmake/android.toolchain.cmake");
  spawnSync(
    cmakePath,
    [
      "-G",
      // TODO: Assert ninja is installed?
      "Ninja",
      "-S",
      REALM_CORE_PATH,
      "-B",
      buildPath,
      "--toolchain",
      toolchainPath,
      "-D",
      `CMAKE_BUILD_TYPE=${configuration}`,
      "-D",
      "CMAKE_MAKE_PROGRAM=ninja",
      "-D",
      `ANDROID_NDK=${ndkPath}`,
      "-D",
      // TODO: Does this take more than one value?
      `ANDROID_ABI=${architecture}`,
      "-D",
      "ANDROID_TOOLCHAIN=clang",
      "-D",
      `ANDROID_NATIVE_API_LEVEL=${ANDROID_API_LEVEL}`,
      "-D",
      "ANDROID_STL=c++_shared",
      // TODO: Check that this is even used, it was not needed by the previous build script
      "-D",
      `REALM_VERSION=${REALM_CORE_VERSION}`,
      "-D",
      "REALM_BUILD_LIB_ONLY=ON",
    ],
    { stdio: "inherit" },
  );
  // Invoke the native build tool (Ninja) to build the generated project
  spawnSync(cmakePath, ["--build", buildPath], { stdio: "inherit" });
}

// TODO: Determine if this could happen all natively by passing a declaration through Cmake instead
// export function generateVersionFile() {
//   const targetFile = path.resolve(
//     PACKAGE_PATH,
//     "react-native",
//     "android",
//     "src",
//     "main",
//     "java",
//     "io",
//     "realm",
//     "react",
//     "Version.java",
//   );
//   const versionFileContents = `package io.realm.react;

// public class Version {
//     public static final String VERSION = "${PACKAGE_VERSION}";
// }
// `;

//   fs.writeFileSync(targetFile, versionFileContents);
// }

export function collectHeaders() {
  throw new Error("Not yet implemented");
}
