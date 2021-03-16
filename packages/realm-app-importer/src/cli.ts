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

import yargs from "yargs";
import path from "path";
import fs from "fs";
import http from "http";

import { RealmAppImporter } from "./RealmAppImporter";

/* eslint-disable no-console */

function saveAppId(appId: string, filePath: string): void {
    console.log(`Saving app id in "${filePath}"`);
    fs.writeFileSync(filePath, appId, "utf8");
}

function serveAppId(appId: string, port: number, hostname = "0.0.0.0"): void {
    const server = http.createServer((req, res) => {
        res.setHeader("content-type", "text/plain");
        res.end(appId, "utf8");
    });
    // Listen for connections
    server.listen(port, hostname, () => {
        const address = server.address();
        if (typeof address === "object" && address) {
            const url = `http://${address.address}:${address.port}`;
            console.log(`Serving app id via ${url}`);
        }
    });
}

yargs
    .command(
        "$0 <template-path>",
        "Import a Realm App",
        args =>
            args
                .positional("template-path", {
                    type: "string",
                    demandOption: true,
                    coerce: path.resolve,
                    description: "Path of the application directory to import",
                })
                .option("base-url", {
                    type: "string",
                    default: "http://localhost:9090",
                    description:
                        "Base url of the MongoDB Realm server to import the app into",
                })
                .option("username", {
                    type: "string",
                    default: "unique_user@domain.com",
                    description: "Username of an adminstrative user",
                })
                .option("password", {
                    type: "string",
                    default: "password",
                    description: "Password of an adminstrative user",
                })
                .option("config", {
                    type: "string",
                    description:
                        "Path for the realm-cli configuration to temporarily store credentials",
                    coerce: path.resolve,
                    default: "realm-config",
                })
                .option("apps-directory-path", {
                    type: "string",
                    description:
                        "Path to temporarily copy the app while importing it",
                    default: "imported-apps",
                    coerce: path.resolve,
                })
                .option("app-id-path", {
                    type: "string",
                    coerce: path.resolve,
                    description: "Saves the app id to a file at this path",
                })
                .option("app-id-port", {
                    type: "number",
                    description:
                        "Starts up an HTTP server and serves the app id",
                })
                .option("clean-up", {
                    type: "boolean",
                    description:
                        "Should the tool delete temporary files when exiting?",
                    default: true,
                }),
        ({
            "template-path": templatePath,
            "base-url": baseUrl,
            username,
            password,
            config: realmConfigPath,
            "apps-directory-path": appsDirectoryPath,
            "app-id-path": appIdPath,
            "app-id-port": appIdPort,
            "clean-up": cleanUp,
        }) => {
            const importer = new RealmAppImporter({
                baseUrl,
                username,
                password,
                realmConfigPath,
                appsDirectoryPath,
                cleanUp,
            });
            // Perform the import
            importer.importApp(templatePath).then(
                ({ appId }) => {
                    if (appIdPath) {
                        saveAppId(appId, appIdPath);
                    }
                    if (appIdPort) {
                        serveAppId(appId, appIdPort);
                    } else {
                        console.log("All done ...");
                        process.exit(0);
                    }
                },
                (err: Error) => {
                    console.error(err.stack);
                    process.exit(1);
                },
            );
        },
    )
    .help().argv;
