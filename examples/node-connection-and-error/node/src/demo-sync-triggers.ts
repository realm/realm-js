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

import type Realm from "realm";
import { BSON, ConnectionState, SyncError } from "realm";

import { Store } from "./models/Store";
import { getCurrentUser } from "./demo-auth-triggers";
import { getRealm } from "./store-manager";
import { logger } from "./utils/logger";

let isConnected = false;

/**
 * The connection listener - Will be invoked when the the underlying sync
 * session changes its connection state.
 *
 * @note
 * Be aware of that there may be a delay from the time of actual disconnect
 * until this listener is invoked.
 */
export function handleConnectionChange(newState: ConnectionState, oldState: ConnectionState): void {
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
  } else /* failedReconnecting */ {
    logger.info("Failed to reconnect.");
  }

  isConnected = connected;
}

/**
 * Trigger the connection listener by reconnecting to the sync session.
 */
function reconnect(): void {
  getRealm()?.syncSession?.resume();
}

/**
 * Trigger the connection listener by disconnecting from the sync session.
 */
function disconnect(): void {
  getRealm()?.syncSession?.pause();
}

/**
 * The sync error listener - Will be invoked when various synchronization errors occur.
 *
 * To trigger, for instance, a session level sync error, you may modify the Document
 * Permissions in Atlas App Services to NOT allow `Delete`, then rerun this app since
 * this example will always delete all items in the database at startup.
 * For how to modify the rules and permissions, see:
 * {@link https://www.mongodb.com/docs/atlas/app-services/rules/roles/#define-roles---permissions}.
 *
 * For detailed error codes, see {@link https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes}.
 * Examples:
 * - 202 (Access token expired)
 * - 225 (Invalid schema change)
 */
export function handleSyncError(session: Realm.App.Sync.SyncSession, error: SyncError): void {
  logger.error(error);
}

/**
 * Trigger the sync error listener by trying to create a `Store` that
 * is outside of the query filter subscribed to. Since we subscribed
 * to the store with a given ID (see `openRealm/()`), attempting to
 * create one with a different ID will generate a sync error.
 *
 * @note
 * You can also trigger sync errors by modifying the permissions of
 * fields and/or collections, and then try to perform non-permitted
 * operations from the client. To read more about permissions, see:
 * {@link https://www.mongodb.com/docs/atlas/app-services/rules/roles/#define-roles---permissions}
 */
export function triggerSyncError(): void {
  logger.info("Triggering sync error...");
  const realm = getRealm();
  realm?.write(() => {
    const NON_SUBSCRIBED_STORE_ID = new BSON.ObjectId();
    realm.create(Store, {_id: NON_SUBSCRIBED_STORE_ID});
  });
}

/**
 * The pre-client reset listener - Will be invoked before sync initiates
 * a client reset.
 */
export function handlePreClientReset(localRealm: Realm): void {
  logger.info("Initiating client reset...");
}

/**
 * The post-client reset listener - Will be invoked after a client reset.
 */
export function handlePostClientReset(localRealm: Realm, remoteRealm: Realm): void {
  logger.info("Client has been reset.");
}

/**
 * Trigger the client reset listeners by calling a custom Atlas Function
 * (see `backend/functions/triggerClientReset.js`) that deletes the client
 * files for the current user.
 *
 * @note
 * This should NOT be used in production.
 */
export async function triggerClientReset(): Promise<void> {
  logger.info("Triggering client reset ...");
  await getCurrentUser()?.functions.triggerClientReset();
  // Once the client tries to reconnect, the client reset will be triggered.
  if (isConnected) {
    disconnect();
  }
  reconnect();
}
