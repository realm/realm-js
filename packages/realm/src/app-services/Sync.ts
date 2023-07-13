////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import {
  App,
  ConnectionState,
  LogLevel,
  Logger,
  MutableSubscriptionSet,
  NumericLogLevel,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  PartitionValue,
  Realm,
  Subscription,
  SubscriptionSet,
  SubscriptionSetState,
  SyncSession,
  User,
  assert,
  binding,
  fromBindingLoggerLevelToNumericLogLevel,
  toBindingLoggerLevel,
  toBindingSyncConfig,
  validateSyncConfiguration,
} from "../internal";

export class Sync {
  static Session = SyncSession;
  static ConnectionState = ConnectionState;
  static Subscription = Subscription;
  static SubscriptionSet = SubscriptionSet;
  static MutableSubscriptionSet = MutableSubscriptionSet;
  static SubscriptionSetState = SubscriptionSetState;
  /** @deprecated Please use {@link SubscriptionSetState} as a named import */
  static SubscriptionsState = SubscriptionSetState;
  static NumericLogLevel = NumericLogLevel;

  /** @deprecated Will be removed in v13.0.0. Please use {@link Realm.setLogLevel}. */
  static setLogLevel(app: App, level: LogLevel) {
    const numericLevel = toBindingLoggerLevel(level);
    app.internal.syncManager.setLogLevel(numericLevel);
  }

  /** @deprecated Will be removed in v13.0.0. Please use {@link Realm.setLogger}. */
  static setLogger(app: App, logger: Logger) {
    const factory = binding.Helpers.makeLoggerFactory((level, message) => {
      logger(fromBindingLoggerLevelToNumericLogLevel(level), message);
    });
    app.internal.syncManager.setLoggerFactory(factory);
  }
  /**
   * Get all sync sessions for a particular user.
   * @since 10.0.0
   */
  static getAllSyncSessions(user: User): SyncSession[] {
    return user.internal.allSessions.map((session) => new SyncSession(session));
  }
  /**
   * Get the session associated with a particular user and partition value.
   * @since 10.0.0
   */
  static getSyncSession(user: User, partitionValue: PartitionValue): SyncSession | null {
    validateSyncConfiguration({ user, partitionValue });
    const config = toBindingSyncConfig({ user, partitionValue });
    const path = user.app.internal.syncManager.pathForRealm(config, undefined);
    const session = user.internal.sessionForOnDiskPath(path);
    if (session) {
      return new SyncSession(session);
    } else {
      return null;
    }
  }
  // TODO: Consider breaking the API, turning this into a property

  /**
   * Set the application part of the User-Agent string that will be sent to the Realm Object Server when a session
   * is created.
   *
   * This method can only be called up to the point where the first Realm is opened. After that, the User-Agent
   * can no longer be changed.
   */
  static setUserAgent(app: App, userAgent: string) {
    app.internal.syncManager.setUserAgent(userAgent);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  /**
   * Enable multiplexing multiple sync sessions over a single connection for a Realm app.
   * When having a lot of synchronized realms open the system might run out of file
   * descriptors because of all the open sockets to the server. Session multiplexing
   * is designed to alleviate that, but it might not work with a server configured with
   * fail-over. Only use if you're seeing errors about reaching the file descriptor limit
   * and you know you are using many sync sessions.
   */
  static enableSessionMultiplexing(app: App) {
    app.internal.syncManager.setSessionMultiplexing(true);
  }

  // TODO: Consider breaking the API, turning this into an instance method
  /**
   * Initiate a client reset. The Realm must be closed prior to the reset.
   *
   * A synced Realm may need to be reset if the communications with the Atlas Device Sync Server
   * indicate an unrecoverable error that prevents continuing with normal synchronization. The
   * most common reason for this is if a client has been disconnected for too long.
   *
   * The local copy of the Realm is moved into a recovery directory
   * for safekeeping.
   *
   * Local writes that were not successfully synchronized to Atlas
   * will be present in the local recovery copy of the Realm file. The re-downloaded Realm will
   * initially contain only the data present at the time the Realm was synchronized up on the server.
   * @deprecated
   * @throws An {@link Error} if reset is not possible.
   * @example
   * {
   *   // Once you have opened your Realm, you will have to keep a reference to it.
   *   // In the error handler, this reference is called `realm`
   *   const config = {
   *     // schema, etc.
   *     sync: {
   *       user,
   *       partitionValue,
   *       error: (session, error) => {
   *         if (error.name === 'ClientReset') {
   *           let path = realm.path; // realm.path will no be accessible after realm.close()
   *           realm.close();
   *           Realm.App.Sync.initiateClientReset(app, path);
   *           // - open Realm at `error.config.path` (oldRealm)
   *           // - open Realm with `config` (newRealm)
   *           // - copy required objects from oldRealm to newRealm
   *           // - close both Realms
   *         }
   *       }
   *     }
   *   };
   * }
   */
  static initiateClientReset(app: App, path: string) {
    const success = app.internal.syncManager.immediatelyRunFileActions(path);
    // TODO: Consider a better error message
    assert(success, `Realm was not configured correctly. Client Reset could not be run for Realm at: ${path}`);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  /**
   * Returns `true` if Realm still has a reference to any sync sessions regardless of their state.
   * If `false` is returned it means that no sessions currently exist.
   * @param [app] - The app where the Realm was opened.
   * @internal
   */
  static _hasExistingSessions(app: App) {
    return app.internal.syncManager.hasExistingSessions;
  }
  // TODO: Consider breaking the API, turning this into an instance method
  static reconnect(app: App) {
    app.internal.syncManager.reconnect();
  }

  /**
   * The default behavior settings if you want to open a synchronized Realm immediately and start working on it.
   * If this is the first time you open the Realm, it will be empty while the server data is being downloaded in the background.
   * @deprecated since v12
   */

  static openLocalRealmBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.OpenImmediately,
  };

  /**
   * The default behavior settings if you want to wait for downloading a synchronized Realm to complete before opening it.
   * @deprecated since v12
   */
  static downloadBeforeOpenBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.DownloadBeforeOpen,
    timeOut: 30 * 1000,
    timeOutBehavior: OpenRealmTimeOutBehavior.ThrowException,
  };
}
