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
    onController?: (controller: UserController) => void;
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

export interface UserController {
    setAccessToken(token: string): void;
    setState(state: UserState): void;
}

export interface UserControlHandle {
    user: User;
    controller: UserController;
}

/**
 * Representation of an authenticated user of an app.
 */
export class User implements Realm.User {
    /**
     * The app that this user is associated with.
     */
    public readonly app: App<any>;

    /*
     * The list of identities associated with this user.
     * // TODO: Implement and test this ...
     */
    // public readonly identities: Realm.UserIdentity[] = [];

    /**
     * Create a user, returning both the user and a controller enabling updates to the user's internal state.
     *
     * @param parameters The parameters passed to the constructor.
     * @returns an object containing the new user and its controller.
     */
    public static create(parameters: UserParameters): UserControlHandle {
        const { onController, ...otherParameters } = parameters;
        let controller: UserController | undefined;
        const user = new User({
            ...otherParameters,
            onController: c => {
                if (onController) {
                    onController(c);
                }
                controller = c;
            },
        });
        if (controller) {
            return { user, controller };
        } else {
            throw new Error(
                "Expected controllerReady to be called synchronously",
            );
        }
    }

    /**
     * Log in and create a user
     *
     * @param transport The transport to use when issuing requests
     * @param credentials Credentials to use when logging in
     * @param app
     * @param fetchProfile Should the users profile be fetched? (default: true)
     */
    public static async logIn(
        app: App<Realm.BaseFunctionsFactory>,
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
        const handle = User.create({
            app,
            id: userId,
            accessToken,
            refreshToken,
        });
        // If neeeded, fetch and set the profile on the user
        if (fetchProfile) {
            await handle.user.refreshProfile();
        }
        // Return the user handle
        return handle;
    }

    private _id: string;
    private _accessToken: string | null;
    private _refreshToken: string | null;
    private _profile: Realm.UserProfile | undefined;
    private _state: Realm.UserState;
    private transport: AuthenticatedTransport;

    public constructor({
        app,
        id,
        accessToken,
        refreshToken,
        onController,
    }: UserParameters) {
        this.app = app;
        this._id = id;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this._state = UserState.Active;
        this.transport = new AuthenticatedTransport(app.baseTransport, {
            currentUser: this,
        });

        // Create and expose the controller to the creator
        if (onController) {
            onController({
                setAccessToken: token => {
                    this._accessToken = token;
                },
                setState: state => {
                    this._state = state;
                },
            });
        }
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
    get state(): Realm.UserState {
        return this._state;
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
        // Update the state
        this._state = UserState.LoggedOut;
    }
}
