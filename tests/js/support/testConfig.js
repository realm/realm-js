
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

'use strict';

// If the docker instance has imported this stitch config, it will have written the app id
// back into the config file, so we can read it out again here.

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
    return require_method(module);
}

const path = require("path");

let pathToStitchJson = "../../../src/object-store/tests/mongodb/stitch.json";
if (global.REALM_MODULE_PATH) {
    console.log("REALM_MODULE_PATH " + REALM_MODULE_PATH);
    pathToStitchJson = path.resolve(global.REALM_MODULE_PATH, '../../../../src/object-store/tests/mongodb/stitch.json')
}
console.log("pathToStitchJson " + pathToStitchJson);

const integrationTestsAppId = `${nodeRequire(pathToStitchJson).app_id}`;
const appUrl = process.env.MONGODB_REALM_ENDPOINT ? process.env.MONGODB_REALM_ENDPOINT.replace(/\"/g,'') : "http://localhost";
const appPort = process.env.MONGODB_REALM_PORT || "9090";
console.log(`tests are using integration tests app id: ${integrationTestsAppId} on ${appUrl}:${appPort}`);

const integrationAppConfig = {
    id: integrationTestsAppId,
    url: `${appUrl}:${appPort}`,
    timeout: 1000,
    app: {
        name: "default",
        version: '0'
    },
};

module.exports = {
    integrationAppConfig
}
