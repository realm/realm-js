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

declare namespace Realm {
    /**
     * The constructor of MongoDB Realm App.
     */
    type AppConstructor = new <FunctionsFactoryType extends FunctionsFactory>(
        idOrConfiguration: string | AppConfiguration,
    ) => App<FunctionsFactoryType>;

    /**
     * A MongoDB Realm App.
     */
    interface App<
        FunctionsFactoryType extends FunctionsFactory = FunctionsFactory
    > {
        /**
         * The id of this Realm app.
         */
        id: string;

        /**
         * Use this to call functions defined on the MongoDB Realm server.
         */
        functions: FunctionsFactoryType;

        /**
         * The last user to log in or being switched to.
         */
        currentUser: Realm.User | null;

        /**
         * All authenticated users.
         */
        allUsers: Readonly<Realm.User[]>;

        /**
         * Log in a user using a specific credential
         *
         * @param credentials the credentials to use when logging in
         */
        logIn(credentials: Credentials): Promise<Realm.User>;

        /**
         * Log out the currently authenticated user and clear any persisted authentication information.
         */
        logOut(): Promise<void>;

        /**
         * Switch current user, from an instance of `Realm.User` or the string id of the user.
         */
        switchUser(user: User | string): void;
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
    }

    /**
     * End-users enter credentials to authenticate toward your MongoDB Realm App.
     */
    interface Credentials {
        /**
         * Name of the authentication provider.
         */
        readonly providerName: string;

        /**
         * Type of the authentication provider.
         */
        readonly providerType: string;

        /**
         * Creates a simple object which can be passed to the server as the body of a request to authenticate.
         *
         * @returns A simple, flat object.
         */
        toJSON(): { [key: string]: string };

        // TODO: Add providerCapabilities?
    }

    /**
     * Representation of an authenticated user of an app.
     */
    interface User {
        /**
         * The automatically-generated internal ID of the user.
         */
        id: string;

        /**
         * The state of the user.
         */
        state: UserState;

        // TODO: Populate the list of identities
        // identities: UserIdentity[];

        /**
         * The access token used when requesting a new access token.
         */
        accessToken: string | null;

        /**
         * The refresh token used when requesting a new access token.
         */
        refreshToken: string | null;

        /**
         * A profile containing additional information about the user.
         */
        profile: UserProfile;
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

    // TODO: Implement storing these identities on the user
    /*
    interface UserIdentity {
        userId: string;
        providerType: string;
    }
    */

    /**
     * An extended profile with detailed information about the user.
     */
    interface UserProfile {
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
        pictureURL?: string;

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
         * // TODO: Determine if this is free-text or actually an enum type.
         */
        gender?: string;

        /**
         * The users birthday.
         * // TODO: Determine the format.
         */
        birthday?: string;

        /**
         * The minimal age of the user.
         */
        minAge?: string;

        /**
         * The maximal age of the user.
         */
        maxAge?: string;

        /**
         * The type of user
         * // TODO: Determine the meaning of the different possibilities.
         */
        userType: "server" | "normal";
    }

    /**
     * A function which executes on the MongoDB Realm platform.
     */
    type RealmFunction<R, A extends any[]> = (...args: A) => Promise<R>;

    /**
     * A collection of functions as defined on the MongoDB Server.
     */
    interface FunctionsFactory {
        /**
         * Call a remote MongoDB Realm function by it's name.
         * Consider using `functions[name]()` instead of calling this method.
         *
         * @param name Name of the function
         * @param args Arguments passed to the function
         */
        callFunction(name: string, ...args: any[]): Promise<any>;

        /**
         * All the functions are accessable as members on this instance.
         */
        [name: string]: RealmFunction<any, any[]>;
    }
}
