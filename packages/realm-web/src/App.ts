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

import { create as createFunctionsFactory } from "./FunctionsFactory";
import { User, UserState } from "./User";
import { AuthenticatedTransport, Transport, BaseTransport } from "./transports";
import { Credentials } from "./Credentials";
import { create as createServicesFactory } from "./services";
import { EmailPasswordAuth } from "./auth-providers";

/**
 * Configuration to pass as an argument when constructing an app.
 */
export interface AppConfiguration extends Realm.AppConfiguration {
    /** Transport to use when fetching resources */
    transport?: NetworkTransport;
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
     * Default base url to prefix all requests if no baseUrl is specified in the configuration.
     */
    public static readonly DEFAULT_BASE_URL = "https://stitch.mongodb.com";

    /**
     * A transport adding the base route prefix to all requests.
     */
    public readonly baseTransport: Transport;

    /**
     * A transport adding the base and app route prefix to all requests.
     */
    public readonly appTransport: Transport;

    /** @inheritdoc */
    public readonly emailPasswordAuth: EmailPasswordAuth;

    /**
     * This base route will be prefixed requests issued through by the base transport
     */
    private static readonly BASE_ROUTE = "/api/client/v2.0";

    /**
     * A (reversed) stack of active and logged-out users.
     * Elements in the beginning of the array is considered more recent than the later elements.
     */
    private readonly users: User<FunctionsFactoryType, CustomDataType>[] = [];

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
        const baseUrl = configuration.baseUrl || App.DEFAULT_BASE_URL;
        // Get or construct the network transport
        this.baseTransport = new BaseTransport(
            configuration.transport,
            baseUrl,
            App.BASE_ROUTE,
        );
        // Construct an object, wrapping the network transport, enabling authenticated requests
        this.appTransport = this.baseTransport.prefix(`/app/${this.id}`);
        const authTransport = new AuthenticatedTransport(
            this.appTransport,
            this,
        );
        // Construct the functions factory
        this.functions = createFunctionsFactory<FunctionsFactoryType>(
            authTransport,
        );
        // Construct the services factory
        this.services = createServicesFactory(authTransport);
        // Construct the auth providers
        this.emailPasswordAuth = new EmailPasswordAuth(authTransport);
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
    public async logIn(credentials: Realm.Credentials, fetchProfile = true) {
        const user: User<
            FunctionsFactoryType,
            CustomDataType
        > = await User.logIn(this, credentials, fetchProfile);
        // Add the user at the top of the stack
        this.users.unshift(user);
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
        // Log out the user
        await user.logOut();
        // TODO: Delete any data / tokens which were persisted
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
     * Get the (user and it's controller) handle of a user
     *
     * @param userOrId A user object or user id
     * @returns A handle containing the user and it's controller.
     */
    private getUser(userOrId: Realm.User | string | null) {
        const user = this.users.find(u =>
            typeof userOrId === "string" ? u.id === userOrId : u === userOrId,
        );
        if (user) {
            return user;
        } else {
            throw new Error("Invalid user or user id");
        }
    }
}
