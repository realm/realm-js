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
  static getAllSyncSessions(user: User): SyncSession[] {
    return user.internal.allSessions.map((session) => new SyncSession(session));
  }
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
  static setUserAgent(app: App, userAgent: string) {
    app.internal.syncManager.setUserAgent(userAgent);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  static enableSessionMultiplexing(app: App) {
    app.internal.syncManager.setSessionMultiplexing(true);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  static initiateClientReset(app: App, path: string) {
    const success = app.internal.syncManager.immediatelyRunFileActions(path);
    // TODO: Consider a better error message
    assert(success, `Realm was not configured correctly. Client Reset could not be run for Realm at: ${path}`);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  /** @internal */
  static _hasExistingSessions(app: App) {
    return app.internal.syncManager.hasExistingSessions;
  }
  // TODO: Consider breaking the API, turning this into an instance method
  static reconnect(app: App) {
    app.internal.syncManager.reconnect();
  }
  static openLocalRealmBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.OpenImmediately,
  };
  static downloadBeforeOpenBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.DownloadBeforeOpen,
    timeOut: 30 * 1000,
    timeOutBehavior: OpenRealmTimeOutBehavior.ThrowException,
  };
}
