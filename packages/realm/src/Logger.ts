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
 */
export enum NumericLogLevel {
  /**
   * Same as 'Trace' but with even more output.
   */
  All = 0,
  /**
   * A version of 'Debug' that allows for very high volume
   * output.
   */
  Trace = 1,
  /**
   * Reveal information that can aid debugging, no longer paying
   * attention to efficiency.
   */
  Debug = 2,
  /**
   * Same as 'Info', but prioritize completeness over minimalism.
   */
  Detail = 3,
  /**
   * Reveal information about what is going on, but in a
   * minimalistic fashion to avoid general overhead from logging
   * and to keep volume down.
   */
  Info = 4,
  /**
   * Be silent unless when there is an error or a warning.
   */
  Warn = 5,
  /**
   * Be silent unless when there is an error.
   */
  Error = 6,
  /**
   * Be silent unless when an error is fatal.
   */
  Fatal = 7,
  /**
   * Be silent.
   */
  Off = 8,
}

/**
 * The category to receive log messages for. The {@link LogLevel} will
 * always be set for a specific category. Setting the log level on one
 * category, will automatically set the log level for any subcategory.
 * @note
 * When debugging, you might not need log messages from everything. To narrow
 * this scope, log events can be grouped by category.
 *
 * `"Realm"`
 * : Include logs from all categories.
 *
 * `"Realm.Storage"`
 * : Database mutations and query operations.
 *
 * `"Realm.Storage.Transaction"`
 * : Creating, advancing, and committing transactions.
 *
 * `"Realm.Storage.Query"`
 * : Query operations.
 *
 * `"Realm.Storage.Object"`
 * : Database mutations.
 *
 * `"Realm.Storage.Notification"`
 * : Notifications of changes to the database.
 *
 * `"Realm.Sync"`
 * : Activity related to Atlas Device Sync.
 *
 * `"Realm.Sync.Client"`
 * : Activity related to Atlas Device Sync client operations.
 *
 * `"Realm.Sync.Client.Session"`
 * : Connection level activity.
 *
 * `"Realm.Sync.Client.Changeset"`
 * : Receiving, uploading, and integrating changesets.
 *
 * `"Realm.Sync.Client.Network"`
 * : Low level network activity.
 *
 * `"Realm.Sync.Client.Reset"`
 * : Client reset operations.
 *
 * `"Realm.Sync.Server"`
 * : Activity related to Atlas Device Sync server operations.
 *
 * `"Realm.App"`
 * : Log activity at the Atlas App level.
 *
 * `"Realm.SDK"`
 * : Log activity at the SDK level.
 */

export const LOG_CATEGORIES = [
  "Realm",
  "Realm.Storage",
  "Realm.Storage.Transaction",
  "Realm.Storage.Query",
  "Realm.Storage.Object",
  "Realm.Storage.Notification",
  "Realm.Sync",
  "Realm.Sync.Client",
  "Realm.Sync.Client.Session",
  "Realm.Sync.Client.Changeset",
  "Realm.Sync.Client.Network",
  "Realm.Sync.Client.Reset",
  "Realm.Sync.Server",
  "Realm.App",
  "Realm.SDK",
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

/**
 * Log options to use when setting the log level.
 */
export type LogOptions = {
  /**
   * The log level to be used by the logger.
   * @default "info"
   */
  level: LogLevel;
  /**
   * The category to set the log level for. If omitted, the log level
   * is set for all categories (`"Realm"`).
   */
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
 * A callback to be used as the logger.
 * @param level   - The level of the log entry.
 * @param message - The message of the log entry.
 * @since 12.0.0
 * @deprecated Will be removed in v13.0.0
 */
export type LoggerCallback1 = (level: LogLevel, message: string) => void;

/**
 * Represents an entry in the log.
 */
export type LogEntry = {
  /**
   * The category (origin) of the log entry.
   */
  category: LogCategory;
  /**
   * The level of the log entry.
   */
  level: LogLevel;
  /**
   * The message of the log entry.
   */
  message: string;
};

/**
 * A callback to be used as the logger.
 * @since 12.7.0
 */
export type LoggerCallback2 = (entry: LogEntry) => void;
/**
 * A callback to be used as the logger.
 * @since 12.7.0
 */
export type LoggerCallback = LoggerCallback1 | LoggerCallback2;

/** @internal */
export function toBindingLogger(logger: LoggerCallback) {
  if (isLoggerWithLevel(logger)) {
    return binding.Helpers.makeLogger((_, level, message) => {
      logger(fromBindingLoggerLevelToLogLevel(level), message);
    });
  } else {
    return binding.Helpers.makeLogger((category, level, message) => {
      logger({
        category: category as LogCategory,
        level: fromBindingLoggerLevelToLogLevel(level),
        message,
      });
    });
  }
}

function isLoggerWithLevel(logger: LoggerCallback): logger is LoggerCallback1 {
  return logger.length === 2;
}

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
export const defaultLogger: LoggerCallback2 = function ({ category, level, message }) {
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
