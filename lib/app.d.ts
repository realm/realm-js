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
        id: string,
        configuration?: Partial<AppConfiguration>,
    ) => App<FunctionsFactoryType>;

    /**
     * A MongoDB Realm App.
     */
    interface App<FunctionsFactoryType extends FunctionsFactory = FunctionsFactory> {
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
        switchUser(user: User | string): void;
    }

    interface AppConfiguration {
        baseUrl: string;
    }

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
         * The contents of this credential as they will be passed to the server.
         */
        readonly material: { [key: string]: string };
    
        // TODO: Add providerCapabilities?
    }

    interface User {
        id: string;
        state: UserState;
        identities: UserIdentity[];
        accessToken: string | null;
        refreshToken: string | null;
        profile: UserProfile;
    }

    enum UserState {
        Active = "active",
        LoggedOut = "logged-out",
        Removed = "removed"
    }

    interface UserIdentity {
        userId: string;
        providerType: string;
    }

    interface UserProfile {
        name?: string;
        email?: string;
        pictureURL?: string;
        firstName?: string;
        lastName?: string;
        gender?: string;
        birthday?: string;
        minAge?: string;
        maxAge?: string;
        userType: 'server' | 'normal';
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
