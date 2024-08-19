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
import { Configuration, REALM_CORE_VERSION } from "./common";

export function check() {
  try {
    execSync("which emcc", { encoding: "utf8" }).trim();
    execSync("emcc --check");
  } catch (err) {
    throw new Error(
      "Failed to locate the Emscripten compiler frontend - did you follow the steps for building WASM in contrib/building.md?",
      { cause: err },
    );
  }
}

type ConfigureOptions = {
  cmakePath: string;
  sourcePath: string;
  buildPath: string;
  configuration: Configuration;
};

export function configure({ cmakePath, sourcePath, buildPath, configuration }: ConfigureOptions) {
  const { status } = spawnSync(
    "emcmake",
    [
      cmakePath,
      "-G",
      "Ninja",
      "-S",
      sourcePath,
      "-B",
      buildPath,
      "-D",
      `CMAKE_BUILD_TYPE=${configuration}`,
      "-D",
      "CMAKE_MAKE_PROGRAM=ninja",
      // "-D",
      // "CMAKE_C_COMPILER_LAUNCHER=ccache",
      // "-D",
      // "CMAKE_CXX_COMPILER_LAUNCHER=ccache",
      // Realm specific variables below
      "-D",
      `REALM_VERSION=${REALM_CORE_VERSION}`,
    ],
    { stdio: "inherit" },
  );
  assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
}

type BuildOptions = {
  cmakePath: string;
  buildPath: string;
};

export function build({ cmakePath, buildPath }: BuildOptions) {
  const { status } = spawnSync(cmakePath, ["--build", buildPath], { stdio: "inherit" });
  assert.equal(status, 0, `Expected a clean exit (got status = ${status})`);
}
