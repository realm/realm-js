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
  ApiKeyAuthClient,
  App,
  Credentials,
  DefaultFunctionsFactory,
  DefaultObject,
  DefaultUserProfileData,
  ProviderType,
  binding,
  isProviderType,
} from "../internal";

export type UserChangeCallback = () => void;

/**
 * The state of a user.
 */
export enum UserState {
  /** Authenticated and available to communicate with services. */
  Active = "active",
  /** Logged out, but ready to be logged in. */
  LoggedOut = "logged-out",
  /** Removed from the app entirely. */
  Removed = "removed",
}

/**
 * A user's identity with a particular authentication provider.
 */
export interface UserIdentity {
  /**
   * The id of the identity.
   */
  id: string;

  /**
   * The type of the provider associated with the identity.
   */
  providerType: ProviderType;
}

export class User<
  FunctionsFactoryType = DefaultFunctionsFactory,
  CustomDataType = DefaultObject,
  UserProfileDataType = DefaultUserProfileData,
> {
  /** @internal */
  public app: App;

  /** @internal */
  public internal: binding.SyncUser;

  /** @internal */
  public static get(internal: binding.SyncUser) {
    // TODO: Use a WeakRef to memoize the SDK object
    return new User(internal, App.get(internal));
  }

  /** @internal */
  constructor(internal: binding.SyncUser, app: App) {
    this.internal = internal;
    this.app = app;
  }

  /**
   * The automatically-generated internal ID of the user.
   */
  get id(): string {
    return this.internal.identity;
  }

  /**
   * The provider type used when authenticating the user.
   */
  get providerType(): ProviderType {
    const type = this.internal.providerType;
    if (isProviderType(type)) {
      return type;
    } else {
      throw new Error(`Unexpected provider type: ${type}`);
    }
  }

  /**
   * The id of the device.
   */
  get deviceId(): string | null {
    return this.internal.deviceId;
  }

  /**
   * The state of the user.
   */
  get state(): UserState {
    throw new Error("Not yet implemented");
  }

  /**
   * The logged in state of the user.
   */
  get isLoggedIn(): boolean {
    return this.internal.isLoggedIn;
  }

  /**
   * The identities of the user at any of the app's authentication providers.
   */
  get identities(): UserIdentity[] {
    return this.internal.identities.map((identity) => {
      const { id, provider_type: providerType } = identity as Record<string, string>;
      return { id, providerType } as UserIdentity;
    });
  }

  /**
   * The access token used when requesting a new access token.
   */
  get accessToken(): string | null {
    return this.internal.accessToken;
  }

  /**
   * The refresh token used when requesting a new access token.
   */
  get refreshToken(): string | null {
    return this.internal.refreshToken;
  }

  /**
   * You can store arbitrary data about your application users in a MongoDB collection and configure
   * Atlas App Services to automatically expose each user’s data in a field of their user object.
   * For example, you might store a user’s preferred language, date of birth, or their local timezone.
   *
   * If this value has not been configured, it will be empty.
   */
  get customData(): CustomDataType {
    throw new Error("Not yet implemented");
  }

  /**
   * A profile containing additional information about the user.
   */
  get profile(): UserProfileDataType {
    throw new Error("Not yet implemented");
  }

  /**
   * Use this to call functions defined by the Atlas App Services application, as this user.
   */
  get functions(): FunctionsFactoryType {
    throw new Error("Not yet implemented");
  }

  /**
   * Perform operations related to the API-key auth provider.
   */
  get apiKeys(): ApiKeyAuthClient {
    // TODO: Add memoization
    const internal = this.app.internal.userApiKeyProviderClient();
    return new ApiKeyAuthClient(this.internal, internal);
  }

  /**
   * Log out the user.
   *
   * @returns A promise that resolves once the user has been logged out of the app.
   */
  async logOut(): Promise<void> {
    await this.app.internal.logOutUser(this.internal);
  }

  /**
   * Link the user with an identity represented by another set of credentials.
   *
   * @param credentials The credentials to use when linking.
   */
  async linkCredentials(credentials: Credentials) {
    throw new Error("Not yet implemented");
  }

  /**
   * Call a remote Atlas Function by its name.
   * Note: Consider using `functions[name]()` instead of calling this method.
   *
   * @example
   * // These are all equivalent:
   * await user.callFunction("doThing", [a1, a2, a3]);
   * await user.functions.doThing(a1, a2, a3);
   * await user.functions["doThing"](a1, a2, a3);
   * @example
   * // The methods returned from the functions object are bound, which is why it's okay to store the function in a variable before calling it:
   * const doThing = user.functions.doThing;
   * await doThing(a1);
   * await doThing(a2);
   * @param name Name of the function.
   * @param args Arguments passed to the function.
   */
  async callFunction(name: string, ...args: unknown[]): Promise<unknown> {
    throw new Error("Not yet implemented");
  }

  /**
   * Refresh the access token and derive custom data from it.
   *
   * @returns The newly fetched custom data.
   */
  async refreshCustomData(): Promise<CustomDataType> {
    throw new Error("Not yet implemented");
  }

  /**
   * Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).
   *
   * @returns An service client with methods to register and deregister the device on the user.
   */
  push(serviceName: string): unknown {
    throw new Error("Not yet implemented");
  }

  /**
   * Returns a connection to the MongoDB service.
   *
   * @example
   * let blueWidgets = user.mongoClient('myClusterName')
   *                       .db('myDb')
   *                       .collection('widgets')
   *                       .find({color: 'blue'});
   */
  mongoClient(serviceName: string): unknown {
    throw new Error("Not yet implemented");
  }

  /**
   * Adds a listener that will be fired on various user related events.
   * This includes auth token refresh, refresh token refresh, refresh custom user data, and logout.
   */
  addListener(callback: UserChangeCallback): void {
    throw new Error("Not yet implemented");
  }

  /**
   * Removes the event listener
   */
  removeListener(callback: UserChangeCallback): void {
    throw new Error("Not yet implemented");
  }

  /**
   * Removes all event listeners
   */
  removeAllListeners(): void {
    throw new Error("Not yet implemented");
  }
}
