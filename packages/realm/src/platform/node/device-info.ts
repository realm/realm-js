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
import process from "node:process";

import { version } from "realm/package.json";
import { REALM_ANONYMIZED_BUNDLE_ID } from "realm/realm-constants.json";

import { inject } from "../device-info";

inject({
  create() {
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

      bundleId: REALM_ANONYMIZED_BUNDLE_ID,
    };
  },
});
