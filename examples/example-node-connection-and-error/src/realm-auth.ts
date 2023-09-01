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

import process from "node:process";
import Realm, {
  ClientResetMode,
  CollectionChangeCallback,
  ConfigurationWithSync,
  ConnectionState,
  Credentials,
  SyncError,
  UserState,
} from "realm";

import { SYNC_STORE_ID } from "./atlas-app-services/config";
import { getAtlasApp } from "./atlas-app-services/getAtlasApp";
import { Store } from "./models/Store";
import { Kiosk } from "./models/Kiosk";
import { Product } from "./models/Product";
import { logger } from "./logger";

const app = getAtlasApp();
let currentUser: Realm.User | null = null;
let originalAccessToken: string | null = null;
let realm: Realm | null = null;

// Exported for use by `./realm-query.ts`
export function getRealm(): Realm | null {
  return realm;
}

function resetUser(): void {
  currentUser?.removeAllListeners();
  currentUser = null;
  originalAccessToken = null;
}

/**
 * The user listener - Will be invoked on various user related events including
 * refresh of auth token, refresh token, custom user data, and logout.
 */
function handleUserEventChange(): void {
  if (currentUser) {
    // Currently we don't provide any arguments to this callback but we have opened
    // a ticket for this (see https://github.com/realm/realm-core/issues/6454). To
    // detect that a token has been refreshed (which can also be manually triggered
    // by `await user.refreshCustomData()`), the original access token can be saved
    // to a variable and compared against the current one.
    if (originalAccessToken !== currentUser.accessToken) {
      logger.info("Refreshed access token.");
      originalAccessToken = currentUser.accessToken;
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
        break;
    }
  }
}

/**
 * The connection listener - Will be invoked when the the underlying sync
 * session changes its connection state.
 */
function handleConnectionChange(newState: ConnectionState, oldState: ConnectionState): void {
  const connecting = newState === ConnectionState.Connecting;
  const connected = newState === ConnectionState.Connected;
  const disconnected = oldState === ConnectionState.Connected && newState === ConnectionState.Disconnected;
  const failedReconnecting = oldState === ConnectionState.Connecting && newState === ConnectionState.Disconnected;

  if (connecting) {
    logger.info("Connecting...");
  } else if (connected) {
    logger.info("Connected.");
  } else if (disconnected) {
    logger.info("Disconnected.");

    // At this point, the `newState` is `ConnectionState.Disconnected`. Automatic retries
    // will start and the state will alternate in the following way for the period where
    // there is NO network connection:
    //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
    //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected

    // Calling `App.Sync.reconnect()` is not needed due to automatic retries.

    // Be aware of that there may be a delay from the time of actual disconnect until this
    // listener is invoked.
  } else /* failedReconnecting */ {
    logger.info("Failed to reconnect.");
  }
}

/**
 * The sync error listener - Will be invoked when various synchronization errors occur.
 *
 * @see {@link https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes | error codes }
 * for detailed error codes. Examples:
 * - 202 (Access token expired)
 * - 225 (Invalid schema change)
 */
function handleSyncError(session: Realm.App.Sync.SyncSession, error: SyncError): void {
  if (error.code >= 100 && error.code < 200) {
    logger.error(`Connection level and protocol error: ${error.message}. ${JSON.stringify(error)}`);
  } else if (error.code >= 200 && error.code < 300) {
    logger.error(`Session level error: ${error.message}. ${JSON.stringify(error)}`);
  } else {
    // Should not be reachable.
    logger.error(`Unexpected error code: ${error.code}. ${JSON.stringify(error)}`);
  }
}

function handlePreClientReset(localRealm: Realm): void {
  logger.info("Initiating client reset...");
}

function handlePostClientReset(localRealm: Realm, remoteRealm: Realm) {
  logger.info("Client has been reset.");
}

/**
 * The products collection listener - Will be invoked when the listener is added
 * and whenever an object in the collection is deleted, inserted, or modified.
 * (Always handle potential deletions first.)
 */
const handleProductsChange: CollectionChangeCallback<Product, [number, Product]> = (products, changes) => {
  logger.info("Products changed.");
}

/**
 * Register a user to an Atlas App Services App.
 *
 * For this simplified example, the app is configured via the Atlas App Services UI
 * to automatically confirm users' emails.
 */
export async function register(email: string, password: string): Promise<boolean> {
  try {
    logger.info("Registering...");
    await app.emailPasswordAuth.registerUser({ email, password });
    logger.info("Registered.");
    return true;
  } catch (err: any) {
    if (err?.message?.includes("name already in use")) {
      logger.info("Already registered.");
      return true;
    }
    logger.error(`Error registering: ${err?.message}`);
    return false;
  }
};

