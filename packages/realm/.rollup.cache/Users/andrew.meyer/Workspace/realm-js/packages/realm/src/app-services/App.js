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
import { EmailPasswordAuthClient, Listeners, Sync, User, assert, binding, createNetworkTransport, fs, } from "../internal";
// TODO: Ensure this doesn't leak
const appByUserId = new Map();
/**
 * The class represents an Atlas App Services Application.
 *
 * ```js
 * let app = new Realm.App(config);
 * ```
 *
 * @memberof Realm
 */
export class App {
    // TODO: Ensure these are injected by the platform
    /** @internal */
    static PLATFORM_CONTEXT = "unknown-context";
    /** @internal */
    static PLATFORM_OS = "unknown-os";
    /** @internal */
    static PLATFORM_VERSION = "0.0.0";
    /** @internal */
    static SDK_VERSION = "0.0.0";
    static Sync = Sync;
    /** @internal */
    static get(userInternal) {
        const app = appByUserId.get(userInternal.identity);
        if (!app) {
            throw new Error(`Cannot determine which app is associated with user (id = ${userInternal.identity})`);
        }
        return app;
    }
    /** @internal */
    internal;
    userAgent = `RealmJS/${App.SDK_VERSION} (${App.PLATFORM_CONTEXT}, ${App.PLATFORM_OS}, v${App.PLATFORM_VERSION})`;
    listeners = new Listeners({
        register: (callback) => {
            return this.internal.subscribe(callback);
        },
        unregister: (token) => {
            this.internal.unsubscribe(token);
        },
    });
    constructor(configOrId) {
        const config = typeof configOrId === "string" ? { id: configOrId } : configOrId;
        assert.object(config, "config");
        const { id, baseUrl } = config;
        assert.string(id, "id");
        // TODO: This used getSharedApp in the legacy SDK, but it's failing AppTests
        this.internal = binding.App.getUncachedApp({
            appId: id,
            platform: App.PLATFORM_OS,
            platformVersion: App.PLATFORM_VERSION,
            sdkVersion: App.SDK_VERSION,
            transport: createNetworkTransport(),
            baseUrl,
        }, {
            baseFilePath: fs.getDefaultDirectoryPath(),
            metadataMode: 0 /* binding.MetadataMode.NoEncryption */,
            userAgentBindingInfo: this.userAgent,
        });
    }
    /**
     * @return The app id.
     */
    get id() {
        return this.internal.config.appId;
    }
    async logIn(credentials) {
        const userInternal = await this.internal.logInWithCredentials(credentials.internal);
        appByUserId.set(userInternal.identity, this);
        return new User(userInternal, this);
    }
    get emailPasswordAuth() {
        // TODO: Add memoization
        const internal = this.internal.usernamePasswordProviderClient();
        return new EmailPasswordAuthClient(internal);
    }
    get currentUser() {
        const currentUser = this.internal.currentUser;
        return currentUser ? User.get(currentUser) : null;
    }
    get allUsers() {
        return this.internal.allUsers.map((user) => User.get(user));
    }
    switchUser() {
        throw new Error("Not yet implemented");
    }
    async removeUser(user) {
        await this.internal.removeUser(user.internal);
    }
    async deleteUser(user) {
        await this.internal.deleteUser(user.internal);
    }
    addListener(callback) {
        this.listeners.add(callback);
    }
    removeListener(callback) {
        this.listeners.remove(callback);
    }
    removeAllListeners() {
        this.listeners.removeAll();
    }
}
//# sourceMappingURL=App.js.map