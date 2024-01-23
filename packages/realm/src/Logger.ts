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

// TODO: Add docs.
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

// TODO: Add docs.
// (These constants map 1:1 to Core's string values.)
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
 * A callback passed to `Realm.App.Sync.setLogger` when instrumenting the Atlas Device Sync client with a custom logger.
 * @param level - The level of the log entry between 0 and 8 inclusively.
 * Use this as an index into `['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off']` to get the name of the level.
 * @param message - The message of the log entry.
 */
export type Logger = (level: NumericLogLevel, message: string) => void;

// TODO: Add docs.
export type LoggerCallback1 = (level: LogLevel, message: string) => void;
export type LoggerCallbackArgs = {
  category: LogCategory;
  level: LogLevel;
  message: string;
};
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
