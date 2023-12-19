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

import chalk from "chalk";
import Realm from "realm";

type LogEntry = { level: ValidRealmLogLevel; message: string };

const log: LogEntry[] = [];

export const { printLogAfterTest = false, defaultLogLevel = printLogAfterTest ? "all" : "off" } = environment;

export function append(level: Realm.App.Sync.LogLevel, message: string) {
  if (level !== "off" && level !== "all") {
    log.push({ level, message });
  }
}

export function clear() {
  log.splice(0, log.length);
}

const logColors: Record<ValidRealmLogLevel, chalk.Chalk> = {
  trace: chalk.dim,
  debug: chalk.dim,
  detail: chalk.dim,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.red,
};

export function printAndClear() {
  for (const { level, message } of log) {
    const color = logColors[level];
    console.log(`[${color(level)}] ${message}`);
  }
  clear();
}
