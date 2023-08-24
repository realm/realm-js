import process from "node:process";
import Realm, {
  ClientResetMode,
  CollectionChangeCallback,
  ConfigurationWithSync,
  ConnectionState,
  Credentials,
  MutableSubscriptionSet,
  SyncError,
  SyncSession,
  UserState,
} from "realm";

import { StoreSchema } from "./models/Store";
import { KioskSchema } from "./models/Kiosk";
import { ProductSchema } from "./models/Product";
import { SYNC_STORE_ID } from "./atlas-app-services/config";
import { getAtlasApp } from "./atlas-app-services/getAtlasApp";
import { logger } from "./logger";

const app = getAtlasApp();
let currentUser: Realm.User | null = null;
let originalAccessToken: string | null = null;
let realm: Realm | null = null;

// Exported for use by `./realm-query.js`
export function getRealm(): Realm | null {
  return realm;
}

function resetUser(): void {
  currentUser?.removeAllListeners();
  currentUser = null;
  originalAccessToken = null;
}

// The user listener will be invoked on various user related events including
// refresh of auth token, refresh token, custom user data, and logout.
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

// The connection listener will be invoked when the the underlying sync session
// changes its connection state.
function handleConnectionChange(newState: ConnectionState, oldState: ConnectionState): void {
  const connecting = newState === ConnectionState.Connecting;
  const connected = newState === ConnectionState.Connected;
  const disconnected = oldState === ConnectionState.Connected && newState === ConnectionState.Disconnected;
  const failedReconnecting = oldState === ConnectionState.Connecting && newState === ConnectionState.Disconnected;

  if (connecting) {
    logger.info(`Connecting...`);
  } else if (connected) {
    logger.info(`Connected.`);
  } else if (disconnected) {
    logger.info(`Disconnected.`);

    // At this point, the `newState` is `ConnectionState.Disconnected`. Automatic retries
    // will start and the state will alternate in the following way for the period where
    // there is NO network connection:
    //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
    //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected

    // Calling `App.Sync.reconnect()` is not needed due to automatic retries.

    // Be aware of that there may be a delay from the time of actual disconnect until this
    // listener is invoked.
  } else /* failedReconnecting */ {
    logger.info(`Failed to reconnect.`);
  }
}

function handleSyncError(session: SyncSession, error: SyncError): void {
  // For error codes see: https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes
  // * Examples:
  //   * 100 (Connection closed, no error)
  //   * 202 (Access token expired)
  if (error.code >= 100 && error.code < 200) {
    logger.error(`Connection level and protocol error: ${error.message}. ${JSON.stringify(error)}`);
  } else if (error.code >= 200 && error.code < 300) {
    logger.error(`Session level error: ${error.message}. ${JSON.stringify(error)}`);
  } else {
    // Should not be reachable.
    logger.error(`Unexpected error code: ${error.code}. ${JSON.stringify(error)}`);
  }

  // Regarding manual client resets. The deprecated `Realm.App.Sync.initiateClientReset()`
  // is meant for use only when the `clientReset` property on the sync configuration is
  // set to `ClientResetMode.Manual` and should not be needed when using
  // `ClientResetMode.DiscardUnsyncedChanges`.
}

function handlePreClientReset(localRealm: Realm): void {
  // To read more about manual client reset data recovery, see:
  // https://www.mongodb.com/docs/realm/sdk/node/advanced/client-reset-data-recovery/
  logger.info(`Initiating client reset...`);
}

function handlePostClientReset(localRealm: Realm, remoteRealm: Realm) {
  logger.info(`Client has been reset.`);
}

// The collection listener will be invoked when the listener is added and
// whenever an object in the collection is deleted, inserted, or modified.
// (Always handle potential deletions first.)
const handleProductsChange: CollectionChangeCallback = (products, changes) => {
  logger.info("Products changed.");
}

export async function register(email: string, password: string): Promise<boolean> {
  try {
    logger.info("Registering...");
    // For this simplified example, the app is configured via the Atlas App Services UI
    // to automatically confirm users' emails.
    await app.emailPasswordAuth.registerUser({ email, password });
    logger.info("Registered.");
    return true;
  }
  catch (err: any) {
    if (err?.message?.includes("name already in use")) {
      logger.info("Already registered.");
      return true;
    }
    logger.error(`Error registering: ${err?.message}`);
    return false;
  }
};

export async function logIn(email: string, password: string): Promise<boolean> {
  // Access tokens are created once a user logs in. These tokens are refreshed
  // automatically by the SDK when needed. Manually refreshing the token is only
  // required if requests are sent outside of the SDK. If that's the case, see:
  // https://www.mongodb.com/docs/realm/sdk/node/examples/authenticate-users/#get-a-user-access-token

  // By default, refresh tokens expire 60 days after they are issued. You can configure this
  // time for your App's refresh tokens to be anywhere between 30 minutes and 180 days. See:
  // https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration

  if (currentUser) {
    return true;
  }

  try {
    logger.info("Logging in...");
    // The credentials here can be substituted using a JWT or another preferred method.
    currentUser = await app.logIn(Credentials.emailPassword(email, password));
    originalAccessToken = currentUser.accessToken;
    logger.info("Logged in.");
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

export async function openRealm(): Promise<void> {
  if (!currentUser) {
    throw new Error("The user needs to be logged in before the synced Realm can be opened.");
  }

  try {
    const config: ConfigurationWithSync = {
      schema: [StoreSchema, KioskSchema, ProductSchema],
      sync: {
        user: currentUser,
        // To read more about flexible sync and subscriptions, see:
        // https://www.mongodb.com/docs/realm/sdk/node/examples/flexible-sync/
        flexible: true,
        initialSubscriptions: {
          // When adding subscriptions, best practice is to name each subscription
          // for better managing removal of them.
          update: (mutableSubs: MutableSubscriptionSet, realm: Realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(
              realm.objects(StoreSchema.name).filtered("_id = $0", SYNC_STORE_ID),
              { name: "storeA" },
            );
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(
              realm.objects(KioskSchema.name).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "kiosksInStoreA" },
            );
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(
              realm.objects(ProductSchema.name).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "productsInStoreA" },
            );
          },
        },
        clientReset: {
          // Download a fresh copy from the server if recovery of unsynced changes is not possible.
          mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges,
          onBefore: handlePreClientReset,
          onAfter: handlePostClientReset,
          // For read-only clients, `ClientResetMode.DiscardUnsyncedChanges` is suitable.
        },
        // The old property for the error callback was called `error`, please use `onError`.
        onError: handleSyncError,
      },
    };
    logger.info("Opening realm...");
    realm = await Realm.open(config);
    logger.info("Realm opened.");
    
    // Explicitly removing the connection listener is not needed if you intend for it
    // to live throughout the session.
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    realm.objects(ProductSchema.name).filtered("storeId = $0", SYNC_STORE_ID).addListener(handleProductsChange);
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
  logger.info(`Exiting with code ${code}...`);
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
