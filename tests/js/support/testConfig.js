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

const fs = require("fs");
const path = require("path");

// If the docker instance has imported this stitch config, it will have written the app id
// back into the config file, so we can read it out again here.

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

const IMPORTED_APPS_PATH = path.resolve(__dirname, "../../imported-apps.json");
if (!fs.existsSync(IMPORTED_APPS_PATH)) {
  throw new Error("Run the 'import-apps' npm script first");
}
const IMPORTED_APPS = require(IMPORTED_APPS_PATH);

function getAppId(name) {
  const app = IMPORTED_APPS.find(({ appName }) => name === appName);
  if (!app) {
    throw new Error(`An app named "${name}" was never imported`);
  }
  return app.appId;
}

function makeAppConfigFromName(name) {
  const id = getAppId(name);
  return makeAppConfig(id);
}

module.exports = {
  integrationAppConfig: makeAppConfigFromName("common-tests"),
  pvIntAppConfig: makeAppConfigFromName("pv-int-tests"),
  pvStringAppConfig: makeAppConfigFromName("pv-string-tests"),
  pvUuidAppConfig: makeAppConfigFromName("pv-uuid-tests"),
  pvObjectidAppConfig: makeAppConfigFromName("pv-objectid-tests"),
};
