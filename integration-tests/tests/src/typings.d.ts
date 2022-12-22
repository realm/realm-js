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

type Environment = Record<string, unknown>;

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
}

// Mocha contexts made available by hooks
type AppContext = { app: App } & Mocha.Context;
type UserContext = { user: User } & Mocha.Context;
type RealmContext = {
  realm: Realm;
  config: Configuration;
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
    primaryKey: Assertion;
    primaryKeys: Assertion;
  }
}

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
