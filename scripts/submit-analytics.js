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

const commandLineArgs = require("command-line-args");
const utils = require("../lib/utils");
const fs = require("fs");

let doLog; // placeholder for logger function

class Webhook {
  /**
   * Path and credentials required to submit analytics through the webhook (production mode).
   */
  constructor() {
    this.urlPrefix =
      "https://webhooks.mongodb-realm.com/api/client/v2.0/app/realmsdkmetrics-zmhtm/service/metric_webhook/incoming_webhook/metric?ip=1&data=";
  }

  /**
   * Constructs the full URL that will submit analytics to the webhook.
   * @param  {Object} payload Information that will be submitted through the webhook.
   * @returns {string} Complete analytics submission URL
   */
  buildRequest(payload) {
    const request = this.urlPrefix + Buffer.from(JSON.stringify(payload.webHook), "utf8").toString("base64");
    return request;
  }
}

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
 * Collect analytics data from the runtime system
 * @param {Object} context The app's package.json parsed as an object
 * @returns {Object} Analytics payload
 */
async function fetchPlatformData(context) {
  const os = require("os");
  const { machineId } = require("node-machine-id");

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
      const podfile = fs.readFileSync("../../ios/Podfile", "utf8");
      if (podfile.includes("hermes_enabled => true")) {
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

  const payloads = {
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

  return payloads;
}

function isAnalyticsDisabled() {
  let isDisabled = false;

  // NODE_ENV is commonly used by JavaScript framework
  if ("NODE_ENV" in process.env) {
    isDisabled |= process.env["NODE_ENV"] === "production" || process.env["NODE_ENV"] === "test";
  }

  // Electron apps are assumed to be in production if packaged
  try {
    const { app } = require("electron");
    isDisabled |= !app.isPackaged;
  } catch (err) {
    doLog(`Ignoring: Failed to require("electron"): ${JSON.stringify(err)}`);
  }

  // If the user has specifically opted-out or if we're running in a CI environment
  isDisabled |= "REALM_DISABLE_ANALYTICS" in process.env || "CI" in process.env;

  return isDisabled;
}

/**
 * Send collected analytics data to Realm's servers over HTTPS
 * @param  {Object} payload analytics info
 */
async function dispatchAnalytics(payload) {
  const https = require("https");

  return new Promise((resolve, reject) => {
    const webhookRequest = new Webhook().buildRequest(payload);

    https
      .get(webhookRequest, (res) => {
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

async function submitAnalytics(dryRun) {
  const context = require("../../../package.json");
  if (isAnalyticsDisabled()) {
    doLog("Analytics is disabled");
    return;
  }

  const payload = await fetchPlatformData(context);
  doLog(`payload: ${JSON.stringify(payload)}`);

  if (dryRun) {
    doLog("Dry run; will not submit analytics");
    return;
  }

  await Promise.all([
    // send in analytics in the newer S3 format
    dispatchAnalytics(payload),
  ]);
}

const optionDefinitions = [
  { name: "dryRun", type: Boolean, multiple: false, description: "If true, don't submit analytics" },
  { name: "log", type: Boolean, multiple: false, description: "If true, print log messages" }];

const options = commandLineArgs(optionDefinitions, { camelCase: true });

let dryRun = false;
if (options.dryRun) {
  dryRun = true;
}

if (options.log) {
  doLog = (msg) => console.log(msg);
} else {
  // eslint-disable-next-line no-unused-vars
  doLog = (_) => {
    /* don't log */
  };
}

(async function () {
  await submitAnalytics(dryRun);
})();
