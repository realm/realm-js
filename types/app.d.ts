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

// As we're writing this declarations file manually, it's okay to use triple slash references
/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference path="services.d.ts" />
/// <reference path="auth-providers.d.ts" />

type SimpleObject = Record<string, unknown>;

declare namespace Realm {
  /**
   * Types of an authentication provider.
   */
  type ProviderType =
    | "anon-user"
    | "api-key"
    | "local-userpass"
    | "custom-function"
    | "custom-token"
    | "oauth2-google"
    | "oauth2-facebook"
    | "oauth2-apple";

  namespace Credentials {
    /**
     * Payload sent when authenticating using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).
     */
    type AnonymousPayload = Record<string, never>;

    /**
     * Payload sent when authenticating using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).
     */
    type EmailPasswordPayload = {
      /**
       * The end-users username.
       * Note: This currently has to be an email.
       */
      username: string;

      /**
       * The end-users password.
       */
      password: string;
    };

    /**
     * Payload sent when authenticating using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     */
    type ApiKeyPayload = {
      /**
       * The secret content of the API key.
       */
      key: string;
    };

    /**
     * Payload sent when authenticating using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).
     */
    type FunctionPayload = SimpleObject;

    /**
     * Payload sent when authenticating using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).
     */
    type JWTPayload = {
      /**
       * The JSON Web Token signed by another service.
       */
      token: string;
    };

    /**
     * Payload sent when authenticating using an OAuth 2.0 provider:
     * - [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     * - [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).
     */
    type OAuth2RedirectPayload = {
      /**
       * The auth code returned from Google.
       */
      redirectUrl: string;
    };

    /**
     * Payload sent when authenticating using the OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     */
    type GoogleAuthCodePayload = {
      /**
       * The auth code from Google.
       */
      authCode: string;
    };

    /**
     * Payload sent when authenticating using the OpenID Connect [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     */
    type GoogleIdTokenPayload = {
      /**
       * The OpenID token from Google.
       */
      id_token: string;
    };

    /**
     * Payload sent when authenticating using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     */
    type GooglePayload = GoogleAuthCodePayload | GoogleIdTokenPayload;

    /**
     * Payload sent when authenticating using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     */
    type FacebookPayload = {
      /**
       * The auth code returned from Google.
       */
      accessToken: string;
    };

    /**
     * Payload sent when authenticating using the [Apple ID Provider](https://docs.mongodb.com/realm/authentication/apple/).
     */
    type ApplePayload = {
      /**
       * The OpenID token from Apple.
       */
      id_token: string;
    };
  }

  // TODO: Add providerCapabilities?

  /**
   * End-users enter credentials to authenticate toward your MongoDB Realm App.
   */
  class Credentials<PayloadType extends SimpleObject = SimpleObject> {
    /**
     * Name of the authentication provider.
     */
    readonly providerName: string;

    /**
     * Type of the authentication provider.
     */
    readonly providerType: ProviderType;

    /**
     * A simple object which can be passed to the server as the body of a request to authenticate.
     */
    readonly payload: PayloadType;

