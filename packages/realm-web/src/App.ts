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

import { NetworkTransport, DefaultNetworkTransport } from "realm-network-transport";
import { ObjectId } from "bson";

import { User, UserState } from "./User";
import { Credentials, ProviderType } from "./Credentials";
import { EmailPasswordAuth } from "./auth-providers";
import { Storage } from "./storage";
import { AppStorage } from "./AppStorage";
import { getEnvironment } from "./environment";
import { AuthResponse, Authenticator } from "./Authenticator";
import { Fetcher, UserContext } from "./Fetcher";
import routes from "./routes";
import { DeviceInformation, DEVICE_ID_STORAGE_KEY } from "./DeviceInformation";

type SimpleObject = Record<string, unknown>;

/**
 * Default base url to prefix all requests if no baseUrl is specified in the configuration.
 */
export const DEFAULT_BASE_URL = "https://realm.mongodb.com";

/**
 * Configuration to pass as an argument when constructing an app.
 */
export interface AppConfiguration extends Realm.AppConfiguration {
  /**
   * Transport to use when fetching resources.
   */
  transport?: NetworkTransport;
  /**
   * Used when persisting app state, such as tokens of authenticated users.
   */
  storage?: Storage;
  /**
   * Skips requesting a location URL via the baseUrl and use the `baseUrl` as the url prefixed for any requests initiated by this app.
   * This can useful when connecting to a server through a reverse proxy, to avoid the location request to make the client "break out" and start requesting another server.
   */
  skipLocationRequest?: boolean;
}

/**
 * MongoDB Realm App
 */
export class App<
  FunctionsFactoryType = Realm.DefaultFunctionsFactory & Realm.BaseFunctionsFactory,
  CustomDataType = SimpleObject,
