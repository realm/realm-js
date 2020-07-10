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

import type { App } from "./App";
import { AuthenticatedTransport } from "./transports";
import { UserProfile } from "./UserProfile";

// Disabling requiring JSDoc for now - as the User class is exported as the Realm.User interface, which is already documented.
/* eslint-disable jsdoc/require-jsdoc */

interface UserParameters {
    app: App<any>;
    id: string;
    accessToken: string;
    refreshToken: string;
}

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

    /**
     * Log in and create a user
     *
     * @param app The app used when logging in the user
     * @param credentials Credentials to use when logging in
     * @param fetchProfile Should the users profile be fetched? (default: true)
     */
    public static async logIn<
        FunctionsFactoryType extends object,
        CustomDataType extends object
    >(
        app: App<FunctionsFactoryType, CustomDataType>,
        credentials: Realm.Credentials,
        fetchProfile = true,
    ) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const response = await app.appTransport.fetch(
            {
                method: "POST",
                path: `/auth/providers/${credentials.providerName}/login`,
                body: credentials.payload,
            },
            null,
        );
        // Spread out values from the response and ensure they're valid
        const {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
        } = response;
        if (typeof userId !== "string") {
            throw new Error("Expected a user id in the response");
        }
        if (typeof accessToken !== "string") {
            throw new Error("Expected an access token in the response");
        }
        if (typeof refreshToken !== "string") {
            throw new Error("Expected an refresh token in the response");
        }
        // Create the user
        const user = new User<FunctionsFactoryType, CustomDataType>({
            app,
            id: userId,
            accessToken,
            refreshToken,
        });
        // If neeeded, fetch and set the profile on the user
        if (fetchProfile) {
            await user.refreshProfile();
        }
        // Return the user handle
        return user;
    }

    private _id: string;
    private _accessToken: string | null;
    private _refreshToken: string | null;
    private _profile: Realm.UserProfile | undefined;
    private _state: Realm.UserState;
    private transport: AuthenticatedTransport;

    public constructor({ app, id, accessToken, refreshToken }: UserParameters) {
        this.app = app;
        this._id = id;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this._state = UserState.Active;
        this.transport = new AuthenticatedTransport(app.baseTransport, {
            currentUser: this,
        });
    }

    /**
     * The automatically-generated internal ID of the user.
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
     * @returns The refresh token used to issue new access tokens.
     */
    get refreshToken() {
        return this._refreshToken;
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
            return this._refreshToken === null
                ? UserState.LoggedOut
                : UserState.Active;
        }
    }

    get customData(): CustomDataType {
        throw new Error("Not yet implemented");
    }

    get functions(): FunctionsFactoryType & Realm.BaseFunctionsFactory {
        throw new Error("Not yet implemented");
    }

    get apiKeys(): Realm.Auth.ApiKeyAuth {
        throw new Error("Not yet implemented");
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
            // Forget the tokens
            this._accessToken = null;
            this._refreshToken = null;
        }
        // Update the state
        this._state = UserState.LoggedOut;
    }

    /** @inheritdoc */
    public async linkCredentials(credentials: Realm.Credentials) {
        throw new Error("Not yet implemented");
    }

    public async refreshCustomData() {
        await this.refreshAccessToken();
        return this.customData;
    }

    public callFunction(name: string, ...args: any[]) {
        return this.functions.callFunction(name, ...args);
    }

    private async refreshAccessToken() {
        throw new Error("Not yet implemented");
    }

    push(serviceName = ""): Realm.Services.Push {
        throw new Error("Not yet implemented");
    }
}
