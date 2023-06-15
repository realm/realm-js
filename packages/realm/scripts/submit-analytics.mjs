////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

// Submits install information to Realm.
//
// Why are we doing this? In short, because it helps us build a better product
// for you. None of the data personally identifies you, your employer or your
// app, but it *will* help us understand what language you use, what Node.js
// versions you target, etc. Having this info will help prioritizing our time,
// adding new features and deprecating old features. Collecting an anonymized
// application path & anonymized machine identifier is the only way for us to
// count actual usage of the other metrics accurately. If we don’t have a way to
// deduplicate the info reported, it will be useless, as a single developer
// `npm install`-ing the same app 10 times would report 10 times more than another
// developer that only installs once, making the data all but useless.
// No one likes sharing data unless it’s necessary, we get it, and we’ve
// debated adding this for a long long time. If you truly, absolutely
// feel compelled to not send this data back to Realm, then you can set an
// environment variable named REALM_DISABLE_ANALYTICS.
//
// Currently the following information is reported:
// - What version of Realm is being installed.
// - The OS platform and version which is being used.
// - Node.js version numbers.
// - JavaScript framework (React Native and Electron) version numbers.
// - An anonymous machine identifier and hashed application path to aggregate
//   the other information on.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import https from "node:https";
import os from "node:os";
import console from "node:console";
import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

import machineId from "node-machine-id";
import fse from "fs-extra";

import createDebug from "debug";
export const debug = createDebug("realm:submit-analytics");

export { collectPlatformData };

// emulate old __dirname: https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Path and credentials required to submit analytics through the webhook.
 */
const ANALYTICS_BASE_URL = "https://data.mongodb-api.com/app/realmsdkmetrics-zmhtm/endpoint/metric_webhook/metric";

/**
 * Constructs the full URL that will submit analytics to the webhook.
 * @param payload Information that will be submitted through the webhook.
 * @returns Complete analytics submission URL
 */
const getAnalyticsRequestUrl = (payload) =>
  ANALYTICS_BASE_URL + "?data=" + Buffer.from(JSON.stringify(payload.webHook), "utf8").toString("base64");

/**
 * Generate a hash value of data using salt.
 * @returns base64 encoded SHA256 of data
 */
function sha256(data) {
  const salt = "Realm is great";
  return createHmac("sha256", Buffer.from(salt)).update(data).digest().toString("base64");
}

/**
 * Finds the root directory of the project.
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
 * @returns package.json as a JavaScript object
 */
function getPackageJson(packagePath) {
  const packageJson = path.resolve(packagePath, "package.json");
  return fse.readJsonSync(packageJson);
}

/**
 * Heuristics to decide if analytics should be disabled.
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

function getRealmVersion() {
  const packageJsonPath = path.resolve(__dirname, "../package.json");
  const packageJson = fse.readJsonSync(packageJsonPath);
  return packageJson["version"];
}

/**
 * Reads and parses `dependencies.list`.
 * Each line has be form "KEY=VALUE", and we to find "REALM_CORE_VERSION"
 * @returns the Realm Core version as a string
 */
function getRealmCoreVersion() {
  const dependenciesListPath = path.resolve(__dirname, "../dependencies.list");
  const dependenciesList = fse
    .readFileSync(dependenciesListPath)
    .toString()
    .split("\n")
    .map((s) => s.split("="));
  return dependenciesList.find((e) => e[0] === "REALM_CORE_VERSION")[1];
}

/**
 * Determines if `npm` or `yarn` is used.
 * @returns An array with two elements: method and version
 */
function getInstallationMethod() {
  const userAgent = process.env["npm_config_user_agent"];
  return userAgent.split(" ")[0].split("/");
}

/**
 * Collect analytics data from the runtime system
 * @returns Analytics payload
 */
