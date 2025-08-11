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
import { spawnSync } from "node:child_process";
import assert from "node:assert";

import type { Configuration } from "./common";
import {
  PACKAGE_PATH,
  REALM_CORE_LIBRARY_NAMES_ALLOWLIST,
  REALM_CORE_PATH,
  REALM_CORE_VERSION,
  ensureDirectory,
} from "./common";

export const DEFAULT_NDK_VERSION = "27.1.12297006";
export const ANDROID_API_LEVEL = "24";

const INSTALL_PATH = path.resolve(PACKAGE_PATH, "prebuilds/android");

type AndroidArchitecture = "x86" | "armeabi-v7a" | "arm64-v8a" | "x86_64";

export const SUPPORTED_ARCHITECTURES = [
  "x86",
  "armeabi-v7a",
  "arm64-v8a",
  "x86_64",
] as const satisfies readonly AndroidArchitecture[];

export function pickArchitectures(
  values: readonly (AndroidArchitecture | "all" | "infer")[],
): readonly AndroidArchitecture[] {
  if (values.includes("all")) {
    return SUPPORTED_ARCHITECTURES;
  } else if (values.includes("infer")) {
    assert(values.length === 1);
    if (process.arch === "arm64") {
      return ["arm64-v8a"];
    } else if (process.arch === "x64") {
      return ["x86_64"];
    } else {
      throw new Error(`Failed to infer Android arch from host ${process.arch}`);
    }
  } else {
    return values as readonly AndroidArchitecture[];
  }
}

function ensureBuildDirectory(architecture: AndroidArchitecture, configuration: Configuration, clean: boolean) {
  const buildPath = path.join(REALM_CORE_PATH, "build-android-" + architecture + "-" + configuration);
  ensureDirectory(buildPath, clean);
  return buildPath;
}

type BuildArchiveOptions = {
  cmakePath: string;
  ndkPath: string;
  architecture: AndroidArchitecture;
  configuration: Configuration;
  clean: boolean;
};

export function buildArchive({ cmakePath, ndkPath, architecture, configuration, clean }: BuildArchiveOptions) {
  // Ensure a per architecture build directory
  const buildPath = ensureBuildDirectory(architecture, configuration, clean);
  const installPath = path.join(INSTALL_PATH, architecture);
  // TODO: Consider using the "./tools/cmake/android.toolchain.cmake" from Realm Core instead?
  const toolchainPath = path.join(ndkPath, "build/cmake/android.toolchain.cmake");

  {
    const { status } = spawnSync(
      cmakePath,
      [
        "-G",
        "Ninja",
        "-S",
        REALM_CORE_PATH,
        "-B",
        buildPath,
        "--toolchain",
        toolchainPath,
        "-D",
        "CMAKE_SYSTEM_NAME=Android",
        "-D",
        `CPACK_SYSTEM_NAME=Android-${architecture}`,
        "-D",
        `CMAKE_INSTALL_PREFIX=${installPath}`,
        "-D",
        `CMAKE_BUILD_TYPE=${configuration}`,
        "-D",
        "CMAKE_MAKE_PROGRAM=ninja",
        "-D",
        "CMAKE_C_COMPILER_LAUNCHER=ccache",
        "-D",
        "CMAKE_CXX_COMPILER_LAUNCHER=ccache",
        "-D",
        "CMAKE_CXX_STANDARD=20",
        "-D",
        `ANDROID_NDK=${ndkPath}`,
        "-D",
        `ANDROID_ABI=${architecture}`,
        "-D",
        "ANDROID_TOOLCHAIN=clang",
        "-D",
        `ANDROID_NATIVE_API_LEVEL=${ANDROID_API_LEVEL}`,
        "-D",
        "ANDROID_STL=c++_shared",
        // Realm specific variables below
        "-D",
        `REALM_VERSION=${REALM_CORE_VERSION}`,
        "-D",
        "REALM_BUILD_LIB_ONLY=ON",
      ],
      { stdio: "inherit" },
    );
    assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
  }

  // Invoke the native build tool (Ninja) to build the generated project
  {
    const { status } = spawnSync(cmakePath, ["--build", buildPath, "--", "install"], { stdio: "inherit" });
    assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
  }
  // Delete unwanted build artifacts
  const libsPath = path.join(installPath, "lib");
  for (const fileName of fs.readdirSync(libsPath)) {
    if (!REALM_CORE_LIBRARY_NAMES_ALLOWLIST.includes(fileName)) {
      const libraryPath = path.join(libsPath, fileName);
      console.log("Deleting unwanted library archive file", libraryPath);
      fs.rmSync(libraryPath);
    }
  }
  // Delete the docs directory
  const installedDocsPath = path.join(installPath, "doc");
  console.log("Deleting unwanted docs directory", installedDocsPath);
  fs.rmSync(installedDocsPath, { recursive: true, force: true });
}
