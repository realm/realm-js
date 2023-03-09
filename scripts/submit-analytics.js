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

const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const commandLineArgs = require("command-line-args");

let doLog; // placeholder for logger function

/**
 * Path and credentials required to submit analytics through the webhook.
 */
const ANALYTICS_BASE_URL = "https://data.mongodb-api.com/app/realmsdkmetrics-zmhtm/endpoint/metric_webhook/metric";

/**
 * Constructs the full URL that will submit analytics to the webhook.
 * @param  {Object} payload Information that will be submitted through the webhook.
 * @returns {string} Complete analytics submission URL
 */
const getAnalyticsRequestUrl = (payload) =>
  ANALYTICS_BASE_URL + "?data=" + Buffer.from(JSON.stringify(payload.webHook), "utf8").toString("base64");

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
function getPackageJson(packagePath) {
  const packageJson = path.resolve(packagePath, "package.json");
  return fse.readJsonSync(packageJson);
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

function getRealmVersion() {
  const packageJsonPath = path.resolve(__dirname, "../package.json");
  const packageJson = fse.readJsonSync(packageJsonPath);
  return packageJson["version"];
}

/**
 * Collect analytics data from the runtime system
 * @param {Object} packageJson The app's package.json parsed as an object
 * @returns {Object} Analytics payload
 */
async function collectPlatformData(packagePath = getProjectRoot()) {
  const os = require("os");
  const { machineId } = require("node-machine-id");

  // node-machine-id returns the ID SHA-256 hashed, if we cannot get the ID we send "unknown" hashed instead
  let identifier = await machineId();
  if (!identifier) {
    identifier = sha256("unknown");
  }

  const realmVersion = getRealmVersion();

  let framework = "node.js";
  let frameworkVersion = process.version;
  let jsEngine = "v8";

  const packageJson = getPackageJson(packagePath);

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
      const podfilePath = path.join(packagePath, "ios/Podfile");
      const podfile = fs.readFileSync(podfilePath, "utf8");
      if (/hermes_enabled.*true/.test(podfile)) {
        jsEngine = "hermes";
      } else {
        jsEngine = "jsc";
      }
    } catch (err) {
      doLog(`Cannot read ios/Podfile: ${err}`);
      jsEngine = "unknown";
    }

    try {
      const rnPath = path.join(packagePath, "node_modules", "react-native", "package.json");
      const rnPackageJson = JSON.parse(fs.readFileSync(rnPath, "utf-8"));
      frameworkVersion = rnPackageJson["version"];
    } catch (err) {
      doLog(`Cannot read react-native package.json: ${err}`);
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
      const electronPath = path.join(packagePath, "node_modules", "electron", "package.json");
      const electronPackageJson = JSON.parse(fs.readFileSync(electronPath, "utf-8"));
      frameworkVersion = electronPackageJson["version"];
    } catch (err) {
      doLog(`Cannot read electron package.json: ${err}`);
    }
  }

  return {
    token: "ce0fac19508f6c8f20066d345d360fd0",
    "JS Analytics Version": 2,
    distinct_id: identifier,
    "Anonymized Machine Identifier": identifier,
    "Anonymized Application ID": sha256(__dirname),
    "Realm Version": realmVersion,
    Binding: "javascript",
    Version: packageJson.version,
    Language: "javascript",
    Framework: framework,
    "Framework Version": frameworkVersion,
    "JavaScript Engine": jsEngine,
    "Host OS Type": os.platform(),
    "Host OS Version": os.release(),
    "Node.js version": process.version,
  };
}

/**
 * Collect and send analytics data to MongoDB over HTTPS
 * @param  {boolean} dryRun if true, collect data but don't submit
 */
async function submitAnalytics(dryRun) {
  const https = require("https");
  const data = await collectPlatformData();
  const payload = {
    webHook: {
      event: "install",
      properties: data,
    },
  };
  doLog(`payload: ${JSON.stringify(payload)}`);

  if (dryRun) {
    doLog("Dry run; will not submit analytics");
    return;
  }

  if (isAnalyticsDisabled()) {
    doLog("Analytics is disabled");
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

const optionDefinitions = [
  {
    name: "dryRun",
    type: Boolean,
    multiple: false,
    defaultValue: false,
    description: "If true, don't submit analytics",
  },
  { name: "log", type: Boolean, multiple: false, defaultValue: false, description: "If true, print log messages" },
  { name: "test", type: Boolean, multiple: false, defaultValue: false, description: "If true, run as --dryRun --log" },
];

const options = commandLineArgs(optionDefinitions, { camelCase: true });

let dryRun = options.dryRun;
let log = options.log;

if (options.test) {
  dryRun = true;
  log = true;
}

if (log) {
  doLog = (msg) => console.log(msg);
} else {
  // eslint-disable-next-line no-unused-vars
  doLog = () => {
    /* don't log */
  };
}

if (require.main === module) {
  submitAnalytics(dryRun).catch(console.error);
} else {
  module.exports = { collectPlatformData };
}
