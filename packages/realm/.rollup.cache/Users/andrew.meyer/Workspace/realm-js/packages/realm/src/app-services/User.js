////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { ApiKeyAuthClient, App, Listeners, MongoClient, PushClient, createFactory, isProviderType, } from "../internal";
/**
 * The state of a user.
 */
export var UserState;
(function (UserState) {
    /** Authenticated and available to communicate with services. */
    UserState["Active"] = "active";
    /** Logged out, but ready to be logged in. */
    UserState["LoggedOut"] = "logged-out";
    /** Removed from the app entirely. */
    UserState["Removed"] = "removed";
})(UserState || (UserState = {}));
/** @internal */
function cleanArguments(args) {
    if (Array.isArray(args)) {
        return args.map((x) => cleanArguments(x));
    }
    if (args === null || typeof args != "object") {
        return args;
    }
    const result = {};
    for (const [k, v] of Object.entries(args)) {
        if (typeof v !== "undefined") {
            result[k] = cleanArguments(v);
        }
    }
    return result;
}
export class User {
    /** @internal */
    app;
    /** @internal */
    internal;
    // cached version of profile
    cachedProfile;
    listeners = new Listeners({
        register: (callback) => {
            return this.internal.subscribe(callback);
        },
        unregister: (token) => {
            this.internal.unsubscribe(token);
        },
    });
    /** @internal */
    static get(internal) {
        // TODO: Use a WeakRef to memoize the SDK object
        return new User(internal, App.get(internal));
    }
    /** @internal */
    constructor(internal, app) {
        this.internal = internal;
        this.app = app;
        this.cachedProfile = undefined;
    }
    /**
     * The automatically-generated internal ID of the user.
     */
    get id() {
        return this.internal.identity;
    }
    /**
     * The provider type used when authenticating the user.
     */
    get providerType() {
        const type = this.internal.providerType;
        if (isProviderType(type)) {
            return type;
        }
        else {
            throw new Error(`Unexpected provider type: ${type}`);
        }
    }
    /**
     * The id of the device.
     */
    get deviceId() {
        return this.internal.deviceId;
    }
    /**
     * The state of the user.
     */
    get state() {
        throw new Error("Not yet implemented");
    }
    /**
     * The logged in state of the user.
     */
    get isLoggedIn() {
        return this.internal.isLoggedIn;
    }
    /**
     * The identities of the user at any of the app's authentication providers.
     */
    get identities() {
        return this.internal.identities.map((identity) => {
            const { id, provider_type: providerType } = identity;
            return { id, providerType };
        });
    }
    /**
     * The access token used when requesting a new access token.
     */
    get accessToken() {
        return this.internal.accessToken;
    }
    /**
     * The refresh token used when requesting a new access token.
     */
    get refreshToken() {
        return this.internal.refreshToken;
    }
    /**
     * You can store arbitrary data about your application users in a MongoDB collection and configure
     * Atlas App Services to automatically expose each user’s data in a field of their user object.
     * For example, you might store a user’s preferred language, date of birth, or their local timezone.
     *
     * If this value has not been configured, it will be empty.
     */
    get customData() {
        const result = this.internal.customData;
        if (result === undefined) {
            return {};
        }
        return result;
    }
    /**
     * A profile containing additional information about the user.
     */
    get profile() {
        if (!this.cachedProfile) {
            this.cachedProfile = this.internal.userProfile.data();
        }
        return this.cachedProfile;
    }
    /**
     * Use this to call functions defined by the Atlas App Services application, as this user.
     */
    get functions() {
        return createFactory(this, undefined);
    }
    /**
     * Perform operations related to the API-key auth provider.
     */
    get apiKeys() {
        // TODO: Add memoization
        const internal = this.app.internal.userApiKeyProviderClient();
        return new ApiKeyAuthClient(this.internal, internal);
    }
    /**
     * Log out the user.
     *
     * @returns A promise that resolves once the user has been logged out of the app.
     */
    async logOut() {
        await this.app.internal.logOutUser(this.internal);
    }
    /**
     * Link the user with an identity represented by another set of credentials.
     *
     * @param credentials The credentials to use when linking.
     */
    async linkCredentials(credentials) {
        throw new Error("Not yet implemented");
    }
    /**
     * Call a remote Atlas Function by its name.
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
    callFunction(name, ...args) {
        return this.callFunctionOnService(name, undefined, args);
    }
    /** @internal */
    callFunctionOnService(name, serviceName, ...args) {
        const cleanedArgs = cleanArguments(args);
        return this.app.internal.callFunction(this.internal, name, cleanedArgs, serviceName);
    }
    /**
     * Refresh the access token and derive custom data from it.
     *
     * @returns The newly fetched custom data.
     */
    async refreshCustomData() {
        await this.app.internal.refreshCustomData(this.internal);
        return this.customData;
    }
    /**
     * Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).
     *
     * @deprecated https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/
     * @returns An service client with methods to register and deregister the device on the user.
     */
    push(serviceName) {
        const internal = this.app.internal.pushNotificationClient(serviceName);
        return new PushClient(this.internal, internal);
    }
    /**
     * Returns a connection to the MongoDB service.
     *
     * @example
     * let blueWidgets = user.mongoClient('myClusterName')
     *                       .db('myDb')
     *                       .collection('widgets')
     *                       .find({color: 'blue'});
     */
    mongoClient(serviceName) {
        return {
            get serviceName() {
                return serviceName;
            },
            db: (dbName) => {
                return {
                    get name() {
                        return dbName;
                    },
                    collection: (collectionName) => {
                        return new MongoClient(this.internal, serviceName, dbName, collectionName);
                    },
                };
            },
        };
    }
    /**
     * Adds a listener that will be fired on various user related events.
     * This includes auth token refresh, refresh token refresh, refresh custom user data, and logout.
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    /**
     * Removes the event listener
     */
    removeListener(callback) {
        this.listeners.remove(callback);
    }
    /**
     * Removes all event listeners
     */
    removeAllListeners() {
        this.listeners.removeAll();
    }
}
//# sourceMappingURL=User.js.map