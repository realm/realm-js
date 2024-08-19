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

import { config, version } from "realm/package.json";

import { inject } from "../device-info";

const userAgent = window.navigator.userAgent;

inject({
  create() {
    return {
      sdk: "JS",
      sdkVersion: version,

      platform: userAgent,
      platformVersion: userAgent,

      deviceName: "unknown",
      deviceVersion: "unknown",

      cpuArch: "unknown",

      frameworkName: "WebAssembly",
      frameworkVersion: "unknown",

      bundleId: config?.anonymizedBundleId || "unknown",
    };
  },
});
