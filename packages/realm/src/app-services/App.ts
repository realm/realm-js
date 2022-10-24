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

import { Credentials, EmailPasswordAuthClient, User, assert, binding, createNetworkTransport, fs } from "../internal";

export type AppConfiguration = {
  id: string;
  baseUrl?: string;
};

export type LogLevel = "all" | "trace" | "debug" | "detail" | "info" | "warn" | "error" | "fatal" | "off";

export enum NumericLogLevel {
  All,
  Trace,
  Debug,
  Detail,
  Info,
  Warn,
  Error,
  Fatal,
  Off,
}

function getBindingLogLevel(arg: LogLevel): binding.LoggerLevel {
  const result = Object.entries(NumericLogLevel).find(([name]) => {
    return name.toLowerCase() === arg;
  });
  assert(result, `Unexpected log level: ${arg}`);
  const [, level] = result;
  assert.number(level, "Expected a numeric level");
  return level as number as binding.LoggerLevel;
}

export class App {
  private static PLATFORM = "Unknown";
  private static PLATFORM_VERSION = "0.0.0";
  private static SDK_VERSION = "0.0.0";

  // TODO: Expose this as a method off App
  public static Sync = {
    setLogLevel(app: App, level: LogLevel) {
      const numericLevel = getBindingLogLevel(level);
      app.internal.syncManager.setLogLevel(numericLevel);
    },
  };

  /** @internal */
  public internal: binding.App;

  constructor(id: string);
  constructor(config: AppConfiguration);
  constructor(configOrId: AppConfiguration | string) {
    const { id, baseUrl }: AppConfiguration = typeof configOrId === "string" ? { id: configOrId } : configOrId;
    this.internal = binding.App.getUncachedApp(
      {
        appId: id,
        platform: App.PLATFORM,
        platformVersion: App.PLATFORM_VERSION,
        sdkVersion: App.SDK_VERSION,
        transport: createNetworkTransport(),
        baseUrl,
      },
      {
        baseFilePath: fs.getDefaultDirectoryPath(),
      },
    );
  }

  public get id(): string {
    return this.internal.config.appId;
  }

  public async logIn(credentials: Credentials) {
    const userInternal = await this.internal.logInWithCredentials(credentials.internal);
    return new User(this, userInternal);
  }

  public get emailPasswordAuth(): EmailPasswordAuthClient {
    // TODO: Add memoization
    const internal = this.internal.usernamePasswordProviderClient();
    return new EmailPasswordAuthClient(internal);
  }

  public get currentUser(): User {
    // TODO: Get this.internal.currentUser but return cached instances of the SDK's User to preserve object equality
    throw new Error("Not yet implemented");
  }

  public get allUsers(): User[] {
    // TODO: Iterate this.internal.allUsers but return cached instances of the SDK's User to preserve object equality
    throw new Error("Not yet implemented");
  }

  public switchUser(): unknown {
    throw new Error("Not yet implemented");
  }

  public removeUser(): unknown {
    throw new Error("Not yet implemented");
  }

  public deleteUser(): unknown {
    throw new Error("Not yet implemented");
  }

  public addListener(): unknown {
    throw new Error("Not yet implemented");
  }

  public removeListener(): unknown {
    throw new Error("Not yet implemented");
  }

  public removeAllListeners(): unknown {
    throw new Error("Not yet implemented");
  }
}
