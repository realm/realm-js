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
  AnyUser,
  Credentials,
  DefaultFunctionsFactory,
  DefaultObject,
  EmailPasswordAuth,
  Listeners,
  Sync,
  User,
  assert,
  binding,
  createNetworkTransport,
  deviceInfo,
  fs,
} from "../internal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyApp = App<any, any>;

/**
 * This describes the options used to create a Realm App instance.
 */
export type AppConfiguration = {
  /**
   * The Realm App ID
   * @since v10.0.0
   */
  id: string;

  /**
   * An optional URL to use as a prefix when sending requests to the Atlas App Services server.
   * @since v10.0.0
   */
  baseUrl?: string;

  /**
   * This describes the local app, sent to the server when a user authenticates.
   * Specifying this will enable the server to respond differently to specific versions of specific apps.
   * @since v10.0.0
   */
  app?: LocalAppConfiguration;

  /**
   * The timeout for requests (in milliseconds)
   * @since v10.0.0
   */
  timeout?: number;

  /**
   * Use the same underlying connection towards the server across multiple sync sessions.
   * This uses less resources on the server and provides a small increase in speed when opening subsequent synced Realms.
   * @default true
   */
  multiplexSessions?: boolean;

  /**
   * Specify where synced Realms and metadata is stored. If not specified, the current work directory is used.
   * @since v11.7.0
   */
  baseFilePath?: string;
};

/**
 * This describes the local app, sent to the server when a user authenticates.
 */
export type LocalAppConfiguration = {
  /**
   * The name / ID of the local app.
   * Note: This should be the name or a bundle ID of your app, not the Atlas App Services application.
   */
  name?: string;

  /**
   * The version of the local app.
   */
  version?: string;
};

export type AppChangeCallback = () => void;

type AppListenerToken = binding.AppSubscriptionToken;

/**
 * The class represents an Atlas App Services Application.
 *
 * ```js
 * const app = new App({ id: "my-app-qwert" });
 * ```
 */
