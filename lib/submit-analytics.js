////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const fs = require("fs");
const path = require("path");

/**
 * Generate a hash value of data
 * @param {*} data
 * @returns SHA256 of data
 */
function sha256(data) {
  let hash = require("crypto").createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

/**
 * Finds the root directory of the project.
 *
 * @returns the root of the project
 */
function getProjectRoot() {
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
 *
 * @returns package.json as a JavaScript object
 */
function getPackageJson() {
  const packageJson = getProjectRoot() + path.sep + "package.json";
  return require(packageJson);
}

/**
 * Heuristics to decide if analytics should be disabled.
 *
 * @returns true if analytics is disabled
 */
function isAnalyticsDisabled() {
  let isDisabled = false;

  // NODE_ENV is commonly used by JavaScript framework
  if ("NODE_ENV" in process.env) {
    isDisabled |= process.env["NODE_ENV"] === "production" || process.env["NODE_ENV"] === "test";
  }

  // If the user has specifically opted-out or if we're running in a CI environment
  isDisabled |= "REALM_DISABLE_ANALYTICS" in process.env || "CI" in process.env;

  return isDisabled;
}

/**
 * Collect analytics data from the runtime system
 * @param {Object} context The app's package.json parsed as an object
 * @returns {Object} Analytics payload
 */
async function fetchPlatformData(context) {
  const os = require("os");
  const { machineId } = require("node-machine-id");

  // node-machine-id returns the ID SHA-256 hashed, if we cannot get the ID we send "unknown" hashed instead
  let identifier = await machineId();
  if (!identifier) {
    identifier = sha256("unknown");
  }

  let framework = "node.js";
  let frameworkVersion = process.version;
  let jsEngine = "v8";

  if (context.dependencies && context.dependencies["react-native"]) {
    framework = "react-native";
    frameworkVersion = context.dependencies["react-native"];
    try {
      const podfile = fs.readFileSync(getProjectRoot() + "/ios/Podfile", "utf8"); // no need to use path.sep as we are on MacOS
      if (/hermes_enabled.*true/.test(podfile)) {
        jsEngine = "hermes";
      } else {
        jsEngine = "jsc";
      }
    } catch (err) {
      doLog(`Cannot read ios/Podfile: ${err}`);
      jsEngine = "unknown";
    }
  }
  if (context.dependencies && context.dependencies["electron"]) {
    framework = "electron";
    frameworkVersion = context.dependencies["electron"];
  }

  const payload = {
    webHook: {
      event: "install",
      properties: {
        token: "aab85907a13e1ff44a95be539d9942a9",
        "JS Analytics Version": 2,
        distinct_id: identifier,
        "Anonymized Machine Identifier": identifier,
        "Anonymized Application ID": sha256(__dirname),
        Binding: "javascript",
        Version: context.version,
        Language: "javascript",
        Framework: framework,
        "Framework Version": frameworkVersion,
        "JavaScript Engine": jsEngine,
        "Host OS Type": os.platform(),
        "Host OS Version": os.release(),
        "Node.js version": process.version,
      },
    },
  };

  return payload;
}



module.exports = {
  sha256,
  getPackageJson,
  fetchPlatformData,
  isAnalyticsDisabled,
};

