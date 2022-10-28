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
import chalk from "chalk";

import { AppImporter, ImportedApp } from "./AppImporter";
import { Credentials } from "./sharedTypes";
import { AppImportServer } from "./AppImportServer";

/* eslint-disable no-console */

function saveAppIds(apps: ImportedApp[], filePath: string): void {
  console.log(`Saving app ids in "${filePath}"`);
  fs.writeFileSync(filePath, JSON.stringify(apps, undefined, 2), "utf8");
}

function serveAppIds(apps: ImportedApp[], port: number, hostname = "0.0.0.0"): void {
  const server = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(apps, undefined, 2), "utf8");
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

/**
 * Expands a path to a directory containing apps configurations.
 */
function resolveAppName(templatePath: string): string | null {
  const configPath = path.resolve(templatePath, "config.json");
  if (fs.existsSync(configPath)) {
    const configJson = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (typeof configJson.name === "string") {
      return configJson.name;
    }
  }
  return null;
}

/**
 * Expands a path to a directory containing apps configurations.
 */
function resolveAppTemplates(paths: string[]): Record<string, string> {
  return Object.fromEntries(
    paths
      .map((templatePath: string) => {
        const appName = resolveAppName(templatePath);
        if (appName) {
          return [[appName, templatePath]];
        } else {
          // This might be a directory of app templates
          const fileNames = fs.readdirSync(templatePath);
          return fileNames
            .map((fileName: string) => {
              const potentialPath = path.resolve(templatePath, fileName);
              const potentialName = resolveAppName(potentialPath);
              if (potentialName) {
                // We found an app
                return [potentialName, potentialPath];
              } else {
                return [];
              }
            })
            .filter((entry) => entry.length > 0);
        }
      })
      .flat(),
  );
}

const DEFAULTS = {
  baseUrl: process.env.REALM_BASE_URL || "http://localhost:9090",
  username: process.env.REALM_USERNAME || "unique_user@domain.com",
  password: process.env.REALM_PASSWORD || "password",
  publicKey: process.env.REALM_PUBLIC_KEY,
  privateKey: process.env.REALM_PRIVATE_KEY,
};

type CredentialsOptions = {
  username: string;
  password: string;
  publicKey: string | undefined;
  privateKey: string | undefined;
};

/*
 * Get the credentials from the runtime parameters
 */
function getCredentials({ username, password, publicKey, privateKey }: CredentialsOptions): Credentials {
  if (typeof publicKey === "string" && typeof privateKey === "string") {
    if (username !== DEFAULTS.username || password !== DEFAULTS.password) {
      throw new Error("Provide either --username and --password or --api-key, not all three");
    } else {
      return { kind: "api-key", publicKey, privateKey };
    }
  } else {
    return { kind: "username-password", username, password };
  }
}

