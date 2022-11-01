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
  Credentials,
  EmailPasswordAuthClient,
  PartitionValue,
  SyncSession,
  User,
  assert,
  binding,
  createNetworkTransport,
  fs,
} from "../internal";

export type AppConfiguration = {
  id: string;
  baseUrl?: string;
};

export type AppChangeCallback = () => void;

// TODO: Ensure this doesn't leak
const appByUserId = new Map<string, App>();

export class App {
  private static PLATFORM = "Unknown";
  private static PLATFORM_VERSION = "0.0.0";
  private static SDK_VERSION = "0.0.0";

  public static Sync = Sync;

  /** @internal */
  public static get(userInternal: binding.SyncUser) {
    const app = appByUserId.get(userInternal.identity);
    if (!app) {
      throw new Error(`Cannot determine which app is associated with user (id = ${userInternal.identity})`);
    }
    return app;
  }

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
    appByUserId.set(userInternal.identity, this);
    return new User(userInternal, this);
  }

  public get emailPasswordAuth(): EmailPasswordAuthClient {
    // TODO: Add memoization
    const internal = this.internal.usernamePasswordProviderClient();
    return new EmailPasswordAuthClient(internal);
  }

  public get currentUser(): User | null {
    const currentUser = this.internal.currentUser;
    return currentUser ? User.get(currentUser) : null;
  }

  public get allUsers(): User[] {
    return this.internal.allUsers.map((user) => User.get(user));
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
