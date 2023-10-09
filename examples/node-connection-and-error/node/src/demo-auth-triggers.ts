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

import Realm, { Credentials, UserState } from "realm";

import { getAtlasApp } from "./atlas-app-services/getAtlasApp";
import { getIntBetween } from "./utils/random";
import { logger } from "./utils/logger";

// ===== DUMMY CREDENTIALS =====

type EmailPasswordCredentials = {
  email: string;
  password: string;
};

const VALID_PASSWORD = '123456';

const NON_EXISTENT_CREDENTIALS: EmailPasswordCredentials = {
  email: 'non-existent@email.com',
  password: VALID_PASSWORD,
};

const INVALID_CREDENTIALS: EmailPasswordCredentials = {
  email: 'invalid',
  password: '1',
};

function generateDummyEmail(): string {
  return `${getIntBetween(0, 100_000)}@email.com`;
}

function getNewValidCredentials(): EmailPasswordCredentials {
  return {
    email: generateDummyEmail(),
    password: VALID_PASSWORD,
  };
}

function getExistingCredentials(
  registeredEmail: string,
): EmailPasswordCredentials {
  return {
    email: registeredEmail,
    password: VALID_PASSWORD,
  };
}

// ===== AUTH OPERATIONS =====

const app = getAtlasApp();
let currentUser: Realm.User | null = null;
let mostRecentAccessToken: string | null = null;

function resetUser(): void {
  currentUser?.removeListener(handleUserEventChange);
  currentUser = null;
  mostRecentAccessToken = null;
}

export function getCurrentUser(): Realm.User | null {
  return currentUser;
}

/**
 * An email that has been registered but the user has not yet logged in.
 */
let pendingEmail: string | undefined;

function getRegisteredEmail(): string {
  // The user will only appear in `app.allUsers` once it has logged in
  // for the first time. Between registration and login, the user status
  // will be "Pending User Login" which can be seen in the App Services UI.
  // If the app is restarted while the user is logged out, `app.allUsers`
  // will be empty on startup.
  const allUsers = Object.values(app.allUsers);
  return pendingEmail ?? allUsers[allUsers.length - 1]?.profile.email!;
}

/**
 * Register a user to an Atlas App Services App.
 *
 * For this simplified example, the app is configured via the Atlas App Services UI
 * to automatically confirm users' emails.
 *
 * @returns A promise that resolves to `true` if the login is successful, otherwise `false`.
 */
async function register(
  credentials: EmailPasswordCredentials,
  { failIfEmailInUse } = { failIfEmailInUse: true },
): Promise<boolean> {
  try {
    logger.info("Registering...");
    await app.emailPasswordAuth.registerUser(credentials);
    logger.info("Registered.");
    return true;
  } catch (err: any) {
    if (!failIfEmailInUse && err?.message?.includes("name already in use")) {
      return true;
    }
    logger.error(`Error registering: ${err?.message}`);
    return false;
  }
};

export async function registerSuccessfully(): Promise<boolean> {
  try {
    return await registerWithEmailAlreadyInUse({ failIfEmailInUse: false });
  } catch(err) {
    const validCredentials = getNewValidCredentials();
    pendingEmail = validCredentials.email;
    return register(validCredentials, { failIfEmailInUse: false });
  }
}

export function registerWithInvalidCredentials(): Promise<boolean> {
  return register(INVALID_CREDENTIALS);
}

export async function registerWithEmailAlreadyInUse(options = { failIfEmailInUse: true }): Promise<boolean> {
  const registeredEmail = getRegisteredEmail();
  if (!registeredEmail) {
    throw new Error("You need to register a user first.");
  }
  return register(getExistingCredentials(registeredEmail), options);
}

/**
 * Log in a user to an Atlas App Services App.
 *
 * Access tokens are created once a user logs in. These tokens are refreshed
 * automatically by the SDK when needed. Manually refreshing the token is only
 * required if requests are sent outside of the SDK. If that's the case, see:
 * {@link https://www.mongodb.com/docs/realm/sdk/node/examples/authenticate-users/#get-a-user-access-token}.
 *
 * By default, refresh tokens expire 60 days after they are issued. You can configure this
 * time for your App's refresh tokens to be anywhere between 30 minutes and 180 days. See:
 * {@link https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration}.
 * 
 * @returns A promise that resolves to `true` if the login is successful, otherwise `false`.
 */
async function logIn(credentials: EmailPasswordCredentials): Promise<boolean> {
  // If there is already a logged in user, there is no need to reauthenticate.
  if (currentUser) {
    return true;
  }

  try {
    logger.info("Logging in...");
    // The credentials here can be substituted using a JWT or another preferred method.
    currentUser = await app.logIn(Credentials.emailPassword(credentials));
    mostRecentAccessToken = currentUser.accessToken;
    logger.info("Logged in.");

    // Listen for changes to user-related events.
    currentUser.addListener(handleUserEventChange);
    return true;
  } catch (err: any) {
    logger.error(`Error logging in: ${err?.message}`);
    return false;
  }
}

export function logInSuccessfully(): Promise<boolean> {
  const registeredEmail = getRegisteredEmail();
  if (!registeredEmail) {
    throw new Error("You need to register a user first.");
  }
  return logIn(getExistingCredentials(registeredEmail));
}

export function logInWithInvalidCredentials(): Promise<boolean> {
  return logIn(INVALID_CREDENTIALS);
}

export function logInWithNonExistentCredentials(): Promise<boolean> {
  return logIn(NON_EXISTENT_CREDENTIALS);
}

export async function logOut(): Promise<void> {
  if (currentUser) {
    logger.info("Logging out...");
    await currentUser.logOut();
    // The `currentUser` variable is being set to `null` in the user listener.
  }
}

/**
 * Trigger the user event listener by refreshing the custom user data
 * and thereby the access token.
 */
export async function refreshAccessToken(): Promise<void> {
  logger.info("Triggering refresh of access token...");
  await currentUser?.refreshCustomData();
}

/**
 * The user listener - Will be invoked on various user related events including
 * refresh of auth token, refresh token, custom user data, removal, and logout.
 */
export function handleUserEventChange(): void {
  if (currentUser) {
    // As the SDK currently does not provide any arguments to this callback, to be
    // able to detect whether a token has been refreshed we store the most recent
    // access token in a variable and compare it against the current one.
    if (mostRecentAccessToken !== currentUser.accessToken) {
      logger.info("New access token.");
      mostRecentAccessToken = currentUser.accessToken;
    }

    switch (currentUser.state) {
      case UserState.LoggedIn:
        logger.info(`User (id: ${currentUser.id}) has been authenticated.`);
        break;
      case UserState.LoggedOut:
        logger.info(`User (id: ${currentUser.id}) has been logged out.`);
        resetUser();
        break;
      case UserState.Removed:
        logger.info(`User (id: ${currentUser.id}) has been removed from the app.`);
        resetUser();
        break;
      default:
        // Should not be reachable.
        logger.error(`Unknown user state: ${currentUser.state}.`);
        break;
    }
  }
}
