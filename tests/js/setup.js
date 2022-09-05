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

const path = require("node:path");
const fs = require("node:fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const importApp = async (appPath) => {
  const command = `npx realm-app-importer import ${appPath}`;
  console.log("running command: ", command);
  try {
    const { stdout, stderr } = await exec(command);
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
  } catch (e) {
    console.error(e);
  }
  console.log("command finished");
};

global.enableSyncTests = true;

async function run() {
  if (process.env.LEGACY_TESTS_M1 && global.enableSyncTests) {
    // Check all env variables are set
    if (
      !process.env.REALM_PUBLIC_KEY ||
      !process.env.REALM_PRIVATE_KEY ||
      !process.env.MONGODB_REALM_ENDPOINT ||
      !process.env.MONGODB_REALM_PORT
    ) {
      console.error(
        "In order to run the legacy tests, you need to set the following environment variables: REALM_PUBLIC_KEY, REALM_PRIVATE_KEY, MONGODB_REALM_ENDPOINT and MONGODB_REALM_PORT",
      );
      console.log("Please refer to the documentation for more information.");
      console.log("../../contrib/guide-legacy-tests-m1.md");
      process.exit(1);
    }
    // If not refer to the documentation
    // If everything is in order, then deploy all the apps to the test server
    const appsPath = path.join(__dirname, "../mongodb-qa-apps");
    const appDirectories = fs.readdirSync(appsPath);

    // It is possible for there to be multiple service directories
    for (const appDir of appDirectories) {
      const appPath = path.join(appsPath, appDir);
      if (fs.lstatSync(appPath).isDirectory()) {
        // Check if config.json exists
        const configPath = path.join(appPath, "config.json");
        if (fs.existsSync(configPath)) {
          console.log(appDir);
          await importApp(appPath);
          // Run console command realm-app-import on the app directory
        }
      }
    }
  }
}
run();
