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

import { FunctionsFactory } from "./FunctionsFactory";
import { User, UserState } from "./User";
import { Credentials } from "./Credentials";
import { create as createServicesFactory } from "./services";
import { EmailPasswordAuth } from "./auth-providers";
import { Storage } from "./storage";
import { AppStorage } from "./AppStorage";
import { getEnvironment } from "./environment";
import { AuthResponse, Authenticator } from "./Authenticator";
import { Fetcher } from "./Fetcher";
import {
    NetworkTransport,
    DefaultNetworkTransport,
} from "realm-network-transport";

/**
 * Default base url to prefix all requests if no baseUrl is specified in the configuration.
 */
export const DEFAULT_BASE_URL = "https://stitch.mongodb.com";

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
}

/**
 * MongoDB Realm App
 */
export class App<
    FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory,
    CustomDataType extends object = any
> implements Realm.App<FunctionsFactoryType, CustomDataType> {
    /** @inheritdoc */
    public readonly functions: FunctionsFactoryType &
        Realm.BaseFunctionsFactory;

    /** @inheritdoc */
    public readonly services: Realm.Services;

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
     * Construct a Realm App, either from the Realm App id visible from the MongoDB Realm UI or a configuration.
     *
     * @param idOrConfiguration The Realm App id or a configuration to use for this app.
     */
    constructor(idOrConfiguration: string | AppConfiguration) {
        // If the argument is a string, convert it to a simple configuration object.
        const configuration =
            typeof idOrConfiguration === "string"
                ? { id: idOrConfiguration }
                : idOrConfiguration;
        // Initialize properties from the configuration
        if (
            typeof configuration === "object" &&
            typeof configuration.id === "string"
        ) {
            this.id = configuration.id;
        } else {
            throw new Error("Missing a MongoDB Realm app-id");
        }
        const {
            storage,
            baseUrl = DEFAULT_BASE_URL,
            transport = new DefaultNetworkTransport(),
        } = configuration;
        // Construct a fetcher wrapping the network transport
        this.fetcher = new Fetcher({
            baseUrl,
            appId: this.id,
            userContext: this,
            transport,
        });
        // Construct the functions factory
        this.functions = FunctionsFactory.create<FunctionsFactoryType>(
            this.fetcher,
        );
        // Construct the services factory
        this.services = createServicesFactory(this.fetcher);
        // Construct the auth providers
        this.emailPasswordAuth = new EmailPasswordAuth(this.fetcher);
        // Construct the storage
        const baseStorage = storage || getEnvironment().defaultStorage;
        this.storage = new AppStorage(baseStorage, this.id);
        this.authenticator = new Authenticator(this.fetcher, baseStorage);
        // Hydrate the app state from storage
        this.hydrate();
    }

    /**
     * Switch user
     *
     * @param nextUser The user or id of the user to switch to
     */
    public switchUser(nextUser: User<FunctionsFactoryType, CustomDataType>) {
        const index = this.users.findIndex(u => u === nextUser);
        if (index === -1) {
            throw new Error("The user was never logged into this app");
        }
        // Remove the user from the stack
        const [user] = this.users.splice(index, 1);
        // Insert the user in the beginning of the stack
        this.users.unshift(user);
    }

    /**
     * Log in a user
     *
     * @param credentials Credentials to use when logging in
     * @param fetchProfile Should the users profile be fetched? (default: true)
     */
    public async logIn(
        credentials: Realm.Credentials<any>,
        fetchProfile = true,
    ): Promise<User<FunctionsFactoryType, CustomDataType>> {
        const response = await this.authenticator.authenticate(credentials);
        const user = this.createOrUpdateUser(response);
        // Let's ensure this will be the current user, in case the user object was reused.
        this.switchUser(user);
        // If neeeded, fetch and set the profile on the user
        if (fetchProfile) {
            await user.refreshProfile();
        }
        // Persist the user id in the storage,
        // merging to avoid overriding logins from other apps using the same underlying storage
        this.storage.setUserIds(
            this.users.map(u => u.id),
            true,
        );
        // Return the user
        return user;
    }

    /**
     * @inheritdoc
     */
    public async removeUser(user: User<FunctionsFactoryType, CustomDataType>) {
        // Remove the user from the list of users
        const index = this.users.findIndex(u => u === user);
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
     * The currently active user (or null if no active users exists)
     *
     * @returns the currently active user or null.
     */
    public get currentUser(): User<
        FunctionsFactoryType,
        CustomDataType
    > | null {
        const activeUsers = this.users.filter(
            user => user.state === UserState.Active,
        );
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
     * @returns An array of users active or loggedout users (current user being the first).
     */
    public get allUsers(): Readonly<
        Realm.User<FunctionsFactoryType, CustomDataType>[]
    > {
        // We need to peek into refresh tokens to avoid cyclic code
        const activeUsers = this.users.filter(
            user => user.refreshToken !== null,
        );
        const loggedOutUsers = this.users.filter(
            user => user.refreshToken === null,
        );
        // Returning a freezed copy of the list of users to prevent outside changes
        return Object.freeze([...activeUsers, ...loggedOutUsers]);
    }

    /**
     * Create (and store) a new user or update an existing user's access and refresh tokens.
     * This helps de-duplicating users in the list of users known to the app.
     *
     * @param response A response from the Authenticator.
     * @returns A new or an existing user.
     */
    private createOrUpdateUser(
        response: AuthResponse,
    ): User<FunctionsFactoryType, CustomDataType> {
        const existingUser = this.users.find(u => u.id === response.userId);
        if (existingUser) {
            // Update the users access and refresh tokens
            existingUser.accessToken = response.accessToken;
            existingUser.refreshToken = response.refreshToken;
            return existingUser;
        } else {
            // Create and store a new user
            const user = new User<FunctionsFactoryType, CustomDataType>({
                app: this,
                id: response.userId,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
            });
            this.users.unshift(user);
            return user;
        }
    }

    /**
     * Restores the state of the app (active and logged-out users) from the storage
     */
    private hydrate() {
        try {
            const userIds = this.storage.getUserIds();
            this.users = userIds.map(id => User.hydrate(this, id));
        } catch (err) {
            // The storage was corrupted
            this.storage.clear();
            throw err;
        }
    }
}
