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

import assert from "node:assert";
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";

const { env } = process;
const PACKAGE_PATH = path.resolve(__dirname, "../..");

export type XcodeSDKName = "macosx" | "iphoneos" | "iphonesimulator"; // | "tvos" | "tvos";
export type BuildConfiguration = "Release" | "Debug" | "MinSizeRel" | "RelWithDebInfo";

type XcodeArchiveOptions = {
  cwd: string;
  scheme: string;
  targets?: string[];
  configuration: BuildConfiguration;
  sdkName: XcodeSDKName;
  destinations?: string[];
  archivePath: string;
};

type LibtoolOptions = {
  outputPath: string;
  inputPaths: string[];
};

type CreateXcframeworkOptions = {
  archivePaths: string[];
  outputPath: string;
  libraryNames: string[];
  headers?: string[];
};

let developerDir = env.DEVELOPER_DIR;

export const xcode = {
  get developerDir() {
    if (!developerDir) {
      developerDir = execSync("xcode-select --print-path", { encoding: "utf8" }).trim();
    }
    return developerDir;
  },
  get env() {
    return { ...env, DEVELOPER_DIR: this.developerDir, SDKROOT: undefined };
  },
  archive({ cwd, scheme, targets = [], configuration, sdkName, destinations = [], archivePath }: XcodeArchiveOptions) {
    const { status } = spawnSync(
      "xcodebuild",
      [
        "archive",
        "-scheme",
        scheme,
        ...targets.flatMap((target) => ["-target", target]),
        // "-project"
        "-configuration",
        configuration,
        "-sdk",
        sdkName,
        "-archivePath",
        archivePath,
        ...destinations.flatMap((destination) => ["-destination", destination]),
        // See https://developer.apple.com/documentation/xcode/build-settings-reference#Build-Libraries-for-Distribution
        "BUILD_LIBRARY_FOR_DISTRIBUTION=YES",
        "SKIP_INSTALL=NO",
        // This setting is needed to make XCode emit .a files into the "Products" build directory
        `INSTALL_PATH=/usr/local/lib`,
        // Pass CC and CXX to use ccache if available (these will pass-through if ccache isn't installed)
        `CC=${path.join(PACKAGE_PATH, "scripts/ccache-clang.sh")}`,
        `CXX=${path.join(PACKAGE_PATH, "scripts/ccache-clang++.sh")}`,
      ],
      {
        stdio: "inherit",
        cwd,
        env: this.env,
      },
    );

    assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
  },
  libtool({ outputPath, inputPaths }: LibtoolOptions) {
    // xcrun libtool -static -D -o ./out/$CONFIGURATION-maccatalyst/librealm-js-ios.a ./out/$CONFIGURATION-maccatalyst/*.a
    const { status } = spawnSync("xcrun", ["libtool", "-static", "-D", "-o", outputPath, ...inputPaths], {
      stdio: "inherit",
      env: this.env,
    });
    assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
  },
  createXcframework({ archivePaths, outputPath, libraryNames, headers = [] }: CreateXcframeworkOptions) {
    const { status } = spawnSync(
      "xcodebuild",
      [
        "-create-xcframework",
        "-output",
        outputPath,
        ...archivePaths.flatMap((archivePath) => [
          "-archive",
          archivePath,
          ...libraryNames.flatMap((libraryName) => ["-library", libraryName]),
          ...headers.flatMap((header) => ["-headers", header]),
        ]),
      ],
      {
        stdio: "inherit",
        env: this.env,
      },
    );
    assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
  },
};
