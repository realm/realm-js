////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import {
  addDummyData,
  updateDummyData,
  deleteDummyData,
  getStore,
  openRealm,
} from "./store-manager";
import {
  registerSuccessfully,
  registerWithInvalidCredentials,
  registerWithEmailAlreadyInUse,
  logInSuccessfully,
  logInWithInvalidCredentials,
  logInWithNonExistentCredentials,
  refreshAccessToken,
} from "./demo-auth-triggers";
import { triggerClientReset, triggerSyncError } from "./demo-sync-triggers";
import { logger } from "./utils/logger";

// To diagnose and troubleshoot errors while in development, set the log level to `debug`
// or `trace`. For production deployments, decrease the log level for improved performance.
// logLevels = ["all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"];
// You may import `NumericLogLevel` to get them as numbers starting from 0 (`all`).
Realm.setLogLevel("error");
Realm.setLogger((logLevel, message) => {
  const formattedMessage = `Log level: ${logLevel} - Log message: ${message}`;
  if (logLevel === 'error' || logLevel === 'fatal') {
    logger.error(formattedMessage);
  } else {
    logger.info(formattedMessage);
  }
});

/**
 * Command options for triggering various scenarios and error messages.
 */
const enum CommandOption {
  /**
   * Successfully register and log in a user and run the app.
   */
  Success = "success",
  /**
   * Register a user with invalid credentials.
   */
  RegisterInvalid = "register-invalid",
  /**
   * Register a user with an email already in use.
   */
  RegisterEmailInUse = "register-email-in-use",
  /**
   * Log in a user with invalid credentials.
   */
  LoginInvalid = "login-invalid",
  /**
   * Log in a user with an email that does not exist (but valid credentials).
   */
  LoginNonExistentEmail = "login-non-existent-email",
  /**
   * Log in a user and trigger a sync error.
   */
  SyncError = "sync-error",
  /**
   * Log in a user and trigger a client reset.
   */
  ClientReset = "client-reset",
};

/**
 * Entry point.
 */
async function main(): Promise<void> {
  let [,, action] = process.argv;
  switch (action) {
    case CommandOption.Success:
      await successScenario();
      return;
    case CommandOption.RegisterInvalid:
      await registerWithInvalidCredentials();
      return exit(1);
    case CommandOption.RegisterEmailInUse:
      await registerWithEmailAlreadyInUse();
      return exit(1);
    case CommandOption.LoginInvalid:
      await logInWithInvalidCredentials();
      return exit(1);
    case CommandOption.LoginNonExistentEmail:
      await logInWithNonExistentCredentials();
      return exit(1);
    case CommandOption.SyncError:
      await syncErrorScenario();
      return;
    case CommandOption.ClientReset:
      await clientResetScenario();
      return;
    default:
      throw new Error(`Invalid option passed: ${action}.`);
  }
}

/**
 * Illustrates the flow of successfully registering, logging in,
 * and opening a Realm.
 */
async function logInAndOpenRealm(): Promise<void> {
  let success = await registerSuccessfully();
  if (!success) {
    exit(1);
  }

  success = await logInSuccessfully();
  if (!success) {
    exit(1);
  }

  await openRealm();
}

/**
 * Invokes operations for modifying data and triggering listeners.
 */
async function successScenario(): Promise<void> {
  await logInAndOpenRealm();

  // Cleaning the DB for this example before continuing.
  deleteDummyData();
  addDummyData();

  // Print a kiosk and its products.
  const firstKiosk = getStore()?.kiosks[0];
  if (firstKiosk) {
    logger.info("Printing the first Kiosk:");
    logger.info(JSON.stringify(firstKiosk, null, 2));
  }

  // Manually trigger specific listeners.
  updateDummyData();
  await refreshAccessToken();
}

/**
 * Triggers a sync error.
 */
async function syncErrorScenario(): Promise<void> {
  await logInAndOpenRealm();
  triggerSyncError();
}

/**
 * Triggers a client reset.
 */
async function clientResetScenario(): Promise<void> {
  await logInAndOpenRealm();
  await triggerClientReset();
}

function exit(code: number): never {
  return process.exit(code);
}

main();
