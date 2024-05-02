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

import Realm from "realm";

import { AppConfig, AppImporter, Credentials } from "@realm/app-importer";
import { mongodbServiceType } from "../utils/ExtendedAppConfigBuilder";
import { printWarningBox } from "../utils/print-warning-box";

const REALM_LOG_LEVELS = ["all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"];

const {
  syncLogLevel = "warn",
  baseUrl = "http://localhost:9090",
  reuseApp = false,
  username = "unique_user@domain.com",
  password = "password",
  publicKey,
  privateKey,
  missingServer,
} = environment;

export { baseUrl };

const allowSkippingServerTests = typeof environment.baseUrl === "undefined" && missingServer !== false;

export type AppConfigurationRelaxed = {
  id?: string;
  baseUrl?: string;
  timeout?: number;
  multiplexSessions?: boolean;
  baseFilePath?: string;
};

const credentials: Credentials =
  typeof publicKey === "string" && typeof privateKey === "string"
    ? {
        kind: "api-key",
        publicKey,
        privateKey,
      }
    : {
        kind: "username-password",
        username,
        password,
      };

const importer = new AppImporter({
  baseUrl,
  credentials,
  reuseApp,
});

function isConnectionRefused(err: unknown) {
  return (
    err instanceof Error &&
    err.cause instanceof AggregateError &&
    "code" in err.cause &&
    err.cause.code === "ECONNREFUSED"
  );
}

/** Ensure we'll only ever install a single after hook with this warning */
let skippedAppImportAfterHookInstalled = false;
function ensureSkippedAppImportAfterHook() {
  if (!skippedAppImportAfterHookInstalled) {
    skippedAppImportAfterHookInstalled = true;
    after(function (this: Mocha.Context) {
      printWarningBox(
        "Connection got refused while importing an app - skipping tests",
        "Run this with `MOCHA_REMOTE_CONTEXT=missingServer` to silence this warning",
      );
    });
  }
}

/**
 * Imports an app before the suite runs and stores an `App` instance on the test context (accessible via `this.app` of a test).
 * If the `missingServer` context is set the suite will be skipped.
 * If the import fails due to a connection refusal, the suite will be skipped and a warning printed at the end of the test run.
 */
export function importAppBefore(config: AppConfig | { config: AppConfig }, sdkConfig?: AppConfigurationRelaxed): void {
  // Unwrap when passed a builder directly
  if ("config" in config) {
    return importAppBefore(config.config, sdkConfig);
  }

  before(importAppBefore.name, async function (this: AppContext & Mocha.Context) {
    if (missingServer) {
      this.skip();
    }
    // Importing an app might take up to 5 minutes when the app has a MongoDB Atlas service enabled.
    this.longTimeout();
    if (this.app) {
      throw new Error("Unexpected app on context, use only one importAppBefore per test");
    } else {
      try {
        const { appId } = await importer.importApp(config);
        this.app = new Realm.App({ id: appId, baseUrl, ...sdkConfig });
      } catch (err) {
        if (isConnectionRefused(err) && allowSkippingServerTests) {
          ensureSkippedAppImportAfterHook();
          this.skip();
        } else {
          throw err;
        }
      }

      // Extract the sync database name from the config
      const databaseNames: (string | undefined)[] = config.services
        .filter(([service]) => service.type === mongodbServiceType)
        .map(([service]) => {
          if ("sync" in service.config) {
            return service.config.sync.database_name;
          } else if ("flexible_sync" in service.config) {
            return service.config.flexible_sync.database_name;
          }
        })
        .filter((name) => typeof name === "string");
      if (databaseNames.length === 1 && databaseNames[0]) {
        this.databaseName = databaseNames[0];
      } else if (databaseNames.length > 1) {
        throw new Error("Expected at most 1 database name in the config");
      }

      Realm.App.Sync.setLogLevel(this.app, "warn");
      // Set a default logger as Android does not forward stdout
      Realm.App.Sync.setLogger(this.app, (level, message) => {
        const time = new Date().toISOString().split("T")[1].replace("Z", "");
        const magentaTime = `\x1b[35m${time}`;
        const greenLogLevel = `\x1b[32m${REALM_LOG_LEVELS[level].toUpperCase()}`;
        const whiteMessage = `\x1b[37m${message}}`;

        console.log(`${magentaTime}: ${greenLogLevel}:\t${whiteMessage}`);
      });
    }
  });

  after("removeUsersAfter", async function (this: Partial<AppContext> & Mocha.Context) {
    const { app } = this;
    if (app) {
      await Promise.all(
        Object.values(app.allUsers).map(async (user) => {
          try {
            await app.removeUser(user);
          } catch (err) {
            // Users might miss a refresh token
            if (!(err instanceof Error) || !err.message.includes("failed to find refresh token")) {
              throw err;
            }
          }
        }),
      );
    }
  });
}