yargs
  .option("base-url", {
    type: "string",
    default: DEFAULTS.baseUrl,
    description: "Base url of Altas App Services to import the app into",
  })
  .option("username", {
    type: "string",
    default: DEFAULTS.username,
    description: "Username of an administrative user",
  })
  .option("password", {
    type: "string",
    default: DEFAULTS.password,
    description: "Password of an administrative user",
  })
  .option("public-api-key", {
    type: "string",
    default: DEFAULTS.publicKey,
    description: "Public part of API key with administrative privileges",
  })
  .option("private-api-key", {
    type: "string",
    default: DEFAULTS.privateKey,
    description: "Private part of API key with administrative privileges",
  })
  .option("apps-directory-path", {
    type: "string",
    description: "Path to temporarily copy the app while importing it",
    default: "imported-apps",
    coerce: path.resolve,
  })
  .option("config", {
    type: "string",
    description: "Path for the realm-cli configuration to temporarily store credentials",
    coerce: path.resolve,
    default: "realm-config",
  })
  .option("clean-up", {
    type: "boolean",
    description: "Should the tool delete temporary files when exiting?",
    default: true,
  })
  .command(
    ["import <template-path>", "$0"],
    "Import a Realm App",
    (args) =>
      args
        .positional("template-path", {
          type: "string",
          demandOption: true,
          coerce: path.resolve,
          description: "Path of the application directory to import",
        })
        .option("app-id-path", {
          type: "string",
          coerce: path.resolve,
          description: "Saves the app id(s) to a file at this path",
        })
        .option("app-id-port", {
          type: "number",
          description: "Starts up an HTTP server and serves the app id(s)",
        }),
    ({
      "template-path": templatePath,
      "base-url": baseUrl,
      username,
      password,
      "public-api-key": publicKey,
      "private-api-key": privateKey,
      config: realmConfigPath,
      "apps-directory-path": appsDirectoryPath,
      "app-id-path": appIdPath,
      "app-id-port": appIdPort,
      "clean-up": cleanUp,
    }) => {
      const credentials = getCredentials({ username, password, publicKey, privateKey });
      console.log(`Importing into "${baseUrl}" (using ${credentials.kind} credentials)`);
      const importer = new AppImporter({
        baseUrl,
        credentials,
        realmConfigPath,
        appsDirectoryPath,
        cleanUp,
      });
      // Perform the import
      importer.importApp(templatePath).then(
        (app) => {
          if (appIdPath) {
            saveAppIds([app], appIdPath);
          }
          if (appIdPort) {
            serveAppIds([app], appIdPort);
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
  .command(
    ["import <template-path..>", "$0"],
    "Import a Realm App(s)",
    (args) =>
      args
        .positional("template-path", {
          type: "string",
          array: true,
          demandOption: true,
          coerce: (values: string[]) => values.map((p) => path.resolve(p)),
          description: "Path of the application directory to import",
        })
        .option("app-id-path", {
          type: "string",
          coerce: path.resolve,
          description: "Saves the app id to a file at this path",
        })
        .option("app-id-port", {
          type: "number",
          description: "Starts up an HTTP server and serves the app id",
        }),
    ({
      "template-path": templatePaths,
      "base-url": baseUrl,
      username,
      password,
      "public-api-key": publicKey,
      "private-api-key": privateKey,
      config: realmConfigPath,
      "apps-directory-path": appsDirectoryPath,
      "app-id-path": appIdPath,
      "app-id-port": appIdPort,
      "clean-up": cleanUp,
    }) => {
      const credentials = getCredentials({ username, password, publicKey, privateKey });
      console.log(`Importing into "${baseUrl}" (using ${credentials.kind} credentials)`);
      const importer = new AppImporter({
        baseUrl,
        credentials,
        realmConfigPath,
        appsDirectoryPath,
        cleanUp,
      });
      // Perform the import
      importer.importApps(templatePaths).then(
        (apps) => {
          if (appIdPath) {
            saveAppIds(apps, appIdPath);
          }
          if (appIdPort) {
            serveAppIds(apps, appIdPort);
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
  .command(
    "serve <template-path..>",
    "Start serving an HTTP server capable of importing apps",
    (args) =>
      args
        .positional("template-path", {
          type: "string",
          array: true,
          demandOption: true,
          coerce: (values: string[]) => values.map((p) => path.resolve(p)),
          description: "Path of the application directory (or a directory of these) to import",
        })
        .option("hostname", {
          type: "string",
          description: "Hostname used when listening for connections",
        })
        .option("port", {
          type: "number",
          description: "Port used when listening for connections",
          default: 8091,
        }),
    ({
      "template-path": templatePaths,
      "base-url": baseUrl,
      username,
      password,
      "public-api-key": publicKey,
      "private-api-key": privateKey,
      config: realmConfigPath,
      "apps-directory-path": appsDirectoryPath,
      "clean-up": cleanUp,
      hostname,
      port,
    }) => {
      const appTemplates = resolveAppTemplates(templatePaths);
      const credentials = getCredentials({ username, password, publicKey, privateKey });
      const importer = new AppImporter({
        baseUrl,
        credentials,
        realmConfigPath,
        appsDirectoryPath,
        cleanUp,
      });

      const server = new AppImportServer(importer, {
        hostname,
        port,
        appTemplates,
      });

      console.log("Starting Realm App Import Server, serving:");
      for (const [name, templatePath] of Object.entries(appTemplates)) {
        const relativePath = path.relative(process.cwd(), templatePath);
        console.log("↳", name, chalk.dim(`(./${relativePath})`));
      }
      console.log(`Importing into "${baseUrl}" (using ${credentials.kind} credentials)`);
      console.log();

      server.start().then(
        (server) => {
          console.log(chalk.green("LISTENING"), `Listening on ${server.url}`);
        },
        (err: Error) => {
          console.error(chalk.red("ERROR"), "Failed to start:", err.stack);
          process.exit(1);
        },
      );
    },
  )
  .help().argv;
