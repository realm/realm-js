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

/* eslint-disable no-console */

import puppeteer from "puppeteer";
import WebpackDevServer from "webpack-dev-server";
import webpack from "webpack";
import { Server as MochaRemoteServer } from "mocha-remote-server";

import { importRealmApp } from "./import-realm-app";

import WEBPACK_CONFIG = require("../webpack.config");
import path = require("path");

// Default to testing only the credentials that does not require manual interactions.
const testCredentials = process.env.TEST_CREDENTIALS || "anonymous,email-password,function,jwt";

const { BASE_URL = "http://localhost:8080" } = process.env;

/**
 * A list of expected errors and warnings logged to the console
 */
const EXPECTED_ISSUES = [
  /was set with `SameSite=None` but without `Secure`/,
  // User / "refresh invalid access tokens" is posting an invalid token
  "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  // User / "can be deleted" is deleting an invalid token and attempting a failing login
  "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  // Closing the watch streams, might yield this error (we're doing that three times)
  "Failed to load resource: net::ERR_FAILED",
  "Failed to load resource: net::ERR_FAILED",
  "Failed to load resource: net::ERR_FAILED",
  // EmailPasswordAuth is exercising confirming users that has already been confirmed
  "Failed to load resource: the server responded with a status of 400 (Bad Request)",
  "Failed to load resource: the server responded with a status of 400 (Bad Request)",
  "Failed to load resource: the server responded with a status of 400 (Bad Request)",
  "Failed to load resource: the server responded with a status of 400 (Bad Request)",
  "Failed to load resource: the server responded with a status of 400 (Bad Request)",
];

function checkIssues(issues: string[]) {
  const expectedQueue = [...EXPECTED_ISSUES];
  issueLoop: for (const issue of issues) {
    while (expectedQueue.length > 0) {
      const expected = expectedQueue.shift();
      if (expected === issue || (expected instanceof RegExp && expected.test(issue))) {
        // This matches, let's go to the next issue
        continue issueLoop;
      }
    }
    throw new Error(`Unexpected error or warning: ${issue}`);
  }
}

export async function run(devtools = false) {
  // Prepare
  console.log("Importing app ...");
  const { appId, baseUrl } = await importRealmApp();
  console.log(`Done importing app (client id = ${appId})`);
  // Start up the Webpack Dev Server
  const compiler = webpack({
    ...(WEBPACK_CONFIG as webpack.Configuration),
    mode: "development",
    plugins: [
      ...WEBPACK_CONFIG.plugins,
      new webpack.DefinePlugin({
        APP_ID: JSON.stringify(appId),
        // Uses the webpack dev servers proxy
        BASE_URL: JSON.stringify(BASE_URL),
        TEST_CREDENTIALS: JSON.stringify(testCredentials.split(",")),
        IIFE_BUNDLE_URL: JSON.stringify(`${BASE_URL}/realm-web/dist/bundle.iife.js`),
        // Used when testing Google Sign-In
        GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID),
      }),
    ],
  });

  // Start the webpack-dev-server
  const devServer = new WebpackDevServer(compiler, {
    proxy: { "/api": baseUrl },
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, "../node_modules/realm-web"),
      publicPath: "/realm-web",
    },
  });

  await new Promise<void>((resolve, reject) => {
    devServer.listen(8080, "localhost", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  process.once("exit", () => {
    devServer.close();
  });

  // Start the mocha remote server
  const mochaServer = new MochaRemoteServer({
    autoRun: devtools,
  });

  process.once("exit", () => {
    mochaServer.stop();
  });

  await mochaServer.start();

  // Start up the browser, running the tests
  const browser = await puppeteer.launch({ devtools });

  process.once("exit", () => {
    browser.close();
  });

  // Navigate to the pages served by the webpack dev server
  const page = await browser.newPage();
  const issues: string[] = [];
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error") {
      const text = message.text();
      issues.push(text);
      console.error(`[ERROR] ${text}`);
    } else if (type === "warning") {
      const text = message.text();
      issues.push(text);
      console.warn(`[WARNING] ${text}`);
    } else if (type === "info") {
      const text = message.text();
      console.log(`[INFO] ${text}`);
    }
  });
  await page.goto("http://localhost:8080");
  // We will have to manually invoke running the tests if we're not running on connections
  if (!devtools) {
    await mochaServer.runAndStop();
  }
  // Wait for the tests to complete
  await mochaServer.stopped;
  // Check the issues logged in the browser
  checkIssues(issues);
}
