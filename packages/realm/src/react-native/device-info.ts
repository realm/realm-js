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

import { Platform } from "react-native";

import { version } from "realm/package.json";

import { inject } from "../platform/device-info";
import { JsPlatformHelpers } from "../binding";

function getDeviceName() {
  if (Platform.OS === "ios") {
    if (Platform.isPad) {
      return "iPad";
    } else if (Platform.isTV) {
      return "AppleTV";
    } else {
      // RN doesn't support Apple Watch
      return "iPhone";
    }
  } else if (Platform.OS === "android") {
    return `${Platform.constants.Manufacturer}:${Platform.constants.Brand}`;
  } else {
    return "unknown";
  }
}

function getDeviceVersion() {
  if (Platform.OS === "android") {
    return `${Platform.constants.Model}`;
  } else {
    return "unknown";
  }
}

function getReactNativeVersion() {
  const { major, minor, patch, prerelease } = Platform.constants.reactNativeVersion;
  const result = [major, minor, patch].join(".");
  if (prerelease) {
    return result + "-" + prerelease;
  } else {
    return result;
  }
}

inject({
  create() {
    return {
      sdk: "JS",
      sdkVersion: version,

      platform: Platform.OS,
      // Android reports a number ...
      platformVersion: `${Platform.Version}`,

      deviceName: getDeviceName(),
      deviceVersion: getDeviceVersion(),

      cpuArch: JsPlatformHelpers.getCpuArch(),

      frameworkName: "react-native",
      frameworkVersion: getReactNativeVersion(),
    };
  },
});
