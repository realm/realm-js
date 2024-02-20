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
  AnyApp,
  ApiKeyAuth,
  App,
  Credentials,
  DefaultFunctionsFactory,
  DefaultObject,
  DefaultUserProfileData,
  Document,
  Listeners,
  MongoDBCollection,
  MongoDBService,
  ProviderType,
  PushClient,
  assert,
  asyncIteratorFromResponse,
  binding,
  cleanArguments,
  createFactory,
  isProviderType,
  network,
} from "../internal";

export type UserChangeCallback = () => void;

/**
 * The state of a user.
 */
export enum UserState {
  /**
   * Authenticated and available to communicate with services.
   * @deprecated Will be removed in v13. Please use {@link UserState.LoggedIn}
   */
  Active = "active",
  /** Authenticated and available to communicate with services. */
  LoggedIn = "LoggedIn",
  /** Logged out, but ready to be logged in. */
  LoggedOut = "LoggedOut",
  /** Removed from the app entirely. */
  Removed = "Removed",
}

/**
 * A user's identity with a particular authentication provider.
 */
export interface UserIdentity {
  /**
   * The ID of the identity.
   */
  id: string;

  /**
   * The type of the provider associated with the identity.
   */
  providerType: ProviderType;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyUser = User<any, any, any>;

type UserListenerToken = binding.SyncUserSubscriptionToken;

/**
 * Representation of an authenticated user of an {@link App}.
 */
export class User<
  UserFunctionsFactoryType extends DefaultFunctionsFactory = DefaultFunctionsFactory,
  UserCustomDataType extends DefaultObject = DefaultObject,
  UserProfileDataType extends DefaultUserProfileData = DefaultUserProfileData,
> {
  /** @internal */
  public app: App;

  /** @internal */
  public internal: binding.SyncUser;

  // cached version of profile
  private cachedProfile: UserProfileDataType | undefined;

  private listeners = new Listeners<UserChangeCallback, UserListenerToken>({
    add: (callback: () => void): UserListenerToken => {
      return this.internal.subscribe(callback);
    },
    remove: (token) => {
      this.internal.unsubscribe(token);
    },
  });

  /** @internal */
  public static get<
    FunctionsFactoryType extends DefaultFunctionsFactory = DefaultFunctionsFactory,
    CustomDataType extends DefaultObject = DefaultObject,
    UserProfileDataType extends DefaultUserProfileData = DefaultUserProfileData,
  >(internal: binding.SyncUser, app?: AnyApp) {
    // Update the static user reference to the current app
    if (app) {
      App.setAppByUser(internal, app);
    }
    // TODO: Use a WeakRef to memoize the SDK object
    return new User<FunctionsFactoryType, CustomDataType, UserProfileDataType>(internal, App.getAppByUser(internal));
  }

  /** @internal */
  constructor(internal: binding.SyncUser, app: App) {
    this.internal = internal;
    this.app = app;
    this.cachedProfile = undefined;
  }

  /**
   * The automatically-generated internal ID of the user.
   * @returns The user ID as a string.
   */
  get id(): string {
    return this.internal.identity;
  }

  /**
   * The provider type used when authenticating the user. If multiple identities exist,
   * the provider type for the first identity found is return.
   * @returns The provider type as an enumerated string.
   * @deprecated Use {@link identities} instead.
   */
  get providerType(): ProviderType {
    const [identity] = this.internal.identities;
    if (!identity) {
      throw new Error("No provider found");
    }
    const type = identity.providerType;
    if (isProviderType(type)) {
      return type;
    }
    throw new Error(`Unexpected provider type: ${type}`);
  }

  /**
   * The ID of the device.
   * @returns The device ID as a string or `null`.
   */
  get deviceId(): string | null {
    return this.internal.deviceId;
  }

  /**
   * The state of the user.
   * @returns The state as an enumerated string.
   */
  get state(): UserState {
    const state = this.internal.state;
    switch (state) {
      case binding.SyncUserState.LoggedIn:
        return UserState.LoggedIn;
      case binding.SyncUserState.LoggedOut:
        return UserState.LoggedOut;
      case binding.SyncUserState.Removed:
        return UserState.Removed;
      default:
        throw new Error(`Unsupported SyncUserState value: ${state}`);
    }
  }

  /**
   * The logged in state of the user.
   * @returns `true` if the user is logged in, `false` otherwise.
   */
  get isLoggedIn(): boolean {
    return this.internal.isLoggedIn;
  }

  /**
   * The identities of the user at any of the app's authentication providers.
   * @returns An array of {@link UserIdentity} objects.
   */
  get identities(): UserIdentity[] {
    return this.internal.identities.map(({ id, providerType }) => ({ id, providerType } as UserIdentity));
  }

  /**
   * The access token used when requesting a new access token.
   * @returns The access token as a string or `null`.
   */
  get accessToken(): string | null {
    return this.internal.accessToken;
  }

  /**
   * The refresh token used when requesting a new access token.
   * @returns The refresh token as a string or `null`.
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
   * @returns The custom data as an object.
   */
  get customData(): UserCustomDataType {
    const result = this.internal.customData;
    if (result === undefined) {
      return {} as UserCustomDataType;
    }
    return result as UserCustomDataType;
  }

  /**
   * A profile containing additional information about the user.
   * @returns The user profile data as an object.
   */
  get profile(): UserProfileDataType {
    if (!this.cachedProfile) {
      this.cachedProfile = this.internal.userProfile.data() as UserProfileDataType;
    }
    return this.cachedProfile;
  }

  /**
   * Use this to call functions defined by the Atlas App Services application, as this user.
   * @returns A {@link FunctionsFactory} that can be used to call the app's functions.
   */
  get functions(): UserFunctionsFactoryType {
    return createFactory(this as User, undefined);
  }

  /**
   * Perform operations related to the API-key auth provider.
   * @returns An {@link ApiKeyAuth} object that can be used to manage API keys.
   */
  get apiKeys(): ApiKeyAuth {
    // TODO: Add memoization
    const internal = this.app.internal.userApiKeyProviderClient();
    return new ApiKeyAuth(this.internal, internal);
  }

  /**
   * Log out the user.
   * @returns A promise that resolves once the user has been logged out of the app.
   */
  async logOut(): Promise<void> {
    await this.app.internal.logOutUser(this.internal);
  }

  /**
   * Link the user with an identity represented by another set of credentials.
   * @param credentials - The credentials to use when linking.
   * @returns A promise that resolves once the user has been linked with the credentials.
   */
  async linkCredentials(credentials: Credentials): Promise<void> {
    await this.app.internal.linkUser(this.internal, credentials.internal);
  }

  /**
   * Call a remote Atlas App Services Function by its name.
   * @note Consider using `functions[name]()` instead of calling this method.
   * @param name - Name of the App Services Function.
   * @param args - Arguments passed to the Function.
   * @returns A promise that resolves to the value returned by the Function.
   * @example
   * // These are all equivalent:
   * await user.callFunction("doThing", a1, a2, a3);
   * await user.functions.doThing(a1, a2, a3);
   * await user.functions["doThing"](a1, a2, a3);
   * @example
   * // The methods returned from the functions object are bound, which is why it's okay to store the function in a variable before calling it:
   * const doThing = user.functions.doThing;
   * await doThing(a1);
   * await doThing(a2);
   */
  callFunction(name: string, ...args: unknown[]): Promise<unknown> {
    return this.callFunctionOnService(name, undefined, ...args);
  }

  /** @internal */
  async callFunctionOnService(name: string, serviceName: string | undefined, ...args: unknown[]): Promise<unknown> {
    return this.app.internal.callFunction(this.internal, name, cleanArguments(args), serviceName);
  }

  /** @internal */
  async callFunctionStreaming(
    functionName: string,
    serviceName: string,
    ...functionArgs: unknown[]
  ): Promise<AsyncIterable<Uint8Array>> {
    const request = this.app.internal.makeStreamingRequest(
      this.internal,
      functionName,
      cleanArguments(functionArgs),
      serviceName,
    );

    const response = await network.fetch(...binding.toFetchArgs(request));
    assert(response.ok, () => `Request failed: ${response.statusText} (${response.status})`);
    assert(response.body, "Expected a body in the response");

    return asyncIteratorFromResponse(response);
  }

  /**
   * Refresh the access token and derive custom data from it.
   * @returns A promise that resolves to the refreshed custom data.
   */
  async refreshCustomData(): Promise<UserCustomDataType> {
    await this.app.internal.refreshCustomData(this.internal);
    return this.customData;
  }

  /**
   * Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).
   * @deprecated https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/
   * @returns A {@link PushClient} with methods to register and deregister the device on the user.
   */
  push(serviceName: string): PushClient {
    const internal = this.app.internal.pushNotificationClient(serviceName);
    return new PushClient(this.internal, internal);
  }

  /**
   * @param serviceName - The name of the MongoDB service to connect to.
   * @returns A client enabling access to a {@link MongoDB} service.
   * @example
   * let blueWidgets = user.mongoClient("myService")
   *                       .db("myDb")
   *                       .collection<Widget>("widgets")
   *                       .find({ color: "blue" });
   */
  mongoClient(serviceName: string): MongoDBService {
    assert.string(serviceName, "serviceName");
    assert(serviceName.length, "Please provide the name of the MongoDB service to connect to.");

    return {
      get serviceName() {
        return serviceName;
      },
      db: (databaseName: string) => {
        return {
          get name() {
            return databaseName;
          },
          collection: <T extends Document = Document>(collectionName: string) => {
            return new MongoDBCollection<T>(this, serviceName, databaseName, collectionName);
          },
        };
      },
    };
  }

  /**
   * Adds a listener that will be fired on various user related events.
   * This includes auth token refresh, refresh token refresh, refresh custom user data, and logout.
   * @param callback - The callback to be fired when the event occurs.
   */
  addListener(callback: UserChangeCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Removes an event listener previously added via {@link User.addListener}.
   * @param callback - The callback to be removed.
   */
  removeListener(callback: UserChangeCallback): void {
    this.listeners.remove(callback);
  }

  /**
   * Removes all event listeners previously added via {@link User.addListener}.
   */
  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
