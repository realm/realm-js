////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import commandLineArgs from "command-line-args";
import fs from "node:fs";
import path from "node:path";
import { execFileSync as exec } from "node:child_process";
import { version } from "../package.json";

const packageRoot = path.resolve(__dirname, "..");

const NDK_VERSION = "25.1.8937393";

const { ANDROID_HOME } = process.env;

if (!ANDROID_HOME) {
  console.error(`Missing env variable ANDROID_HOME`);
  process.exit(1);
}

if (!fs.existsSync(ANDROID_HOME)) {
  console.error(`Missing the Android SDK ${ANDROID_HOME}`);
  process.exit(1);
}

const ndkPath = path.resolve(ANDROID_HOME, "ndk", NDK_VERSION);
if (!fs.existsSync(ndkPath)) {
  const cmd = `sdkmanager --install "ndk;${NDK_VERSION}"`;
  console.error(`Missing Android NDK v${NDK_VERSION} (${ndkPath}) - run: ${cmd}`);
  process.exit(1);
}

const buildTypes = ["Debug", "Release", "RelWithDebInfo", "MinSizeRel"];
let architectures = ["x86", "armeabi-v7a", "arm64-v8a", "x86_64"];
const optionDefinitions = [
  { name: "arch", type: validateArchitectures, multiple: false, description: "Build only for a single architecture" },
  { name: "clean", type: Boolean, defaultValue: false, multiple: false, description: "Rebuild from scratch" },
  {
    name: "build-type",
    type: validateBuildType,
    defaultValue: "Release",
    multiple: false,
    description: "CMAKE_BUILD_TYPE: Debug, Release, RelWithDebInfo, MinSizeRel",
  },
];
const options = commandLineArgs(optionDefinitions, { camelCase: true });

if (options.arch) {
  architectures = [options.arch];
}

const buildType = options.buildType;

const cmakePath = process.platform === "win32" ? "cmake.exe" : "cmake";

const buildPath = path.resolve(packageRoot, "build-android");
if (options.clean) {
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
  }
}

fs.mkdirSync(buildPath, { recursive: true });

for (const arch of architectures) {
  console.log(`\nBuilding Realm JS Android for ${arch} (${buildType})`);
  console.log("=======================================");
  //create a build dir per architecture
  const archBuildDir = path.resolve(buildPath, arch);
  if (!fs.existsSync(archBuildDir)) {
    fs.mkdirSync(archBuildDir);
  }

  let args = [
    "-GNinja",
    `-DANDROID_NDK=${ndkPath}`,
    `-DANDROID_ABI=${arch}`,
    `-DCMAKE_MAKE_PROGRAM=ninja`,
    `-DCMAKE_TOOLCHAIN_FILE=${ndkPath}/build/cmake/android.toolchain.cmake`,
    "-DANDROID_TOOLCHAIN=clang",
    "-DANDROID_NATIVE_API_LEVEL=16",
    `-DCMAKE_BUILD_TYPE=${buildType}`,
    "-DANDROID_STL=c++_shared",
    path.resolve(packageRoot, "./bindgen"),
  ];
  exec(cmakePath, args, { cwd: archBuildDir, stdio: "inherit" });

  //cwd is the archBuildDir here, hence build the current dir with "--build ."
  args = ["--build", "."];
  exec(cmakePath, args, { cwd: archBuildDir, stdio: "inherit" });
}

generateVersionFile();

function generateVersionFile() {
  const targetFile = path.resolve(
    packageRoot,
    "react-native",
    "android",
    "src",
    "main",
    "java",
    "io",
    "realm",
    "react",
    "Version.java",
  );
  const versionFileContents = `package io.realm.react;

public class Version {
    public static final String VERSION = "${version}";
}
`;

  fs.writeFileSync(targetFile, versionFileContents);
}

function validateBuildType(buildTypeOption) {
  if (!buildTypes.includes(buildTypeOption)) {
    throw new Error(`Invalid build type: ${buildTypeOption}. Supported architectures ${buildTypes}`);
  }

  return buildTypeOption;
}

function validateArchitectures(arch) {
  if (!architectures.includes(arch)) {
    throw new Error(`"Invalid architecture ${arch}. Supported architectures ${architectures}`);
  }

  return arch;
}
