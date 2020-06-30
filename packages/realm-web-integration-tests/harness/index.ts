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

const devtools = "DEV_TOOLS" in process.env;
// Default to testing only the credentials that does not require manual interactions.
const testCredentials =
    process.env.TEST_CREDENTIALS || "anonymous,email-password,function";

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
                BASE_URL: JSON.stringify("http://localhost:8080"),
                TEST_CREDENTIALS: JSON.stringify(testCredentials.split(",")),
            }),
        ],
    });

    // Start the webpack-dev-server
    const devServer = new WebpackDevServer(compiler, {
        proxy: { "/api": baseUrl },
        historyApiFallback: true,
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
    if (issues.length > 0) {
        const summary = issues.join("\n");
        throw new Error(
            `An error or warning was logged in the browser:\n${summary}`,
        );
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
