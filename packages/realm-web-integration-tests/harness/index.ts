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

import puppeteer from "puppeteer";
import WebpackDevServer from "webpack-dev-server";
import webpack from "webpack";
import { MochaRemoteServer } from "mocha-remote";

import { importRealmApp } from "./import-realm-app";

import WEBPACK_CONFIG = require("../webpack.config");
import path = require("path");

const devtools = "DEV_TOOLS" in process.env;
// Default to testing only the credentials that does not require manual interactions.
const testCredentials =
    process.env.TEST_CREDENTIALS || "anonymous,email-password,function,jwt";

const { BASE_URL = "http://localhost:8080" } = process.env;

/**
 * A list of expected errors and warnings logged to the console
 */
const EXPECTED_ISSUES = [
    /was set with `SameSite=None` but without `Secure`/,
    // User / "refresh invalid access tokens" is posting an invalid token
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
    // EmailPasswordAuth is exercising confirming users that has already been confirmed
    "Failed to load resource: the server responded with a status of 400 (Bad Request)",
    "Failed to load resource: the server responded with a status of 400 (Bad Request)",
    "Failed to load resource: the server responded with a status of 400 (Bad Request)",
    "Failed to load resource: the server responded with a status of 400 (Bad Request)",
];

/* eslint-disable no-console */

async function run() {
    // Prepare
    const { appId, baseUrl } = await importRealmApp();
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
                IIFE_BUNDLE_URL: JSON.stringify(
                    `${BASE_URL}/realm-web/dist/bundle.iife.js`,
                ),
            }),
        ],
    });

    // Start the webpack-dev-server
    const devServer = new WebpackDevServer(compiler, {
        proxy: { "/api": baseUrl },
        historyApiFallback: true,
        contentBase: path.join(__dirname, "../node_modules/realm-web"),
        contentBasePublicPath: "/realm-web",
    });

    await new Promise((resolve, reject) => {
        devServer.listen(8080, "localhost", err => {
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
    const mochaServer = new MochaRemoteServer(undefined, {
        runOnConnection: true,
        // Only stop after completion if we're not showing dev-tools
        stopAfterCompletion: !devtools,
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
    page.on("console", message => {
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
    // Wait for the tests to complete
    await mochaServer.stopped;
    // Loop through the issues and throw if any unexpected message occurs
    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const expected = EXPECTED_ISSUES[i];
        if (
            typeof expected === "string"
                ? issue !== expected
                : !expected.test(issue)
        ) {
            throw new Error(`Unexpected error or warning: ${issue}`);
        }
    }
}

run().then(
    () => {
        if (!devtools) {
            process.exit(0);
        }
    },
    err => {
        console.error(err);
        if (!devtools) {
            process.exit(1);
        }
    },
);
