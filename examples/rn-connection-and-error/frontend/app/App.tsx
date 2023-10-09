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

import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import Realm, {ClientResetMode, OpenRealmBehaviorType, SyncError} from 'realm';
import {AppProvider, RealmProvider, UserProvider} from '@realm/react';

import {ATLAS_APP_ID, SYNC_STORE_ID} from './atlas-app-services/config';
import {AuthResultBoundary} from './components/AuthResultBoundary';
import {Kiosk} from './models/Kiosk';
import {Loading} from './components/Loading';
import {LoginScreen} from './screens/LoginScreen';
import {Product} from './models/Product';
import {Store} from './models/Store';
import {StoreProvider} from './providers/StoreProvider';
import {StoreScreen} from './screens/StoreScreen';
import {logger} from './utils/logger';

// To diagnose and troubleshoot errors while in development, set the log level to `debug`
// or `trace`. For production deployments, decrease the log level for improved performance.
// logLevels = ["all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"];
// You may import `NumericLogLevel` to get them as numbers starting from 0 (`all`).
Realm.setLogLevel('error');
Realm.setLogger((logLevel, message) => {
  const formattedMessage = `Log level: ${logLevel} - Log message: ${message}`;
  if (logLevel === 'error' || logLevel === 'fatal') {
    logger.error(formattedMessage);
  } else {
    logger.info(formattedMessage);
  }
});

/**
 * The sync error listener - Will be invoked when various synchronization errors occur.
 *
 * @note
 * To trigger, for instance, a session level sync error, you may modify the Document
 * Permissions in Atlas App Services to NOT allow `Delete`, then rerun this app and
 * try to delete a product.
 * For how to modify the rules and permissions, see:
 * {@link https://www.mongodb.com/docs/atlas/app-services/rules/roles/#define-roles---permissions}.
 *
 * For detailed error codes, see:
 * {@link https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes}.
 * Examples:
 * - 202 (Access token expired)
 * - 225 (Invalid schema change)
 */
function handleSyncError(
  session: Realm.App.Sync.SyncSession,
  error: SyncError,
): void {
  // Please note that frequent logging to the `console` greatly decreases
  // performance and blocks the UI thread. If the user is offline, syncing
  // will not be possible and this callback will be called frequently. Thus,
  // when in production, use another preferred logging mechanism.
  logger.error(error);
}

/**
 * The pre-client reset listener - Will be invoked before sync initiates
 * a client reset.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function handlePreClientReset(localRealm: Realm): void {
  logger.info('Initiating client reset...');
}

/**
 * The post-client reset listener - Will be invoked after a client reset.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function handlePostClientReset(localRealm: Realm, remoteRealm: Realm): void {
  logger.info('Client has been reset.');
}

/**
 * The root React component which renders `@realm/react`'s `AppProvider`
 * for instantiation an Atlas App Services App, `UserProvider` for providing
 * the App User once authenticated, and `RealmProvider` for opening a Realm.
 */
function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar animated barStyle="dark-content" />
      <AppProvider id={ATLAS_APP_ID}>
        <AuthResultBoundary>
          {/* The component set as the `fallback` prop will be rendered if a user has
          not been authenticated. In this case, we will show the login screen. */}
          <UserProvider fallback={LoginScreen}>
            {/* Define the Realm configuration as props passed to `RealmProvider`.
            Note that `user` does not need to be defined in the `sync` config
            since the `RealmProvider` will set it for you once authenticated. */}
            <RealmProvider
              // The fallback component will be rendered until the realm is opened.
              fallback={Loading}
              schema={[Store, Kiosk, Product]}
              sync={{
                flexible: true,
                // To sync a preferred subset of data to the device, we only subscribe to
                // the kiosks and products in a particular store. For this demo, we have
                // defined the specific store ID in `app/atlas-app-services/config.ts`.
                // When adding subscriptions, best practice is to name each subscription
                // for better managing removal of them.
                initialSubscriptions: {
                  update: (mutableSubs, realm) => {
                    // Subscribe to the store with the given ID.
                    mutableSubs.add(
                      realm.objects(Store).filtered('_id = $0', SYNC_STORE_ID),
                      {name: 'storeA'},
                    );
                    // Subscribe to all kiosks in the store with the given ID.
                    mutableSubs.add(
                      realm
                        .objects(Kiosk)
                        .filtered('storeId = $0', SYNC_STORE_ID),
                      {name: 'kiosksInStoreA'},
                    );
                    // Subscribe to all products in the store with the given ID.
                    mutableSubs.add(
                      realm
                        .objects(Product)
                        .filtered('storeId = $0', SYNC_STORE_ID),
                      {name: 'productsInStoreA'},
                    );
                  },
                },
                // The `ClientResetMode.RecoverOrDiscardUnsyncedChanges` will download a fresh copy
                // from the server if recovery of unsynced changes is not possible. For read-only
                // clients, `ClientResetMode.DiscardUnsyncedChanges` is suitable.
                clientReset: {
                  mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges,
                  onBefore: handlePreClientReset,
                  onAfter: handlePostClientReset,
                },
                onError: handleSyncError,
                // We can specify the behavior when opening a Realm for the first time
                // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
                // If the user has logged in at least 1 time before, the Realm and its data will
                // exist on disk and can be opened even when offline. We can either (a) open the
                // Realm immediately (or first create a new empty Realm file if it does not
                // exist before opening it) and sync the data to the device in the background
                // (`OpenRealmBehaviorType.OpenImmediately`), or (b) wait for any non-synced
                // data to be fully downloaded (`OpenRealmBehaviorType.DownloadBeforeOpen`).
                newRealmFileBehavior: {
                  type: OpenRealmBehaviorType.DownloadBeforeOpen,
                },
                existingRealmFileBehavior: {
                  type: OpenRealmBehaviorType.OpenImmediately,
                },
              }}>
              <StoreProvider>
                <StoreScreen />
              </StoreProvider>
            </RealmProvider>
          </UserProvider>
        </AuthResultBoundary>
      </AppProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
