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
import { AuthenticatedTransport, AppTransport } from "./transports";
import { UserProfile } from "./UserProfile";
import { UserStorage } from "./UserStorage";
import { FunctionsFactory } from "./FunctionsFactory";
import { Credentials } from "./Credentials";
import { ApiKeyAuth } from "./auth-providers";

// Disabling requiring JSDoc for now - as the User class is exported as the Realm.User interface, which is already documented.
/* eslint-disable jsdoc/require-jsdoc */

interface UserParameters {
    app: App<any>;
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
}

type JWT<CustomDataType extends object = any> = {
    expires: number;
    issuedAt: number;
    userData: CustomDataType;
};

export enum UserState {
    Active = "active",
    LoggedOut = "logged-out",
    Removed = "removed",
}

export enum UserType {
    Normal = "normal",
    Server = "server",
}

/**
 * Representation of an authenticated user of an app.
 */
export class User<
    FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory,
    CustomDataType extends object = any
> implements Realm.User<FunctionsFactoryType, CustomDataType> {
    /**
     * The app that this user is associated with.
     */
    public readonly app: App<FunctionsFactoryType, CustomDataType>;

    public readonly functions: FunctionsFactoryType &
        Realm.BaseFunctionsFactory;

    /** @inheritdoc */
    public apiKeys: ApiKeyAuth;

    /**
     * Creates a user from the data stored in the storage of an `App` instance.
     *
     * @param app The app that the user was logged into.
     * @param userId The id of the user to restore.
     * @returns The user created from values retrieved from storage.
     */
    public static hydrate<
        FunctionsFactoryType extends object,
        CustomDataType extends object
    >(app: App<FunctionsFactoryType, CustomDataType>, userId: string) {
        const user = new User<FunctionsFactoryType, CustomDataType>({
            app,
            id: userId,
            accessToken: null,
            refreshToken: null,
        });
        user.hydrate();
        return user;
    }

    private _id: string;
    private _accessToken: string | null;
    private _refreshToken: string | null;
    private _profile: UserProfile | undefined;
    private transport: AuthenticatedTransport;
    private storage: UserStorage;

    public constructor({ app, id, accessToken, refreshToken }: UserParameters) {
        this.app = app;
        this._id = id;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this.transport = new AuthenticatedTransport(app.baseTransport, {
            currentUser: this,
        });
        const appTransport = new AppTransport(this.transport, app.id);
        this.apiKeys = new ApiKeyAuth(this.transport);
        this.functions = FunctionsFactory.create(appTransport);
        this.storage = new UserStorage(app.storage, id);
        // Store tokens in storage for later hydration
        if (accessToken) {
            this.storage.accessToken = accessToken;
        }
        if (refreshToken) {
            this.storage.refreshToken = refreshToken;
        }
    }

    /**
     * The automatically-generated internal id of the user.
     *
     * @returns The id of the user in the MongoDB Realm database.
     */
    get id() {
        return this._id;
    }

    /**
     * @returns The access token used to authenticate the user towards MongoDB Realm.
     */
    get accessToken() {
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
    get refreshToken() {
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
     * The state of the user is one of:
     * - "active" The user is logged in and ready.
     * - "logged-out" The user was logged in, but is no longer logged in.
     * - "removed" The user was logged in, but removed entirely from the app again.
     *
     * @returns The current state of the user.
     */
    get state(): UserState {
        if (this.app.allUsers.indexOf(this) === -1) {
            return UserState.Removed;
        } else {
            return this.refreshToken === null
                ? UserState.LoggedOut
                : UserState.Active;
        }
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
    get profile(): Realm.UserProfile {
        if (this._profile) {
            return this._profile;
        } else {
            throw new Error("A profile was never fetched for this user");
        }
    }

    public async refreshProfile() {
        // Fetch the latest profile
        const response = await this.transport.fetch({
            method: "GET",
            path: "/auth/profile",
        });
        // Create a profile instance
        this._profile = new UserProfile(response);
        // Store this for later hydration
        this.storage.profile = this._profile;
    }

    public async logOut() {
        // Invalidate the refresh token
        if (this._refreshToken !== null) {
            await this.app.baseTransport.fetch({
                method: "DELETE",
                path: "/auth/session",
                headers: {
                    Authorization: `Bearer ${this._refreshToken}`,
                },
            });
        }
        // Forget the access and refresh token
        this.accessToken = null;
        this.refreshToken = null;
    }

    /**
     * Authenticate and retrieve the access and refresh tokens.
     *
     * @param credentials Credentials to use when logging in.
     */
    public async logIn(credentials: Realm.Credentials) {
        const { id, accessToken, refreshToken } = await performLogIn(
            this.app,
            credentials,
        );
        if (id !== this.id) {
            throw new Error("Logged into a different user");
        }
        // Store the access and refresh token
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    /** @inheritdoc */
    public async linkCredentials(credentials: Realm.Credentials) {
        throw new Error("Not yet implemented");
    }

    public async refreshAccessToken() {
        const response = await this.app.baseTransport.fetch({
            method: "POST",
            path: "/auth/session",
            headers: {
                Authorization: `Bearer ${this.refreshToken}`,
            },
        });
        const { access_token: accessToken } = response;
        if (typeof accessToken === "string") {
            this.accessToken = accessToken;
        } else {
            throw new Error("Expected an 'access_token' in the response");
        }
    }

    public async refreshCustomData() {
        await this.refreshAccessToken();
        return this.customData;
    }

    public callFunction(name: string, ...args: any[]) {
        return this.functions.callFunction(name, ...args);
    }

    /**
     * Restore a user from the data stored in the storage of an `App` instance.
     */
    public hydrate() {
        // Hydrate tokens
        const accessToken = this.storage.accessToken;
        const refreshToken = this.storage.refreshToken;
        const profile = this.storage.profile;
        if (typeof accessToken === "string") {
            this.accessToken = accessToken;
        }
        if (typeof refreshToken === "string") {
            this.refreshToken = refreshToken;
        }
        if (typeof profile === "object") {
            this._profile = profile;
        }
    }

    push(serviceName = ""): Realm.Services.Push {
        throw new Error("Not yet implemented");
    }

    private decodeAccessToken(): JWT<CustomDataType> {
        if (this.accessToken) {
            // Decode and spread the token
            const parts = this.accessToken.split(".");
            if (parts.length !== 3) {
                throw new Error("Expected three parts");
            }
            // Decode the payload
            const encodedPayload = parts[1];
            const decodedPayload = Base64.decode(encodedPayload);
            const parsedPayload = JSON.parse(decodedPayload);
            const {
                exp: expires,
                iat: issuedAt,
                user_data: userData = {},
            } = parsedPayload;
            // Validate the types
            if (typeof expires !== "number") {
                throw new Error("Failed to decode access token 'exp'");
            } else if (typeof issuedAt !== "number") {
                throw new Error("Failed to decode access token 'iat'");
            }
            return { expires, issuedAt, userData };
        } else {
            throw new Error("Missing an access token");
        }
    }
}
