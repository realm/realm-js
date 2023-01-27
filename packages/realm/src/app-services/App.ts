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
  Listeners,
  Sync,
  User,
  assert,
  binding,
  createNetworkTransport,
  fs,
} from "../internal";

/**
 * This describes the options used to create a Realm.App instance.
 * @prop id - The id of the Atlas App Services application.
 * @prop baseUrl - The base URL of the Atlas App Services server.
 */
export type AppConfiguration = {
  id: string;
  baseUrl?: string;
};

export type AppChangeCallback = () => void;

type AppListenerToken = binding.AppSubscriptionToken;

// TODO: Ensure this doesn't leak
const appByUserId = new Map<string, App>();

/**
 * The class represents an Atlas App Services Application.
 *
 * ```js
 * let app = new Realm.App(config);
 * ```
 *
 * @memberof Realm
 */
export class App {
  // TODO: Ensure these are injected by the platform
  /** @internal */
  public static PLATFORM_CONTEXT = "unknown-context";
  /** @internal */
  public static PLATFORM_OS = "unknown-os";
  /** @internal */
  public static PLATFORM_VERSION = "0.0.0";
  /** @internal */
  public static SDK_VERSION = "0.0.0";

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

  public userAgent = `RealmJS/${App.SDK_VERSION} (${App.PLATFORM_CONTEXT}, ${App.PLATFORM_OS}, v${App.PLATFORM_VERSION})`;

  private listeners = new Listeners<AppChangeCallback, AppListenerToken>({
    add: (callback: () => void): AppListenerToken => {
      return this.internal.subscribe(callback);
    },
    remove: (token) => {
      this.internal.unsubscribe(token);
    },
  });

  /**
   * Creates a new app and connects to an Atlas App Services instance.
   *
   * @param id A string app id.
   * @throws {@link Error} If no {@link id} is provided.
   */
  constructor(id: string);

  /**
   * Creates a new app and connects to an Atlas App Services instance.
   *
   * @param config The configuration of the app.
   * @throws {@link Error} If no {@link AppConfiguration.id | app id} is provided.
   */
  constructor(config: AppConfiguration);

  constructor(configOrId: AppConfiguration | string) {
    const config: AppConfiguration = typeof configOrId === "string" ? { id: configOrId } : configOrId;
    assert.object(config, "config");
    const { id, baseUrl } = config;
    assert.string(id, "id");
    // TODO: This used getSharedApp in the legacy SDK, but it's failing AppTests
    this.internal = binding.App.getUncachedApp(
      {
        appId: id,
        platform: App.PLATFORM_OS,
        platformVersion: App.PLATFORM_VERSION,
        sdkVersion: App.SDK_VERSION, // Used to be "RealmJS/" + SDK_VERSION
        transport: createNetworkTransport(),
        baseUrl,
      },
      {
        baseFilePath: fs.getDefaultDirectoryPath(),
        metadataMode: binding.MetadataMode.NoEncryption,
        userAgentBindingInfo: this.userAgent,
      },
    );
  }

  /**
   * @return The app id.
   */
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

  public async removeUser(user: User) {
    await this.internal.removeUser(user.internal);
  }

  public async deleteUser(user: User) {
    await this.internal.deleteUser(user.internal);
  }

  public addListener(callback: AppChangeCallback) {
    this.listeners.add(callback);
  }

  public removeListener(callback: AppChangeCallback) {
    this.listeners.remove(callback);
  }

  public removeAllListeners() {
    this.listeners.removeAll();
  }
}