/**
 * Log in a user to an Atlas App Services App.
 *
 * Access tokens are created once a user logs in. These tokens are refreshed
 * automatically by the SDK when needed. Manually refreshing the token is only
 * required if requests are sent outside of the SDK. If that's the case, see:
 * https://www.mongodb.com/docs/realm/sdk/node/examples/authenticate-users/#get-a-user-access-token
 *
 * By default, refresh tokens expire 60 days after they are issued. You can configure this
 * time for your App's refresh tokens to be anywhere between 30 minutes and 180 days. See:
 * https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration
 */
export async function logIn(email: string, password: string): Promise<boolean> {
  // If there is already a logged in user, there is no need to reauthenticate.
  if (currentUser) {
    return true;
  }

  try {
    logger.info("Logging in...");
    // The credentials here can be substituted using a JWT or another preferred method.
    currentUser = await app.logIn(Credentials.emailPassword(email, password));
    originalAccessToken = currentUser.accessToken;
    logger.info("Logged in.");

    // Listen for changes to user-related events.
    currentUser.addListener(handleUserEventChange);
    return true;
  } catch (err: any) {
    logger.error(`Error logging in: ${err?.message}`);
    return false;
  }
}

export async function logOut(): Promise<void> {
  if (currentUser) {
    logger.info("Logging out...");
    await currentUser.logOut();
    // The `currentUser` variable is being set to `null` in the user listener.
  }
}

/**
 * Configure and open the synced realm.
 */
export async function openRealm(): Promise<void> {
  try {
    if (!currentUser) {
      throw new Error("The user needs to be logged in before the synced Realm can be opened.");
    }

    const config: ConfigurationWithSync = {
      schema: [Store, Kiosk, Product],
      sync: {
        user: currentUser,
        // To read more about flexible sync and subscriptions, see:
        // https://www.mongodb.com/docs/realm/sdk/node/examples/flexible-sync/
        flexible: true,
        initialSubscriptions: {
          // When adding subscriptions, best practice is to name each subscription
          // for better managing removal of them.
          update: (mutableSubs: Realm.App.Sync.MutableSubscriptionSet, realm: Realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(
              realm.objects(Store).filtered("_id = $0", SYNC_STORE_ID),
              { name: "storeA" },
            );
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(
              realm.objects(Kiosk).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "kiosksInStoreA" },
            );
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(
              realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "productsInStoreA" },
            );
          },
        },
        // The `ClientResetMode.RecoverOrDiscardUnsyncedChanges` will download a fresh copy
        // from the server if recovery of unsynced changes is not possible. For read-only
        // clients, `ClientResetMode.DiscardUnsyncedChanges` is suitable.
        // Regarding manual client resets, the deprecated `Realm.App.Sync.initiateClientReset()`
        // was meant for use only when the `clientReset` property on the sync configuration is
        // set to `ClientResetMode.Manual`. To read more about manual client reset data recovery,
        // see: https://www.mongodb.com/docs/realm/sdk/node/advanced/client-reset-data-recovery/
        clientReset: {
          mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges,
          onBefore: handlePreClientReset,
          onAfter: handlePostClientReset,
        },
        // The old property for the error callback was called `error`, please use `onError`.
        onError: handleSyncError,
      },
    };

    logger.info("Opening realm...");
    realm = await Realm.open(config);
    logger.info("Realm opened.");
    
    // Listen for changes to the connection. (Explicitly removing the connection
    // listener is not needed if you intend for it to live throughout the session.)
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    // Listen for changes to the products at the given store ID.
    realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID).addListener(handleProductsChange);
  } catch (err: any) {
    logger.error(`Error opening the realm: ${err?.message}`);
    throw err;
  }
}

function closeRealm(): void {
  if (realm && !realm.isClosed) {
    logger.info("Closing the realm...");
    realm.close();
    logger.info("Realm closed.");
  }
  realm = null;
}

function handleExit(code: number): void {
  closeRealm();
  logger.info(`Exiting with code ${code}.`);
}

process.on("exit", handleExit);
process.on("SIGINT", process.exit);

// MISCELLANEOUS NOTES:
// --------------------
// * Convenience method to check if connected: `app.syncSession?.isConnected()`
// * Get user's access token: `user.accessToken`
// * Get user's refresh token: `user.refreshToken`
// * See more information on error handling: https://www.mongodb.com/docs/atlas/app-services/sync/error-handling/
// * Removing the local database (directory: mongodb-realm/) can be useful for certain errors.
//   * For this example app, the helper command `npm run rm-local-db` is provided.
