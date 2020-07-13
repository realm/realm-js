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

import { NetworkTransport } from "realm-network-transport";

import { FunctionsFactory } from "./FunctionsFactory";
import { User, UserState, performLogIn } from "./User";
import { AuthenticatedTransport, Transport, BaseTransport } from "./transports";
import { Credentials } from "./Credentials";
import { create as createServicesFactory } from "./services";
import { EmailPasswordAuth } from "./auth-providers";
import { Storage, createDefaultStorage } from "./storage";
import { AppStorage } from "./AppStorage";
import { AppLocation, AppLocationContext } from "./AppLocation";
import { OAuth2Helper } from "./OAuth2Helper";

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
     * Should the location of the app be fetched to determine the base URL upon the first request?
     *
     * @default true
     */
    fetchLocation?: boolean;
}

/**
 * MongoDB Realm App
 */
export class App<
    FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory,
    CustomDataType extends object = any
>
    implements
        Realm.App<FunctionsFactoryType, CustomDataType>,
        AppLocationContext {
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
     * Default base url to prefix all requests if no baseUrl is specified in the configuration.
     */
    public static readonly DEFAULT_BASE_URL = "https://stitch.mongodb.com";

    /**
     * A transport adding the base route prefix to all requests.
     */
    public readonly baseTransport: BaseTransport;

    /**
     * A transport adding the base and app route prefix to all requests.
     */
    public readonly appTransport: Transport;

    /** @inheritdoc */
    public readonly emailPasswordAuth: EmailPasswordAuth;

    /**
     * Storage available for the app.
     */
    public readonly storage: AppStorage;

    /**
     * An array of active and logged-out users.
     * Elements in the beginning of the array is considered more recent than the later elements.
     */
    private users: User<FunctionsFactoryType, CustomDataType>[] = [];

    /**
     * An promise of the apps location metadata.
     */
    private _location: Promise<AppLocation> | undefined;

    /**
     * A helper used to complete an OAuth 2.0 authentication flow.
     */
    private oauth2: OAuth2Helper;

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
            transport,
            storage,
            baseUrl,
            fetchLocation = true,
        } = configuration;
        // Construct the various transports
        this.baseTransport = new BaseTransport(
            transport,
            baseUrl || App.DEFAULT_BASE_URL,
            fetchLocation ? this : undefined,
        );
        this.appTransport = this.baseTransport.prefix(`/app/${this.id}`);
        const authTransport = new AuthenticatedTransport(
            this.appTransport,
            this,
        );
        // Construct the functions factory
        this.functions = FunctionsFactory.create<FunctionsFactoryType>(
            authTransport,
        );
        // Construct the services factory
        this.services = createServicesFactory(authTransport);
        // Construct the auth providers
        this.emailPasswordAuth = new EmailPasswordAuth(authTransport);
        // Construct the storage
        const baseStorage = storage || createDefaultStorage();
        this.storage = new AppStorage(baseStorage, this.id);
        // Constructing the oauth2 helper, passing in the baseStorage to avoid an app scope.
        this.oauth2 = new OAuth2Helper(baseStorage, async () => {
            const baseUrl = await this.baseTransport.determineBaseUrl(false);
            return `${baseUrl}/app/${this.id}`;
        });
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
        const user = await this.performLogIn(credentials);
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
     * Get the location metadata of an app.
     *
     * @returns A promise of the app's location metadata.
     */
    public get location(): Promise<AppLocation> {
        // Initiate the fetch of the location metadata only once per app instance.
        if (!this._location) {
            this._location = this.baseTransport.fetch({
                method: "GET",
                path: `/app/${this.id}/location`,
                ignoreLocation: true,
            });
        }
        return this._location;
    }

    /**
     * Perform the actual login, based on the credentials.
     * Either it decodes the credentials and instantiates a user directly or it calls User.logIn to perform a fetch.
     *
     * @param credentials Credentials to use when logging in
     */
    private async performLogIn(
        credentials: Realm.Credentials<any>,
    ): Promise<User<FunctionsFactoryType, CustomDataType>> {
        if (
            credentials.providerType.startsWith("oauth2") &&
            typeof credentials.payload.redirectUrl === "string"
        ) {
            // Initiate the OAuth2 and use the next credentials once they're known
            const result = await this.oauth2.initiate(credentials);
            const {
                userId,
                accessToken,
                refreshToken,
            } = OAuth2Helper.decodeAuthInfo(result.userAuth);
            return this.createOrUpdateUser(userId, accessToken, refreshToken);
        } else {
            const { id, accessToken, refreshToken } = await performLogIn(
                this,
                credentials,
            );
            return this.createOrUpdateUser(id, accessToken, refreshToken);
        }
    }

    /**
     * Create (and store) a new user or update an existing user's access and refresh tokens.
     * This helps de-duplicating users in the list of users known to the app.
     *
     * @param userId The id of the user.
     * @param accessToken The new access token of the user.
     * @param refreshToken The new refresh token of the user.
     * @returns A new or an existing user.
     */
    private createOrUpdateUser(
        userId: string,
        accessToken: string,
        refreshToken: string,
    ): User<FunctionsFactoryType, CustomDataType> {
        const existingUser = this.users.find(u => u.id === userId);
        if (existingUser) {
            // Update the users access and refresh tokens
            existingUser.accessToken = accessToken;
            existingUser.refreshToken = refreshToken;
            return existingUser;
        } else {
            // Create and store a new user
            const user = new User<FunctionsFactoryType, CustomDataType>({
                app: this,
                id: userId,
                accessToken,
                refreshToken,
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
