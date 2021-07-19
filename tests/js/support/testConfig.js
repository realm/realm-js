////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

// If the docker instance has imported this stitch config, it will have written the app id
// back into the config file, so we can read it out again here.

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
  return require_method(module);
}

function makeAppConfig(appId) {
  const baseUrlHostname = process.env.MONGODB_REALM_ENDPOINT
    ? process.env.MONGODB_REALM_ENDPOINT.replace(/"/g, "")
    : "http://localhost";
  const baseUrlPort = process.env.MONGODB_REALM_PORT || "9090";
  const baseUrl = `${baseUrlHostname}:${baseUrlPort}`;

  console.log(`tests are using integration tests app id: ${appId} on ${baseUrl}`);

  return {
    id: appId,
    baseUrl,
    timeout: 1000,
    app: {
      name: "default",
      version: "0",
    },
  };
}

function getConfigPath(testName) {
  let pathToJson = `../../mongodb/${testName}/config.json`;
  const isNodeProcess = typeof process === "object" && process + "" === "[object process]";

  if (isNodeProcess && process.env.ELECTRON_TESTS_REALM_MODULE_PATH) {
    const path = nodeRequire("path");
    console.log("ELECTRON_TESTS_REALM_MODULE_PATH " + process.env.ELECTRON_TESTS_REALM_MODULE_PATH);
    pathToJson = path.resolve(process.env.ELECTRON_TESTS_REALM_MODULE_PATH, `../${pathToJson}`);
  }
  return pathToJson;
}

const pathToStitchJson = getConfigPath("common-tests");
const integrationTestsAppId = nodeRequire(pathToStitchJson).app_id;
const integrationAppConfig = makeAppConfig(integrationTestsAppId);

const pathToPvIntJSON = getConfigPath("pv-int-tests");
const pvIntTestsAppId = nodeRequire(pathToPvIntJSON).app_id;
const pvIntAppConfig = makeAppConfig(pvIntTestsAppId);

const pathToPvStringJSON = getConfigPath("pv-string-tests");
const pvStringTestsAppId = nodeRequire(pathToPvStringJSON).app_id;
const pvStringAppConfig = makeAppConfig(pvStringTestsAppId);

const pathToPvUuidJSON = getConfigPath("pv-uuid-tests");
const pvUuidTestsAppId = nodeRequire(pathToPvUuidJSON).app_id;
const pvUuidAppConfig = makeAppConfig(pvUuidTestsAppId);

const pathToPvObjectidJSON = getConfigPath("pv-objectid-tests");
const pvObjectidTestsAppId = nodeRequire(pathToPvObjectidJSON).app_id;
const pvObjectidAppConfig = makeAppConfig(pvObjectidTestsAppId);

module.exports = {
  integrationAppConfig,
  pvIntAppConfig,
  pvStringAppConfig,
  pvUuidAppConfig,
  pvObjectidAppConfig,
};