export class App<
  FunctionsFactoryType extends DefaultFunctionsFactory = DefaultFunctionsFactory,
  CustomDataType extends DefaultObject = DefaultObject,
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static appById = new Map<string, binding.WeakRef<AnyApp>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static appByUserId = new Map<string, binding.WeakRef<AnyApp>>();

  /**
   * Get or create a singleton Realm App from an ID.
   * Calling this function multiple times with the same ID will return the same instance.
   * @deprecated Use {@link App.get}.
   * @param id - The Realm App ID visible from the Atlas App Services UI or a configuration.
   * @returns The Realm App instance.
   */
  public static getApp(id: string): App {
    return this.get(id);
  }

  /**
   * Get or create a singleton Realm App from an ID.
   * Calling this function multiple times with the same ID will return the same instance.
   * @param id - The Realm App ID visible from the Atlas App Services UI or a configuration.
   * @returns The Realm App instance.
   */
  public static get(id: string): App {
    const cachedApp = App.appById.get(id)?.deref();
    if (cachedApp) {
      return cachedApp;
    }
    const newApp = new App(id);
    App.appById.set(id, new binding.WeakRef(newApp));
    return newApp;
  }

  public static Sync = Sync;

  /**
   * All credentials available for authentication.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/
   */
  public static Credentials = Credentials;

  /** @internal */
  public static deviceInfo = deviceInfo.create();
  /** @internal */
  public static userAgent = `RealmJS/${App.deviceInfo.sdkVersion} (v${App.deviceInfo.platformVersion})`;

  /** @internal */
  public static getAppByUser(userInternal: binding.SyncUser): App {
    const app = App.appByUserId.get(userInternal.identity)?.deref();
    if (!app) {
      throw new Error(`Cannot determine which app is associated with user (id = ${userInternal.identity})`);
    }
    return app;
  }

  /** @internal */
  public static setAppByUser(userInternal: binding.SyncUser, currentApp: AnyApp): void {
    App.appByUserId.set(userInternal.identity, new binding.WeakRef(currentApp));
  }

  /** @internal */
  public internal: binding.App;

  private listeners = new Listeners<AppChangeCallback, AppListenerToken>({
    add: (callback: () => void): AppListenerToken => {
      return this.internal.subscribe(callback);
    },
    remove: (token) => {
      this.internal.unsubscribe(token);
    },
  });

  /**
   * Constructs a new {@link App} instance, used to connect to an Atlas App Services App.
   * @param id - A string app ID.
   * @throws an {@link Error} If no {@link id} is provided.
   */
  constructor(id: string);

  /**
   * Constructs a new {@link App} instance, used to connect to an Atlas App Services App.
   * @param config - The configuration of the app.
   * @throws an {@link Error} If no {@link AppConfiguration.id | app id} is provided.
   */
  constructor(config: AppConfiguration);

  constructor(configOrId: AppConfiguration | string) {
    const config: AppConfiguration = typeof configOrId === "string" ? { id: configOrId } : configOrId;
    assert.object(config, "config");
    const { id, baseUrl, app, timeout, multiplexSessions = true, baseFilePath } = config;
    assert.string(id, "id");
    if (timeout !== undefined) {
      assert.number(timeout, "timeout");
    }
    assert.boolean(multiplexSessions, "multiplexSessions");
    if (baseFilePath !== undefined) {
      assert.string(baseFilePath, "baseFilePath");
    }

    fs.ensureDirectoryForFile(fs.joinPaths(baseFilePath || fs.getDefaultDirectoryPath(), "mongodb-realm"));
    // TODO: This used getSharedApp in the legacy SDK, but it's failing AppTests
    this.internal = binding.App.getUncachedApp(
      {
        appId: id,
        deviceInfo: App.deviceInfo,
        transport: createNetworkTransport(),
        baseUrl,
        defaultRequestTimeoutMs: timeout ? binding.Int64.numToInt(timeout) : undefined,
      },
      {
        baseFilePath: baseFilePath ? baseFilePath : fs.getDefaultDirectoryPath(),
        metadataMode: binding.MetadataMode.NoEncryption,
        userAgentBindingInfo: App.userAgent,
        multiplexSessions,
      },
    );
  }

  /**
   * @returns The app ID.
   */
  public get id(): string {
    return this.internal.config.appId;
  }

  /**
   * Log in a user.
   * @param credentials - A credentials object describing the type of authentication provider and its parameters.
   * @returns A promise that resolves to the logged in {@link User}.
   * @throws An {@link Error} if the login failed.
   */
  public async logIn(credentials: Credentials): Promise<User<FunctionsFactoryType, CustomDataType>> {
    const userInternal = await this.internal.logInWithCredentials(credentials.internal);
    return User.get(userInternal, this);
  }

  /**
   * Perform operations related to the email/password auth provider.
   * @returns An instance of the email password authentication provider.
   */
  public get emailPasswordAuth(): EmailPasswordAuth {
    // TODO: Add memoization
    const internal = this.internal.usernamePasswordProviderClient();
    return new EmailPasswordAuth(internal);
  }

  /**
   * The last user to log in or being switched to.
   * @returns A {@link User} object representing the currently logged in user. If no user is logged in, `null` is returned.
   */
  public get currentUser(): User<FunctionsFactoryType, CustomDataType> | null {
    const currentUser = this.internal.currentUser;
    return currentUser ? User.get(currentUser, this) : null;
  }

  /**
   * All users that have logged into the device and have not been removed.
   * @returns A mapping from user ID to user.
   */
  public get allUsers(): Readonly<Record<string, User<FunctionsFactoryType, CustomDataType>>> {
    return Object.fromEntries(this.internal.allUsers.map((user) => [user.identity, User.get(user, this)]));
  }

  /**
   * Switches the current user to the one specified in {@link user}.
   * @throws an {@link Error} if the new user is logged out or removed.
   * @param user - The user to switch to.
   */
  public switchUser(user: AnyUser): void {
    this.internal.switchUser(user.internal);
  }

  /**
   * Logs out and removes a user from the client.
   * @returns A promise that resolves once the user has been logged out and removed from the app.
   */
  public async removeUser(user: AnyUser): Promise<void> {
    await this.internal.removeUser(user.internal);
  }

  /**
   * Delete the user.
   * NOTE: This irrecoverably deletes the user from the device as well as the server!
   * @returns A promise that resolves once the user has been deleted.
   */
  public async deleteUser(user: AnyUser): Promise<void> {
    await this.internal.deleteUser(user.internal);
  }

  /**
   * Adds a listener that will be fired on various user events.
   * This includes login, logout, switching users, linking users and refreshing custom data.
   * @param callback - A callback function that will be called when the event occurs.
   */
  public addListener(callback: AppChangeCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Removes an event listener previously added via {@link App.addListener}.
   * @param callback - The callback to remove.
   */
  public removeListener(callback: AppChangeCallback): void {
    this.listeners.remove(callback);
  }

  /**
   * Removes all event listeners previously added via {@link App.addListener}.
   */
  public removeAllListeners() {
    this.listeners.removeAll();
  }
}
