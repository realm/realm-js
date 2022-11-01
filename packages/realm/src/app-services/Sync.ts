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

import { EJSON } from "bson";
import {
  App,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  PartitionValue,
  SyncSession,
  User,
  assert,
  binding,
  toBindingSyncConfig,
} from "../internal";

export type LogLevel = "all" | "trace" | "debug" | "detail" | "info" | "warn" | "error" | "fatal" | "off";

export enum NumericLogLevel {
  All = 0,
  Trace = 1,
  Debug = 2,
  Detail = 3,
  Info = 4,
  Warn = 5,
  Error = 6,
  Fatal = 7,
  Off = 8,
}

export type Logger = (level: NumericLogLevel, message: string) => void;

function toBindingLoggerLevel(arg: LogLevel): binding.LoggerLevel {
  const result = Object.entries(NumericLogLevel).find(([name]) => {
    return name.toLowerCase() === arg;
  });
  assert(result, `Unexpected log level: ${arg}`);
  const [, level] = result;
  assert.number(level, "Expected a numeric level");
  return level as number as binding.LoggerLevel;
}

function fromBindingLoggerLevel(arg: binding.LoggerLevel): NumericLogLevel {
  // For now, these map 1-to-1
  return arg as unknown as NumericLogLevel;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Sync {
  export const Session = SyncSession;
  export function setLogLevel(app: App, level: LogLevel) {
    const numericLevel = toBindingLoggerLevel(level);
    app.internal.syncManager.setLogLevel(numericLevel);
  }
  export function setLogger(app: App, logger: Logger) {
    const factory = binding.Helpers.makeLoggerFactory((level, message) => {
      logger(fromBindingLoggerLevel(level), message);
    });
    app.internal.syncManager.setLoggerFactory(factory);
  }
  export function getAllSyncSessions(user: User): SyncSession[] {
    throw new Error("Not yet implemented");
  }
  export function getSyncSession(user: User, partitionValue: PartitionValue): SyncSession | null {
    const config = toBindingSyncConfig({ user, partitionValue });
    const path = user.app.internal.syncManager.pathForRealm(config);
    const session = user.internal.sessionForOnDiskPath(path);
    if (session) {
      return new SyncSession(session);
    } else {
      return null;
    }
  }
  // TODO: Consider breaking the API, turning this into a property
  export function setUserAgent(app: App, userAgent: string) {
    app.userAgent = userAgent;
  }
  // TODO: Consider breaking the API, turning this into an instance method
  export function enableSessionMultiplexing(app: App) {
    app.internal.syncManager.enableSessionMultiplexing();
  }
  // TODO: Consider breaking the API, turning this into an instance method
  export function initiateClientReset(app: App, path: string) {
    const success = app.internal.syncManager.immediatelyRunFileActions(path);
    // TODO: Consider a better error message
    assert(success, `Realm was not configured correctly. Client Reset could not be run for Realm at: ${path}`);
  }
  // TODO: Consider breaking the API, turning this into an instance method
  /** @internal */
  export function _hasExistingSessions(app: App) {
    return app.internal.syncManager.hasExistingSessions;
  }
  // TODO: Consider breaking the API, turning this into an instance method
  export function reconnect(app: App) {
    app.internal.syncManager.reconnect();
  }
  export const openLocalRealmBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.OpenImmediately,
  };
  export const downloadBeforeOpenBehavior: Readonly<OpenRealmBehaviorConfiguration> = {
    type: OpenRealmBehaviorType.DownloadBeforeOpen,
    timeOut: 30 * 1000,
    timeOutBehavior: OpenRealmTimeOutBehavior.ThrowException,
  };
}
