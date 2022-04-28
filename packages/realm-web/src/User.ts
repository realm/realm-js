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

// We're using a dependency to decode Base64 to UTF-8, because of https://stackoverflow.com/a/30106551/503899
import { Base64 } from "js-base64";

import type { App } from "./App";
import { Fetcher } from "./Fetcher";
import { UserProfile } from "./UserProfile";
import { UserStorage } from "./UserStorage";
import { FunctionsFactory } from "./FunctionsFactory";
import { Credentials, ProviderType } from "./Credentials";
import { ApiKeyAuth } from "./auth-providers";
import { createService as createMongoDBRemoteService } from "./services/MongoDBService";
import routes from "./routes";

const DEFAULT_DEVICE_ID = "000000000000000000000000";

type SimpleObject = Record<string, unknown>;

interface HydratableUserParameters {
  app: App;
  id: string;
}

interface UserParameters {
  app: App;
  id: string;
  providerType: ProviderType;
  accessToken: string;
  refreshToken: string;
}

type JWT<CustomDataType = SimpleObject> = {
  expires: number;
  issuedAt: number;
  subject: string;
  userData: CustomDataType;
};

/** The state of a user within the app */
export enum UserState {
  /** Active, with both access and refresh tokens */
  Active = "active",
  /** Logged out, but there might still be data persisted about the user, in the browser. */
  LoggedOut = "logged-out",
  /** Logged out and all data about the user has been removed. */
  Removed = "removed",
}

/** The type of a user. */
export enum UserType {
  /** Created by the user itself. */
  Normal = "normal",
  /** Created by an administrator of the app. */
  Server = "server",
}

/**
 * Representation of an authenticated user of an app.
 */
export class User<
  FunctionsFactoryType = Realm.DefaultFunctionsFactory,
  CustomDataType = SimpleObject,
  UserProfileDataType = Realm.DefaultUserProfileData,