async function collectPlatformData(packagePath = getProjectRoot()) {
  // node-machine-id returns the ID SHA-256 hashed, if we cannot get the ID we send hostname instead
  let identifier;
  try {
    identifier = await machineId.machineId();
  } catch (err) {
    debug(`Cannot get machine id: ${err}`);
    identifier = os.hostname();
  }

  const realmVersion = getRealmVersion();
  const realmCoreVersion = getRealmCoreVersion();

  let framework = "node.js";
  let frameworkVersion = process.version.slice(1); // skip the leading 'v'
  let jsEngine = "v8";
  let bundleId = "unknown";

  const packageJson = getPackageJson(packagePath);

  if (packageJson.name) {
    bundleId = packageJson["name"];
  }

  if (packageJson.dependencies && packageJson.dependencies["react-native"]) {
    framework = "react-native";
    frameworkVersion = packageJson.dependencies["react-native"];
  }
  if (packageJson.devDependencies && packageJson.devDependencies["react-native"]) {
    framework = "react-native";
    frameworkVersion = packageJson.devDependencies["react-native"];
  }

  if (framework === "react-native") {
    try {
      const podfilePath = path.resolve(packagePath, "ios", "Podfile");
      const podfile = fs.readFileSync(podfilePath, "utf8");
      if (/hermes_enabled.*true/.test(podfile)) {
        jsEngine = "hermes";
      } else {
        jsEngine = "jsc";
      }
    } catch (err) {
      debug(`Cannot read ios/Podfile: ${err}`);
      jsEngine = "unknown";
    }

    try {
      const rnPath = path.resolve(packagePath, "node_modules", "react-native", "package.json");
      const rnPackageJson = JSON.parse(fs.readFileSync(rnPath, "utf-8"));
      frameworkVersion = rnPackageJson["version"];
    } catch (err) {
      debug(`Cannot read react-native package.json: ${err}`);
    }
  }

  if (packageJson.dependencies && packageJson.dependencies["electron"]) {
    framework = "electron";
    frameworkVersion = packageJson.dependencies["electron"];
  }
  if (packageJson.devDependencies && packageJson.devDependencies["electron"]) {
    framework = "electron";
    frameworkVersion = packageJson.devDependencies["electron"];
  }
  if (framework === "electron") {
    try {
      const electronPath = path.resolve(packagePath, "node_modules", "electron", "package.json");
      const electronPackageJson = JSON.parse(fs.readFileSync(electronPath, "utf-8"));
      frameworkVersion = electronPackageJson["version"];
    } catch (err) {
      debug(`Cannot read electron package.json: ${err}`);
    }
  }

  // JavaScript or TypeScript - we don't consider Flow as a programming language
  let language = "javascript";
  let languageVersion = "unknown";
  if (packageJson.dependencies && packageJson.dependencies["typescript"]) {
    language = "typescript";
    languageVersion = packageJson.dependencies["typescript"];
  }
  if (packageJson.devDependencies && packageJson.devDependencies["typescript"]) {
    language = "typescript";
    languageVersion = packageJson.devDependencies["typescript"];
  }
  if (language === "typescript") {
    try {
      const typescriptPath = path.resolve(packagePath, "node_modules", "typescript", "package.json");
      const typescriptPackageJson = JSON.parse(fs.readFileSync(typescriptPath, "utf-8"));
      languageVersion = typescriptPackageJson["version"];
    } catch (err) {
      debug(`Cannot read typescript package.json: ${err}`);
    }
  }

  const installationMethod = getInstallationMethod();

  return {
    token: "ce0fac19508f6c8f20066d345d360fd0",
    "JS Analytics Version": 3,
    distinct_id: identifier,
    "Anonymized Builder Id": sha256(identifier),
    "Anonymized Bundle Id": sha256(bundleId),
    "Realm Version": realmVersion,
    Binding: "Javascript",
    Version: packageJson.version,
    Language: language,
    "Language Version": languageVersion,
    Framework: framework,
    "Framework Version": frameworkVersion,
    "Host OS Type": os.platform(),
    "Host OS Version": os.release(),
    "Host CPU Arch": os.arch(),
    "Node.js version": process.version.slice(1),
    "Core Version": realmCoreVersion,
    "Sync Enabled": true,
    "Installation Method": installationMethod[0],
    "Installation Method Version": installationMethod[1],
    "Runtime Engine": jsEngine,
  };
}

/**
 * Collect and send analytics data to MongoDB over HTTPS
 * If `REALM_DISABLE_ANALYTICS` is set, no data is submitted to MongoDB
 */
async function submitAnalytics() {
  const data = await collectPlatformData();
  const payload = {
    webHook: {
      event: "install",
      properties: data,
    },
  };
  debug(`payload: ${JSON.stringify(payload)}`);

  if ("REALM_PRINT_ANALYTICS" in process.env) {
    console.log("REALM ANALYTICS", JSON.stringify(data, null, 2));
  }

  if (isAnalyticsDisabled()) {
    debug("Analytics is disabled");
    return;
  }

  return new Promise((resolve, reject) => {
    // node 19 turns on keep-alive by default and it will make the https.get() to hang
    // https://github.com/realm/realm-js/issues/5136
    const requestUrl = getAnalyticsRequestUrl(payload);

    https
      .get(requestUrl, { agent: new https.Agent({ keepAlive: false }) }, (res) => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        });
      })
      .on("error", (error) => {
        const message = error && error.message ? error.message : error;
        const err = new Error(`Failed to dispatch analytics: ${message}`);
        reject(err);
      });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  submitAnalytics().catch(console.error);
}
