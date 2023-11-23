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

import {useCallback, useEffect, useState} from 'react';
import {AppServicesFunction, BSON, ConnectionState, UserState} from 'realm';
import {useApp, useRealm, useUser} from '@realm/react';

import {Store} from '../models/Store';
import {logger} from '../utils/logger';

/**
 * Atlas Functions set up on the backend that are callable from the client.
 */
type UserFunctions = {
  switchStore: AppServicesFunction<void, []>;
  triggerClientReset: AppServicesFunction<void, []>;
};

/**
 * The most recent access token is stored in a variable in order to detect
 * if the token has been refreshed (see `handleUserEventChange()`).
 */
let mostRecentAccessToken: string | null = null;

/**
 * Whether to manually reconnect after being disconnected.
 */
let reconnectAfterDisconnect = false;

/**
 * Hook for providing functions to trigger various sync listeners,
 * such as connection and user event change listeners.
 *
 * @note
 * You can also add a listener to the App (via `useApp()`).
 */
export function useDemoSyncTriggers() {
  const app = useApp();
  const realm = useRealm();
  const currentUser = useUser<UserFunctions, {}, {}>();
  const [isConnected, setIsConnected] = useState(true);

  /**
   * Trigger the connection listener by reconnecting to the sync session.
   */
  const reconnect = useCallback(() => {
    realm.syncSession?.resume();
  }, [realm]);

  /**
   * Trigger the connection listener by disconnecting from the sync session.
   */
  const disconnect = useCallback(() => {
    realm.syncSession?.pause();
  }, [realm]);

  useEffect(() => {
    /**
     * The connection listener - Will be invoked when the the underlying sync
     * session changes its connection state.
     *
     * @note
     * Be aware of that there may be a delay from the time of actual disconnect
     * until this listener is invoked.
     */
    const handleConnectionChange = (
      newState: ConnectionState,
      oldState: ConnectionState,
    ) => {
      const connecting = newState === ConnectionState.Connecting;
      const connected = newState === ConnectionState.Connected;
      const disconnected =
        oldState === ConnectionState.Connected &&
        newState === ConnectionState.Disconnected;
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
      const failedReconnecting =
        oldState === ConnectionState.Connecting &&
        newState === ConnectionState.Disconnected;

      if (connecting) {
        logger.info('Connecting...');
      } else if (connected) {
        logger.info('Connected.');
      } else if (disconnected) {
        logger.info('Disconnected.');

        // At this point, the `newState` is `ConnectionState.Disconnected`. If the sync session
        // was not paused manually (e.g. `realm.syncSession?.pause()`), automatic retries
        // will start and the state will alternate in the following way for the period where
        // there is NO network connection:
        //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
        //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected
        // Calling `App.Sync.Session.reconnect()` is not needed due to automatic retries.

        // If the user chose to trigger a session refresh, `reconnectAfterDisconnect` will be
        // `true` and we should manually resume the sync session after getting disconnected.
        if (reconnectAfterDisconnect) {
          reconnectAfterDisconnect = false;
          reconnect();
        }
      } /* failedReconnecting */ else {
        logger.info('Failed to reconnect.');
      }

      setIsConnected(connected);
    };
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    return () =>
      realm.syncSession?.removeConnectionNotification(handleConnectionChange);
  }, [realm.syncSession, reconnect]);

  /**
   * Trigger the sync error listener by trying to create a `Store` that
   * is outside of the query filter subscribed to. Since we are subscribed
   * to one store at a time (determined by our collection permissions,
   * see README.md), attempting to create one with a different ID will
   * generate a sync error.
   *
   * @note
   * You can also trigger sync errors by modifying the permissions of
   * fields and/or collections, and then try to perform non-permitted
   * operations from the client. To read more about permissions, see:
   * {@link https://www.mongodb.com/docs/atlas/app-services/rules/roles/#define-roles---permissions}
   */
  const triggerSyncError = useCallback(() => {
    realm.write(() => {
      const NON_SUBSCRIBED_STORE_ID = new BSON.ObjectId();
      realm.create(Store, {_id: NON_SUBSCRIBED_STORE_ID});
    });
  }, [realm]);

  /**
   * Trigger the client reset listeners by calling a custom Atlas Function
   * (see `backend/functions/triggerClientReset.js`) that deletes the client
   * files for the current user.
   *
   * @note
   * This should NOT be used in production.
   */
  const triggerClientReset = useCallback(async () => {
    await currentUser.functions.triggerClientReset();
    // Once the client tries to reconnect, the client reset will be triggered.
    if (isConnected) {
      disconnect();
    }
    reconnect();
  }, [currentUser.functions, isConnected, disconnect, reconnect]);

  /**
   * Trigger the user event listener by refreshing the custom user data
   * and thereby the access token.
   */
  const refreshAccessToken = useCallback(async () => {
    await currentUser.refreshCustomData();
  }, [currentUser]);

  /**
   * Pause and resume the session in order to apply new rules to collections.
   *
   * @note
   * This function is meant to be called after having first triggered a store change
   * followed by a refresh of user data if an automatic session refresh does not occur.
   * The store change will update permissions on the backend, making it necessary
   * to refresh the session in order to see the effects in the UI.
   */
  const refreshSession = useCallback(() => {
    // To refresh the session, we first pause the session, causing sync to get
    // disconnected. Once disconnected, the `handleConnectionChange()` listener
    // will be called, wherein we manually resume the session if `reconnectAfterDisconnect`
    // is set to `true`. This pattern can be used to react to connection changes.
    reconnectAfterDisconnect = true;
    disconnect();
  }, [disconnect]);

  /**
   * Trigger a store change by calling a custom Atlas Function (see
   * `backend/functions/switchStore.js`) that updates the `storeId` field in the custom
   * user data document for the current user. Since the `Store` collection permissions
   * are tied to that `storeId` field, it will determine what gets synced to the device.
   *
   * @note
   * You will need to trigger a refresh of the custom user data via the UI after calling
   * this function to see the effects of the store change.
   *
   * @note
   * Switching stores in this way (i.e. by modifying permissions via custom user data) is
   * demonstrated here for developers who currently have such a use case. Normally, this
   * can simply be achieved by updating the subscriptions used on the client (e.g. only
   * subscribing to a store with a specific ID).
   */
  const switchStore = useCallback(() => {
    logger.info('Switching store...');
    currentUser.functions.switchStore();
  }, [currentUser]);

  /**
   * Trigger the user event listener by removing the user from the app.
   */
  const deleteUser = useCallback(() => {
    // TODO: Update to use only `deleteUser`.
    // We currently call both `deleteUser` (deletes from server and client) and
    // `removeUser` (deletes from client) due to a bug in `deleteUser` where the
    // `currentUser` is not updated to `null`.
    app.deleteUser(currentUser);
    app.removeUser(currentUser);
  }, [app, currentUser]);

  useEffect(() => {
    /**
     * The user listener - Will be invoked on various user related events including
     * refresh of auth token, refresh token, custom user data, removal, and logout.
     */
    const handleUserEventChange = () => {
      // As the SDK currently does not provide any arguments to this callback, to be
      // able to detect whether a token has been refreshed we store the most recent
      // access token in a variable and compare it against the current one.
      const isNewAccessToken =
        currentUser.accessToken &&
        mostRecentAccessToken !== currentUser.accessToken;
      if (isNewAccessToken) {
        logger.info('New access token.');
        mostRecentAccessToken = currentUser.accessToken;
      }

      switch (currentUser.state) {
        case UserState.LoggedIn:
          logger.info(`User (id: ${currentUser.id}) has been authenticated.`);
          break;
        case UserState.LoggedOut:
          logger.info(`User (id: ${currentUser.id}) has been logged out.`);
          mostRecentAccessToken = null;
          break;
        case UserState.Removed:
          logger.info(
            `User (id: ${currentUser.id}) has been removed from the app.`,
          );
          mostRecentAccessToken = null;
          break;
        default:
          // Should not be reachable.
          logger.error(`Unknown user state: ${currentUser.state}.`);
          break;
      }
    };
    currentUser.addListener(handleUserEventChange);

    return () => currentUser.removeListener(handleUserEventChange);
  }, [currentUser]);

  return {
    isConnected,
    reconnect,
    disconnect,
    triggerSyncError,
    triggerClientReset,
    refreshAccessToken,
    refreshSession,
    switchStore,
    deleteUser,
  };
}
