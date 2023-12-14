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

if (!global.fs) {
  throw new Error("Expected 'fs' to be available as a global");
}

if (!global.path) {
  throw new Error("Expected 'path' to be available as a global");
}

if (!global.environment || typeof global.environment !== "object") {
  throw new Error("Expected 'environment' to be available as a global");
}

// Patch in a function that can skip running tests in specific environments
import { testSkipIf, suiteSkipIf } from "./utils/skip-if";
global.describe.skipIf = suiteSkipIf;
global.it.skipIf = testSkipIf;

import chai from "chai";

// When a deep.equals fails, we want the entire diff to show
// See https://stackoverflow.com/a/45882252
chai.config.truncateThreshold = 0;

import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

import { chaiRealmObjects } from "./utils/chai-plugin";
chai.use(chaiRealmObjects);

/**
 * Use the `longTimeout` context variable to override this.
 */
const DEFAULT_LONG_TIMEOUT = 30 * 1000; // 30s

describe("Test Harness", function (this: Mocha.Suite) {
  /**
   * @see [typings.d.ts](./typings.d.ts) for documentation.
   */
  function longTimeout(this: Mocha.Context | Mocha.Suite) {
    this.timeout(environment.longTimeout || DEFAULT_LONG_TIMEOUT); // 30 seconds
  }

  // Patching the Suite and Context with a longTimeout method
  // We cannot simply `import { Suite, Context } from "mocha"` here,
  // since Mocha Remote client brings its own classes
  const Suite = this.constructor as typeof Mocha.Suite;
  const Context = this.ctx.constructor as typeof Mocha.Context;
  Suite.prototype.longTimeout = longTimeout;
  Context.prototype.longTimeout = longTimeout;
});

import Realm from "realm";

// Disable the logger to avoid console flooding
const { printLogAfterTest = false, defaultLogLevel = printLogAfterTest ? "all" : "off" } = environment;
Realm.setLogLevel(defaultLogLevel);

import chalk from "chalk";

/**
 * Contains the Realm log since the test started.
 */
let log: { level: ValidRealmLogLevel; message: string }[] = [];

if (printLogAfterTest) {
  Realm.setLogger((level: Realm.App.Sync.LogLevel, message: string) => {
    if (level !== "off" && level !== "all") {
      log.push({ level, message });
    }
  });
}

// Reset the log before each test
beforeEach(() => {
  log = [];
});

const logColors: Record<ValidRealmLogLevel, chalk.Chalk> = {
  trace: chalk.dim,
  debug: chalk.dim,
  detail: chalk.dim,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.red,
};

afterEach(function (this: Mocha.Context) {
  if (printLogAfterTest === true || (printLogAfterTest === "on-failure" && this.currentTest?.isFailed())) {
    for (const { level, message } of log) {
      const color = logColors[level];
      console.log(`[${color(level)}] ${message}`);
    }
  }
});

Realm.flags.THROW_ON_GLOBAL_REALM = true;