> implements Realm.App<FunctionsFactoryType, CustomDataType>
{
  /**
   * A map of app instances returned from calling getApp.
   */
  private static appCache: { [id: string]: App } = {};

  /**
   * Get or create a singleton Realm App from an id.
   * Calling this function multiple times with the same id will return the same instance.
   *
   * @param id The Realm App id visible from the MongoDB Realm UI or a configuration.
   * @returns The Realm App instance.
   */
  static getApp(id: string): App {
    if (id in App.appCache) {
      return App.appCache[id];
    } else {
      const instance = new App(id);
      App.appCache[id] = instance;
      return instance;
    }
  }

  /** @inheritdoc */
  public readonly id: string;

  /**
   * Instances of this class can be passed to the `app.logIn` method to authenticate an end-user.
   */
  public static readonly Credentials = Credentials;

  /**
   * An object which can be used to fetch responses from the server.
   */
  public readonly fetcher: Fetcher;

  /** @inheritdoc */
  public readonly emailPasswordAuth: EmailPasswordAuth;

  /**
   * Storage available for the app.
   */
  public readonly storage: AppStorage;

  /**
   * Internal authenticator used to complete authentication requests.
   */
  public readonly authenticator: Authenticator;

  /**
   * An array of active and logged-out users.
   * Elements in the beginning of the array is considered more recent than the later elements.
   */
  private users: User<FunctionsFactoryType, CustomDataType>[] = [];

  /**
   * The base URL of the app.
   */
  private readonly baseUrl: string;

  /**
   * Local app configuration.
   * Useful to determine what name and version an authenticated user is running.
   */
  private readonly localApp: Realm.LocalAppConfiguration | undefined;

  /**
   * A promise resolving to the App's location url.
   */
  private _locationUrl: Promise<string> | null = null;

  /**
   * Construct a Realm App, either from the Realm App id visible from the MongoDB Realm UI or a configuration.
   *
   * @param idOrConfiguration The Realm App id or a configuration to use for this app.
   */
  constructor(idOrConfiguration: string | AppConfiguration) {
    // If the argument is a string, convert it to a simple configuration object.
    const configuration = typeof idOrConfiguration === "string" ? { id: idOrConfiguration } : idOrConfiguration;
    // Initialize properties from the configuration
    if (typeof configuration === "object" && typeof configuration.id === "string") {
      this.id = configuration.id;
    } else {
      throw new Error("Missing a MongoDB Realm app-id");
    }
    this.baseUrl = configuration.baseUrl || DEFAULT_BASE_URL;
    if (configuration.skipLocationRequest) {
      // Use the base url directly, instead of requesting a location URL from the server
      this._locationUrl = Promise.resolve(this.baseUrl);
    }
    this.localApp = configuration.app;
    const { storage, transport = new DefaultNetworkTransport() } = configuration;
    // Construct a fetcher wrapping the network transport
    this.fetcher = new Fetcher({
      appId: this.id,
      userContext: this as UserContext,
      locationUrlContext: this,
      transport,
    });
    // Construct the auth providers
    this.emailPasswordAuth = new EmailPasswordAuth(this.fetcher);
    // Construct the storage
    const baseStorage = storage || getEnvironment().defaultStorage;
    this.storage = new AppStorage(baseStorage, this.id);
    this.authenticator = new Authenticator(this.fetcher, baseStorage, () => this.deviceInformation);
    // Hydrate the app state from storage
    try {
      this.hydrate();
    } catch (err) {
      // The storage was corrupted
      this.storage.clear();
      // A failed hydration shouldn't throw and break the app experience
      // Since this is "just" persisted state that unfortunately got corrupted or partially lost
      console.warn("Realm app hydration failed:", err instanceof Error ? err.message : err);
    }
  }

  /**
   * Switch user.
   *
   * @param nextUser The user or id of the user to switch to.
   */
  public switchUser(nextUser: User<FunctionsFactoryType, CustomDataType>): void {
    const index = this.users.findIndex((u) => u === nextUser);
    if (index === -1) {
      throw new Error("The user was never logged into this app");
    }
    // Remove the user from the stack
    const [user] = this.users.splice(index, 1);
    // Insert the user in the beginning of the stack
    this.users.unshift(user);
  }

  /**
   * Log in a user.
   *
   * @param credentials Credentials to use when logging in.
   * @param fetchProfile Should the users profile be fetched? (default: true)
   * @returns A promise resolving to the newly logged in user.
   */
  public async logIn(
    credentials: Credentials,
    fetchProfile = true,
  ): Promise<User<FunctionsFactoryType, CustomDataType>> {
    const response = await this.authenticator.authenticate(credentials);
    const user = this.createOrUpdateUser(response, credentials.providerType);
    // Let's ensure this will be the current user, in case the user object was reused.
    this.switchUser(user);
    // If needed, fetch and set the profile on the user
    if (fetchProfile) {
      await user.refreshProfile();
    }
    // Persist the user id in the storage,
    // merging to avoid overriding logins from other apps using the same underlying storage
    this.storage.setUserIds(
      this.users.map((u) => u.id),
      true,
    );
    // Read out and store the device id from the server
    const deviceId = response.deviceId;
    if (deviceId && deviceId !== "000000000000000000000000") {
      this.storage.set(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    // Return the user
    return user;
  }

  /**
   * @inheritdoc
   */
  public async removeUser(user: User<FunctionsFactoryType, CustomDataType>): Promise<void> {
    // Remove the user from the list of users
    const index = this.users.findIndex((u) => u === user);
    if (index === -1) {
      throw new Error("The user was never logged into this app");
    }
    this.users.splice(index, 1);
    // Log out the user - this removes access and refresh tokens from storage
    await user.logOut();
    // Remove the users profile from storage
    this.storage.remove(`user(${user.id}):profile`);
    // Remove the user from the storage
    this.storage.removeUserId(user.id);
  }

  /**
   * @inheritdoc
   */
  public async deleteUser(user: User<FunctionsFactoryType, CustomDataType>): Promise<void> {
    await this.fetcher.fetchJSON({
      method: "DELETE",
      path: routes.api().auth().delete().path,
    });
    await this.removeUser(user);
  }

  /**
   * The currently active user (or null if no active users exists).
   *
   * @returns the currently active user or null.
   */
  public get currentUser(): User<FunctionsFactoryType, CustomDataType> | null {
    const activeUsers = this.users.filter((user) => user.state === UserState.Active);
    if (activeUsers.length === 0) {
      return null;
    } else {
      // Current user is the top of the stack
      return activeUsers[0];
    }
  }

  /**
   * All active and logged-out users:
   *  - First in the list are active users (ordered by most recent call to switchUser or login)
   *  - Followed by logged out users (also ordered by most recent call to switchUser or login).
   *
   * @returns An array of users active or logged out users (current user being the first).
   */
  public get allUsers(): Readonly<Record<string, User<FunctionsFactoryType, CustomDataType>>> {
    // Returning a freezed copy of the list of users to prevent outside changes
    return Object.fromEntries(this.users.map((user) => [user.id, user]));
  }

  /**
   * @returns A promise of the app URL, with the app location resolved.
   */
  public get locationUrl(): Promise<string> {
    if (!this._locationUrl) {
      const path = routes.api().app(this.id).location().path;
      this._locationUrl = this.fetcher
        .fetchJSON({
          method: "GET",
          url: this.baseUrl + path,
          tokenType: "none",
        })
        .then((body) => {
          if (typeof body !== "object") {
            throw new Error("Expected response body be an object");
          } else {
            return body as Record<string, unknown>;
          }
        })
        .then(({ hostname }) => {
          if (typeof hostname !== "string") {
            throw new Error("Expected response to contain a 'hostname'");
          } else {
            return hostname;
          }
        })
        .catch((err) => {
          // Reset the location to allow another request to fetch again.
          this._locationUrl = null;
          throw err;
        });
    }
    return this._locationUrl;
  }

  /**
   * @returns Information about the current device, sent to the server when authenticating.
   */
  public get deviceInformation(): DeviceInformation {
    const deviceIdStr = this.storage.getDeviceId();
    const deviceId =
      typeof deviceIdStr === "string" && deviceIdStr !== "000000000000000000000000"
        ? new ObjectId(deviceIdStr)
        : undefined;
    return new DeviceInformation({
      appId: this.localApp ? this.localApp.name : undefined,
      appVersion: this.localApp ? this.localApp.version : undefined,
      deviceId,
    });
  }

  /**
   * Create (and store) a new user or update an existing user's access and refresh tokens.
   * This helps de-duplicating users in the list of users known to the app.
   *
   * @param response A response from the Authenticator.
   * @param providerType The type of the authentication provider used.
   * @returns A new or an existing user.
   */
  private createOrUpdateUser(
    response: AuthResponse,
    providerType: ProviderType,
  ): User<FunctionsFactoryType, CustomDataType> {
    const existingUser = this.users.find((u) => u.id === response.userId);
    if (existingUser) {
      // Update the users access and refresh tokens
      existingUser.accessToken = response.accessToken;
      existingUser.refreshToken = response.refreshToken;
      return existingUser;
    } else {
      // Create and store a new user
      if (!response.refreshToken) {
        throw new Error("No refresh token in response from server");
      }
      const user = new User<FunctionsFactoryType, CustomDataType>({
        app: this,
        id: response.userId,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        providerType,
      });
      this.users.unshift(user);
      return user;
    }
  }

  /**
   * Restores the state of the app (active and logged-out users) from the storage
   */
  private hydrate() {
    const userIds = this.storage.getUserIds();
    this.users = userIds.map((id) => new User({ app: this, id }));
  }
}