> implements Realm.User<FunctionsFactoryType, CustomDataType, UserProfileDataType>
{
  /**
   * The app that this user is associated with.
   */
  public readonly app: App<FunctionsFactoryType, CustomDataType>;

  /** @inheritdoc */
  public readonly id: string;

  /** @inheritdoc */
  public readonly functions: FunctionsFactoryType & Realm.BaseFunctionsFactory;

  /** @inheritdoc */
  public readonly providerType: ProviderType;

  /** @inheritdoc */
  public readonly apiKeys: ApiKeyAuth;

  private _accessToken: string | null;
  private _refreshToken: string | null;
  private _profile: UserProfile<UserProfileDataType> | undefined;
  private fetcher: Fetcher;
  private storage: UserStorage<UserProfileDataType>;

  /**
   * @param parameters Parameters of the user.
   */
  public constructor(parameters: HydratableUserParameters);
  /**
   * @param parameters Parameters of the user.
   */
  public constructor(parameters: UserParameters);
  /**
   * @param parameters Parameters of the user.
   */
  public constructor(parameters: HydratableUserParameters | UserParameters) {
    this.app = parameters.app as App<unknown, unknown> as App<FunctionsFactoryType, CustomDataType>;
    this.id = parameters.id;
    this.storage = new UserStorage(this.app.storage, this.id);
    if ("accessToken" in parameters && "refreshToken" in parameters && "providerType" in parameters) {
      this._accessToken = parameters.accessToken;
      this._refreshToken = parameters.refreshToken;
      this.providerType = parameters.providerType;
      // Save the parameters to storage, for future instances to be hydrated from
      this.storage.accessToken = parameters.accessToken;
      this.storage.refreshToken = parameters.refreshToken;
      this.storage.providerType = parameters.providerType;
    } else {
      // Hydrate the rest of the parameters from storage
      this._accessToken = this.storage.accessToken;
      this._refreshToken = this.storage.refreshToken;
      const providerType = this.storage.providerType;
      this._profile = this.storage.profile;
      if (providerType) {
        this.providerType = providerType;
      } else {
        throw new Error("Storage is missing a provider type");
      }
    }
    this.fetcher = this.app.fetcher.clone({
      userContext: { currentUser: this as unknown as User },
    });
    this.apiKeys = new ApiKeyAuth(this.fetcher);
    this.functions = FunctionsFactory.create(this.fetcher) as FunctionsFactoryType & Realm.BaseFunctionsFactory;
  }

  /**
   * @returns The access token used to authenticate the user towards MongoDB Realm.
   */
  get accessToken(): string | null {
    return this._accessToken;
  }

  /**
   * @param token The new access token.
   */
  set accessToken(token: string | null) {
    this._accessToken = token;
    this.storage.accessToken = token;
  }

  /**
   * @returns The refresh token used to issue new access tokens.
   */
  get refreshToken(): string | null {
    return this._refreshToken;
  }

  /**
   * @param token The new refresh token.
   */
  set refreshToken(token: string | null) {
    this._refreshToken = token;
    this.storage.refreshToken = token;
  }

  /**
   * @returns The current state of the user.
   */
  get state(): UserState {
    if (this.id in this.app.allUsers) {
      return this.refreshToken === null ? UserState.LoggedOut : UserState.Active;
    } else {
      return UserState.Removed;
    }
  }

  /**
   * @returns The logged in state of the user.
   */
  get isLoggedIn(): boolean {
    return this.state === UserState.Active;
  }

  get customData(): CustomDataType {
    if (this.accessToken) {
      const decodedToken = this.decodeAccessToken();
      return decodedToken.userData;
    } else {
      throw new Error("Cannot read custom data without an access token");
    }
  }

  /**
   * @returns Profile containing detailed information about the user.
   */
  get profile(): UserProfileDataType {
    if (this._profile) {
      return this._profile.data;
    } else {
      throw new Error("A profile was never fetched for this user");
    }
  }

  get identities(): Realm.UserIdentity[] {
    if (this._profile) {
      return this._profile.identities;
    } else {
      throw new Error("A profile was never fetched for this user");
    }
  }

  get deviceId(): string | null {
    if (this.accessToken) {
      const payload = this.accessToken.split(".")[1];
      if (payload) {
        const parsedPayload = JSON.parse(Base64.decode(payload));
        const deviceId = parsedPayload["baas_device_id"];
        if (typeof deviceId === "string" && deviceId !== DEFAULT_DEVICE_ID) {
          return deviceId;
        }
      }
    }
    return null;
  }

  /**
   * Refresh the users profile data.
   */
  public async refreshProfile(): Promise<void> {
    // Fetch the latest profile
    const response = await this.fetcher.fetchJSON({
      method: "GET",
      path: routes.api().auth().profile().path,
    });
    // Create a profile instance
    this._profile = new UserProfile(response);
    // Store this for later hydration
    this.storage.profile = this._profile;
  }

  /**
   * Log out the user, invalidating the session (and its refresh token).
   */
  public async logOut(): Promise<void> {
    // Invalidate the refresh token
    try {
      if (this._refreshToken !== null) {
        await this.fetcher.fetchJSON({
          method: "DELETE",
          path: routes.api().auth().session().path,
          tokenType: "refresh",
        });
      }
    } catch (err) {
      // Ignore failing to delete a missing refresh token
      // It might have expired or it might be gone due to the user being deleted
      if (!(err instanceof Error) || !err.message.includes("failed to find refresh token")) {
        throw err;
      }
    } finally {
      // Forget the access and refresh token
      this.accessToken = null;
      this.refreshToken = null;
    }
  }

  /** @inheritdoc */
  public async linkCredentials(credentials: Credentials): Promise<void> {
    const response = await this.app.authenticator.authenticate(credentials, this as unknown as User);
    // Sanity check the response
    if (this.id !== response.userId) {
      const details = `got user id ${response.userId} expected ${this.id}`;
      throw new Error(`Link response ment for another user (${details})`);
    }
    // Update the access token
    this.accessToken = response.accessToken;
    // Refresh the profile to include the new identity
    await this.refreshProfile();
  }

  /**
   * Request a new access token, using the refresh token.
   */
  public async refreshAccessToken(): Promise<void> {
    const response = await this.fetcher.fetchJSON({
      method: "POST",
      path: routes.api().auth().session().path,
      tokenType: "refresh",
    });
    const { access_token: accessToken } = response as Record<string, unknown>;
    if (typeof accessToken === "string") {
      this.accessToken = accessToken;
    } else {
      throw new Error("Expected an 'access_token' in the response");
    }
  }

  /** @inheritdoc */
  public async refreshCustomData(): Promise<CustomDataType> {
    await this.refreshAccessToken();
    return this.customData;
  }

  /** @inheritdoc */
  public callFunction<ReturnType = unknown>(name: string, ...args: unknown[]): Promise<ReturnType> {
    return this.functions.callFunction(name, ...args);
  }

  /**
   * @returns A plain ol' JavaScript object representation of the user.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      profile: this._profile,
      state: this.state,
      customData: this.customData,
    };
  }

  /** @inheritdoc */
  push(): Realm.Services.Push {
    throw new Error("Not yet implemented");
  }

  /** @inheritdoc */
  public mongoClient(serviceName: string): Realm.Services.MongoDB {
    return createMongoDBRemoteService(this.fetcher, serviceName);
  }

  private decodeAccessToken(): JWT<CustomDataType> {
    if (this.accessToken) {
      // Decode and spread the token
      const parts = this.accessToken.split(".");
      if (parts.length !== 3) {
        throw new Error("Expected an access token with three parts");
      }
      // Decode the payload
      const encodedPayload = parts[1];
      const decodedPayload = Base64.decode(encodedPayload);
      const parsedPayload = JSON.parse(decodedPayload);
      const { exp: expires, iat: issuedAt, sub: subject, user_data: userData = {} } = parsedPayload;
      // Validate the types
      if (typeof expires !== "number") {
        throw new Error("Failed to decode access token 'exp'");
      } else if (typeof issuedAt !== "number") {
        throw new Error("Failed to decode access token 'iat'");
      }
      return { expires, issuedAt, subject, userData };
    } else {
      throw new Error("Missing an access token");
    }
  }
}