    /**
     * Factory for `Credentials` which authenticate using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).
     *
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static anonymous(): Credentials<Credentials.AnonymousPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     *
     * @deprecated Use `Credentials.apiKey`.
     * @param key The secret content of the API key.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static userApiKey(key: string): Credentials<Credentials.ApiKeyPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     *
     * @deprecated Use `Credentials.apiKey`.
     * @param key The secret content of the API key.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static serverApiKey(key: string): Credentials<Credentials.ApiKeyPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).
     * Note: This was formerly known as the "Username/Password" provider.
     *
     * @param email The end-users email address.
     * @param password The end-users password.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static emailPassword(email: string, password: string): Credentials<Credentials.EmailPasswordPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).
     *
     * @param payload The custom payload as expected by the server.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static function<PayloadType extends Credentials.FunctionPayload = Credentials.FunctionPayload>(
      payload: PayloadType,
    ): Credentials<PayloadType>;

    /**
     * Factory for `Credentials` which authenticate using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).
     *
     * @param token The JSON Web Token (JWT).
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static jwt(token: string): Credentials<Credentials.JWTPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     *
     * @param authCode The auth code returned from Google.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static google(authCodeOrIdToken: string): Credentials<Credentials.GooglePayload>;

    /**
     * Factory for `Credentials` which authenticate using the Auth Token OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     *
     * @param payload.authCode The auth code from Google.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static google(payload: {
      /**
       * The auth code from Google.
       */
      authCode: string;
    }): Credentials<Credentials.GoogleAuthCodePayload>;

    /**
     * Factory for `Credentials` which authenticate using the OpenID Connect OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     *
     * @param payload.idToken The OpenID Connect token from Google.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static google(payload: {
      /**
       *
       */
      idToken: string;
    }): Credentials<Credentials.GoogleIdTokenPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).
     *
     * @param accessToken The access token returned from Facebook.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static facebook(accessToken: string): Credentials<Credentials.FacebookPayload>;

    /**
     * Factory for `Credentials` which authenticate using the [Apple ID Provider](https://docs.mongodb.com/realm/authentication/apple/).
     *
     * @param idToken The id_token returned from Apple.
     * @returns A `Credentials` object for logging in using `app.logIn`.
     */
    static apple(idToken: string): Credentials<Credentials.ApplePayload>;
  }

  /**
   * A MongoDB Realm App.
   */
  class App<FunctionsFactoryType = DefaultFunctionsFactory, CustomDataType = SimpleObject> {
    /**
     * Construct a MongoDB Realm App.
     *
     * @param idOrConfiguration The id string or configuration for the app.
     */
    constructor(idOrConfiguration: string | AppConfiguration);

    /**
     * All credentials available for authentication.
     */
    static readonly Credentials: typeof Credentials;

    /**
     * The id of this Realm app.
     */
    readonly id: string;

    /**
     * Perform operations related to the email/password auth provider.
     */
    emailPasswordAuth: Realm.Auth.EmailPasswordAuth;

    /**
     * The last user to log in or being switched to.
     */
    readonly currentUser: User<FunctionsFactoryType, CustomDataType> | null;

    /**
     * All authenticated users.
     */
    readonly allUsers: Readonly<Record<string, User<FunctionsFactoryType, CustomDataType>>>;

    /**
     * Get or create a singleton Realm App from an id.
     * Calling this function multiple times with the same id will return the same instance.
     *
     * @param id The Realm App id visible from the MongoDB Realm UI or a configuration.
     * @returns The Realm App instance.
     */
    static getApp(appId: string): App;

    /**
     * Log in a user using a specific credential
     *
     * @param credentials the credentials to use when logging in
     */
    logIn(credentials: Credentials): Promise<User<FunctionsFactoryType, CustomDataType>>;

    /**
     * Switch current user, from an instance of `User` or the string id of the user.
     */
    switchUser(user: User<FunctionsFactoryType, CustomDataType>): void;

    /**
     * Logs out and removes a user from the client.
     *
     * @returns A promise that resolves once the user has been logged out and removed from the app.
     */
    removeUser(user: User<FunctionsFactoryType, CustomDataType>): Promise<void>;

    /**
     * Delete the user.
     * NOTE: This irrecoverably deletes the user from the device as well as the server!
     *
     * @returns A promise that resolves once the user has been deleted.
     */
    deleteUser(user: User<FunctionsFactoryType, CustomDataType>): Promise<void>;
  }

  /**
   * Pass an object implementing this interface to the app constructor.
   */
  interface AppConfiguration {
    /**
     * The Realm App ID
     */
    id: string;

    /**
     * An optional URL to use as a prefix when requesting the MongoDB Realm services.
     */
    baseUrl?: string;

    /**
     * This describes the local app, sent to the server when a user authenticates.
     * Specifying this will enable the server to respond differently to specific versions of specific apps.
     */
    app?: LocalAppConfiguration;
  }

  /**
   * This describes the local app, sent to the server when a user authenticates.
   */
  interface LocalAppConfiguration {
    /**
     * The name / id of the local app.
     * Note: This should be the name or a bundle id of your app, not the MongoDB Realm app.
     */
    name?: string;

    /**
     * The version of the local app.
     */
    version?: string;
  }

  /**
   * Representation of an authenticated user of an app.
   */
  class User<
    FunctionsFactoryType = DefaultFunctionsFactory,
    CustomDataType = SimpleObject,
    UserProfileDataType = DefaultUserProfileData,
  > {
    /**
     * The automatically-generated internal ID of the user.
     */
    readonly id: string;

    /**
     * The provider type used when authenticating the user.
     */
    readonly providerType: ProviderType;

    /**
     * The id of the device.
     */
    readonly deviceId: string | null;

    /**
     * The state of the user.
     */
    readonly state: UserState;

    /**
     * The logged in state of the user.
     */
    readonly isLoggedIn: boolean;

    /**
     * The identities of the user at any of the app's authentication providers.
     */
    readonly identities: UserIdentity[];

    /**
     * The access token used when requesting a new access token.
     */
    readonly accessToken: string | null;

    /**
     * The refresh token used when requesting a new access token.
     */
    readonly refreshToken: string | null;

    /**
     * You can store arbitrary data about your application users in a MongoDB collection and configure MongoDB Realm to automatically expose each user’s data in a field of their user object.
     * For example, you might store a user’s preferred language, date of birth, or their local timezone.
     *
     * If this value has not been configured, it will be empty.
     */
    readonly customData: CustomDataType;

    /**
     * A profile containing additional information about the user.
     */
    readonly profile: UserProfileDataType;

    /**
     * Use this to call functions defined by the MongoDB Realm app, as this user.
     */
    readonly functions: FunctionsFactoryType & BaseFunctionsFactory;

    /**
     * Perform operations related to the API-key auth provider.
     */
    readonly apiKeys: Realm.Auth.ApiKeyAuth;

    /**
     * Log out the user.
     *
     * @returns A promise that resolves once the user has been logged out of the app.
     */
    logOut(): Promise<void>;

    /**
     * Link the user with an identity represented by another set of credentials.
     *
     * @param credentials The credentials to use when linking.
     */
    linkCredentials(credentials: Credentials): Promise<void>;

    /**
     * Call a remote MongoDB Realm function by its name.
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
    callFunction(name: string, ...args: unknown[]): Promise<unknown>;

    /**
     * Refresh the access token and derive custom data from it.
     *
     * @returns The newly fetched custom data.
     */
    refreshCustomData(): Promise<CustomDataType>;

    /**
     * Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).
     *
     * @returns An service client with methods to register and deregister the device on the user.
     */
    push(serviceName: string): Realm.Services.Push;

    /**
     * Returns a connection to the MongoDB service.
     *
     * @example
     * let blueWidgets = user.mongoClient('myClusterName')
     *                       .db('myDb')
     *                       .collection('widgets')
     *                       .find({color: 'blue'});
     */
    mongoClient(serviceName: string): Realm.Services.MongoDB;
  }

  /**
   * The state of a user.
   */
  enum UserState {
    /** Authenticated and available to communicate with services. */
    Active = "active",
    /** Logged out, but ready to be logged in. */
    LoggedOut = "logged-out",
    /** Removed from the app entirely. */
    Removed = "removed",
  }

  /**
   * The type of a user.
   */
  enum UserType {
    /** A normal end-user created this user */
    Normal = "normal",
    /** The user was created by the server */
    Server = "server",
  }

  // TODO: Implement storing these identities on the user

  /**
   * A user's identity with a particular authentication provider.
   */
  interface UserIdentity {
    /**
     * The id of the identity.
     */
    id: string;

    /**
     * The type of the provider associated with the identity.
     */
    providerType: ProviderType;
  }

  /**
   * An extended profile with detailed information about the user.
   */
  type DefaultUserProfileData = {
    /**
     * The commonly displayed name of the user.
     */
    name?: string;

    /**
     * The users email address.
     */
    email?: string;

    /**
     * A URL referencing a picture associated with the user.
     */
    pictureUrl?: string;

    /**
     * The users first name.
     */
    firstName?: string;

    /**
     * The users last name.
     */
    lastName?: string;

    /**
     * The users gender.
     */
    gender?: string; // TODO: Determine if this is free-text or actually an enum type.

    /**
     * The users birthday.
     */
    birthday?: string; // TODO: Determine the format.

    /**
     * The minimal age of the user.
     */
    minAge?: string;

    /**
     * The maximal age of the user.
     */
    maxAge?: string;
  } & {
    /**
     * Authentication providers might store additional data here.
     */
    [key: string]: unknown;
  };

  /**
   * A function which executes on the MongoDB Realm platform.
   */
  type RealmFunction<R, A extends any[]> = (...args: A) => Promise<R>;

  /**
   * A collection of functions as defined on the MongoDB Server.
   */
  interface BaseFunctionsFactory {
    /**
     * Call a remote MongoDB Realm function by its name.
     * Consider using `functions[name]()` instead of calling this method.
     *
     * @param name Name of the function.
     * @param args Arguments passed to the function.
     */
    callFunction(name: string, ...args: any[]): Promise<any>;

    /**
     * Call a remote MongoDB Realm function by its name, in a streaming mode.
     * Consider using `functions[name]()` instead of calling this method.
     *
     * @param name Name of the function.
     * @param args Arguments passed to the function.
     */
    callFunctionStreaming(name: string, ...args: any[]): Promise<AsyncIterable<Uint8Array>>;
  }

  /**
   * A collection of functions as defined on the MongoDB Server.
   */
  interface DefaultFunctionsFactory extends BaseFunctionsFactory {
    /**
     * All the functions are accessable as members on this instance.
     */
    [name: string]: RealmFunction<any, any[]>;
  }
}
