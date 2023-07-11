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

import os from "node:os";
import path from "node:path";
import fse from "fs-extra";
import { createHmac } from "node:crypto";

import { version } from "realm/package.json";

import { inject } from "../device-info";

inject({
  create() {
    /**
     * Generate a hash value of data using salt.
     * @returns base64 encoded SHA256 of data
     */
    function sha256(data: string): string {
      const salt = "Realm is great";
      return createHmac("sha256", Buffer.from(salt)).update(data).digest().toString("base64");
    }

    /**
     * Finds the root directory of the project.
     * @returns the root of the project
     */
    function getProjectRoot(): string {
      let wd = process.env.npm_config_local_prefix;
      if (!wd) {
        wd = process.cwd();
        const index = wd.indexOf("node_modules");
        wd = index === -1 ? wd : wd.slice(0, index);
      }
      return wd;
    }

    /**
     * Finds and read package.json
     * @returns package.json as a JavaScript object
     */
    function getPackageJson(packagePath: string) {
      const packageJson = path.resolve(packagePath, "package.json");
      return fse.readJsonSync(packageJson);
    }

    const packageJson = getPackageJson(getProjectRoot());
    const bundleId = sha256(packageJson.name as string);

    return {
      sdk: "JS",
      sdkVersion: version,

      platform: os.type(),
      platformVersion: os.release(),

      deviceName: "unknown",
      deviceVersion: "unknown",

      cpuArch: os.arch(),

      frameworkName: typeof process.versions.electron === "string" ? "Electron" : "Node.js",
      frameworkVersion: process.versions.electron || process.version,

      bundleId,
    };
  },
});
