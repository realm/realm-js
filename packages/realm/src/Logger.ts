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

import { assert, binding } from "./internal";

export type LogLevel = "all" | "trace" | "debug" | "detail" | "info" | "warn" | "error" | "fatal" | "off";

/**
 * Log levels used by Realm
 *
 * Off      Be silent.
 * Fatal    Be silent unless when an error is fatal.
 * error    Be silent unless when there is an error.
 * warn     Be silent unless when there is an error or a warning.
 * Info     Reveal information about what is going on, but in a
 *          minimalistic fashion to avoid general overhead from logging
 *          and to keep volume down.
 * Detail   Same as 'Info', but prioritize completeness over minimalism.
 * Debug    Reveal information that can aid debugging, no longer paying
 *          attention to efficiency.
 * Trace    A version of 'Debug' that allows for very high volume
 *          output.
 * All      Same as 'Trace' but with even more output.
 */
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

/**
 * When debugging, you might not need log messages from everything. To help focusing, Realm groups log events
 * in categories.
 *
 * Realm         Top level category.
 * Storage       Everything about mutating and querying the database.
 * Query         Query operations.
 * Object        Mutations of the database.
 * Notification  Reporting changes to the database.
 * Sync          Everything about Atlas Device Sync.
 * Client        Catch-all category for Device Sync client operations.
 * Session       Connection level activity.
 * Changeset     Reception, upload and integration of changesets.
 * Network       Low level network activity.
 * Reset         Client reset operations.
 * Server        All server activity (only relevant for test runs).
 * App           Activity at the app level.
 * SDK           Tracing of SDK activity.
 */
export enum LogCategory {
  Realm = "Realm",
  Storage = "Storage",
  Transaction = "Transaction",
  Query = "Query",
  Object = "Object",
  Notification = "Notification",
  Sync = "Sync",
  Client = "Client",
  Session = "Session",
  Changeset = "Changeset",
  Network = "Network",
  Reset = "Reset",
  Server = "Server",
  App = "App",
  SDK = "SDK",
}

/**
 * Type for `Realm.setLogLevel`
 */
export type LogArgs = {
  level: LogLevel;
  category?: LogCategory;
};

/**
 * A callback passed to `Realm.App.Sync.setLogger` when instrumenting the Atlas Device Sync client with a custom logger.
 * @param level - The level of the log entry between 0 and 8 inclusively.
 * Use this as an index into `['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off']` to get the name of the level.
 * @param message - The message of the log entry.
 */
export type Logger = (level: NumericLogLevel, message: string) => void;

/**
 * A callback passed to `Realm.setLogger`.
 *
 * @param level   - The level of the log entry.
 * @param message - The message of the log entry.
 * @since 12.0.0
 * @deprecated Will be removed in v13.0.0
 */
export type LoggerCallback1 = (level: LogLevel, message: string) => void;
export type LoggerCallbackArgs = {
  category: LogCategory;
  level: LogLevel;
  message: string;
};
/**
 * A callback passed to `Realm.setLogger`. Arguments are passed as a POJO.
 *
 * @param category   - The category (origin) of the log entry.
 * @param level      - The level of the log entry.
 * @param message    - The message of the log entry.
 * @since
 */
export type LoggerCallback2 = (args: LoggerCallbackArgs) => void;
export type LoggerCallback = LoggerCallback1 | LoggerCallback2;

/** @internal */
export function toBindingLoggerLevel(arg: LogLevel): binding.LoggerLevel {
  const bindingLogLevel = inverseTranslationTable[arg];
  assert(bindingLogLevel !== undefined, `Unexpected log level: ${arg}`);
  return bindingLogLevel;
}

/** @internal */
export function fromBindingLoggerLevelToNumericLogLevel(arg: binding.LoggerLevel): NumericLogLevel {
  // For now, these map 1-to-1
  return arg as unknown as NumericLogLevel;
}

const translationTable: Record<binding.LoggerLevel, LogLevel> = {
  [binding.LoggerLevel.All]: "all",
  [binding.LoggerLevel.Trace]: "trace",
  [binding.LoggerLevel.Debug]: "debug",
  [binding.LoggerLevel.Detail]: "detail",
  [binding.LoggerLevel.Info]: "info",
  [binding.LoggerLevel.Warn]: "warn",
  [binding.LoggerLevel.Error]: "error",
  [binding.LoggerLevel.Fatal]: "fatal",
  [binding.LoggerLevel.Off]: "off",
};

const inverseTranslationTable: Record<LogLevel, binding.LoggerLevel> = Object.fromEntries(
  Object.entries(translationTable).map(([key, val]) => [val, Number(key)]),
) as Record<LogLevel, binding.LoggerLevel>;

/** @internal */
export function fromBindingLoggerLevelToLogLevel(arg: binding.LoggerLevel): LogLevel {
  return translationTable[arg];
}

/** @internal */
export const defaultLogger: LoggerCallback = function (args: LoggerCallbackArgs) {
  const { category, level, message } = args;
  const formattedLogMessage = `[${category} - ${level}] ${message}`;
  /* eslint-disable no-console */
  if (level === "error" || level === "fatal") {
    console.error(formattedLogMessage);
  } else if (level === "warn") {
    console.warn(formattedLogMessage);
  } else {
    console.log(formattedLogMessage);
  }
  /* eslint-enable no-console */
};

/** @internal */
export const defaultLoggerLevel: LogLevel = "warn";
