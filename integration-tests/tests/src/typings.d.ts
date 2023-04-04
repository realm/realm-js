////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

type Realm = import("realm").Realm;
type RealmObject = import("realm").Object;
type App = import("realm").App;
type User = import("realm").User;
type Configuration = import("realm").Configuration;
//type BenchmarkResult = import("@thi.ng/bench").BenchmarkResult;

interface fs {
  exists: (path: string) => boolean;
}

interface path {
  dirname: (path: string) => string;
  resolve: (...paths: string[]) => string;
}

type Require = (id: string) => unknown;

type KnownEnvironment = {
  /** Set the number of milliseconds to use for tests that require a long timeout. */
  longTimeout?: number;
  /** Set the name of the cluster, used when setting up the "mongodb-atlas" service on imported apps. */
  mongodbClusterName?: string;
  /** Run the performance tests (skipped by default) */
  performance?: true;
  /** Disable deletion of the Realm app after the test run. */
  preserveAppAfterRun?: true;
  /** Set the sync client log level to help debugging sync client issues */
  syncLogLevel?: Realm.App.Sync.LogLevel;

  // BaaS server and Realm App Importer specific variables below

  /** Are the tests running without a server? In which case all sync tests should be skipped. */
  missingServer?: true;
  /** The URL of the Realm server to run tests against. */
  realmBaseUrl?: string;
  /**
   * Public key part used when authenticating towards BaaS during import of an app.
   * Note: This is only used when the app importer is ran from within the test suite.
   * Note: Either (publicKey and privateKey) or (username and password) needs to be set.
   */
  publicKey?: string;
  /**
   * Private key part used when authenticating towards BaaS during import of an app.
   * Note: This is only used when the app importer is ran from within the test suite.
   * Note: Either (publicKey and privateKey) or (username and password) needs to be set.
   */
  privateKey?: string;
  /**
   * Username used when authenticating towards BaaS during import of an app.
   * Note: This is only used when the app importer is ran from within the test suite.
   * Note: Either (publicKey and privateKey) or (username and password) needs to be set.
   */
  username?: string;
  /**
   * Password used when authenticating towards BaaS during import of an app.
   * Note: This is only used when the app importer is ran from within the test suite.
   * Note: Either (publicKey and privateKey) or (username and password) needs to be set.
   */
  password?: string;

  // Platform specific variables below

  /**
   * Node specific variable injected by the runner, to signal if we're running on Node.
   */
  node?: true;
  /**
   * Electron specific variable injected by the runner, to signal if we're running on Electron (and what process mode).
   */
  electron?: "main" | "renderer";
  /**
   * React native specific variable injected by the runner, to signal if we're running on React Native (and what platform OS we're running on).
   */
  reactNative?: "ios" | "android" | "web" | "macos" | "windows";
  /**
   * React native specific variable to control if tests are ran natively (default) or via the legacy chrome-debugger.
   * @deprecated Since we no longer support the legacy chrome debugger.
   */
  mode?: "native" | "chrome-debugging";
  /**
   * React native specific variable injected by the runner, to signal if we're running on Android.
   */
  android?: true;
  /**
   * React native specific variable injected by the runner, to signal if we're running on iOS.
   */
  ios?: true;
  /**
   * React native specific variable injected by the runner, to signal if the tests are ran by the legacy chrome debugger (i.e. in a browser).
   * @deprecated Since we no longer support the legacy chrome debugger. */
  chromeDebugging?: true;
};

type Environment = KnownEnvironment & Record<string, unknown>;

interface Global extends NodeJS.Global {
  title: string;
  fs: fs;
  path: path;
  environment: Environment;
  require: Require;
  /**
   * The environment might expose a method to suggest a garbage collection.
   */
  gc?: () => void;
}

declare const global: Global;
declare const fs: fs;
declare const path: path;
declare const require: Require;
declare const environment: Environment;

// Extend the mocha test function with the skipIf that we patch in from index.ts
declare namespace Mocha {
  interface SuiteFunction {
    skipIf: (condition: unknown, title: string, fn: (this: Suite) => void) => Mocha.Suite | void;
  }
  interface TestFunction {
    skipIf: (condition: unknown, title: string, callback: Mocha.AsyncFunc | Mocha.Func) => void;
  }
  interface Context {
    /**
     * Sets a "long timeout" for the test or hook.
     * It will use the timeout provided via `environment.longTimeout` or default to 1 min.
     */
    longTimeout(): void;
  }
  interface Suite {
    /**
     * Sets a "long timeout" for the suite.
     * It will use the timeout provided via `environment.longTimeout` or default to 1 min.
     */
    longTimeout(): void;
  }
}

// Mocha contexts made available by hooks
type AppContext = { app: App; databaseName: string } & Mocha.Context;
type UserContext = { user: User } & Mocha.Context;
type CloseRealmOptions = { deleteFile: boolean; clearTestState: boolean; reopen: boolean };
type RealmContext = {
  realm: Realm;
  /**
   * Close a Realm instance, optionally deleting the file, clearing test state or reopening it afterwards.
   * Defaults to deleting the Realm file and clearing test state.
   */
  closeRealm(options?: Partial<CloseRealmOptions>): Promise<void>;
} & Mocha.Context;
type RealmObjectContext<T = Record<string, unknown>> = {
  object: RealmObject & T;
} & RealmContext;
// type BenchmarkContext = {
//   result: BenchmarkResult;
// } & Mocha.Context;

// Added by the "utils/chai-plugin.ts"
declare namespace Chai {
  interface Assertion {
    /**
     * Maps the current value from a Realm.Object to its primary key value.
     */
    primaryKey: Assertion;
    /**
     * Maps the current array or collection of Realm.Object to an array of their primary key values.
     */
    primaryKeys: Assertion;
  }
}

/** Calls the callback on the next tick of the event loop */
declare function setImmediate(cb: () => void): void;

interface Console {
  error(message?: unknown, ...optionalParams: unknown[]): void;
  log(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
}

declare const console: Console;
// allow import of json files
declare module "*.json" {
  const value: unknown;
  export = value;
}

declare module "realm/scripts/submit-analytics" {
  export function collectPlatformData(packagePath: string): Promise<Record<string, unknown>>;
}
