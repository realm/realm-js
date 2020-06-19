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

import { expect } from "chai";

import { App } from "./App";
import { User, UserState } from "./User";
import { MockNetworkTransport } from "./test/MockNetworkTransport";
import { Credentials } from "./Credentials";
import { MemoryStorage } from "./storage";
import { app } from ".";

const DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

/* eslint-disable @typescript-eslint/camelcase */

describe("App", () => {
    it("can call the App as a constructor", () => {
        const app = new App("default-app-id");
        expect(app).to.be.instanceOf(App);
    });

    it("can call the App as a constructor with options", () => {
        const app = new App({
            id: "default-app-id",
            baseUrl: "http://localhost:3000",
        });
        expect(app).to.be.instanceOf(App);
    });

    it("throws if no id is provided", () => {
        expect(() => {
            new (App as any)();
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("throws if an object is provided instead of an id", () => {
        expect(() => {
            new (App as any)({});
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("expose the id", () => {
        const app = new App("default-app-id");
        expect(app.id).equals("default-app-id");
    });

    it("expose a functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions).equals("object");
    });

    it("expose a callable functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions.hello).equals("function");
    });

    it("expose a static Credentials factory", () => {
        expect(typeof App.Credentials).not.equals("undefined");
        expect(typeof App.Credentials.anonymous).equals("function");
        expect(typeof App.Credentials.apiKey).equals("function");
        expect(typeof App.Credentials.emailPassword).equals("function");
    });

    it("can log in a user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {
                data: {
                    first_name: "John",
                    last_name: "Doe",
                },
                domain_id: "5ed10debc085000e2c0097ac",
                identities: [
                    {
                        id: "5ed10e0dc085000e2c0099f2-fufttusvpmojykvacvhijoaq",
                        provider_id: "5ed10dedc085000e2c0097c5",
                        provider_type: "anon-user",
                    },
                ],
                type: "normal",
                user_id: "5ed10e0dc085000e2c0099f3",
            },
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.emailPassword(
            "gilfoil@testing.mongodb.com",
            "v3ry-s3cret",
        );
        const user = await app.logIn(credentials);
        // Expect logging in returns a user
        expect(user).is.instanceOf(User);
        // Expect the user has an id
        expect(user.id).equals("totally-valid-user-id");
        // Expect the user has an access token
        expect(user.accessToken).equal("deadbeef");
        // Expect the user is logged in (active)
        expect(user.state).equals("active");
        expect(user.state).equals(UserState.Active);
        // Expect the request made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/local-userpass/login",
                body: {
                    username: "gilfoil@testing.mongodb.com",
                    password: "v3ry-s3cret",
                },
                headers: DEFAULT_HEADERS,
            },
            {
                method: "GET",
                url: "http://localhost:1337/api/client/v2.0/auth/profile",
                headers: {
                    Authorization: "Bearer deadbeef",
                    ...DEFAULT_HEADERS,
                },
            },
        ]);
    });

    it("can log out a user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {},
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Expect that we logged in
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        await user.logOut();
        expect(app.currentUser).equals(null);
        expect(user.state).equals(UserState.LoggedOut);
        expect(user.state).equals("logged-out");
        expect(app.allUsers).deep.equals([user]);
        // Assume the correct requests made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
                headers: DEFAULT_HEADERS,
            },
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    Authorization: "Bearer very-refreshing",
                    ...DEFAULT_HEADERS,
                },
            },
        ]);
    });

    it("can remove an active user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {},
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Expect that we logged in
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        await app.removeUser(user);
        expect(app.currentUser).equals(null);
        expect(user.state).equals(UserState.Removed);
        expect(user.state).equals("removed");
        expect(app.allUsers).deep.equals([]);
        // Assume the correct requests made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
                headers: DEFAULT_HEADERS,
            },
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    Authorization: "Bearer very-refreshing",
                    ...DEFAULT_HEADERS,
                },
            },
        ]);
    });

    it("throws if asked to switch to or remove an unknown user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Expect that we logged in
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        const anotherUser = {} as User;
        // Switch
        try {
            await app.switchUser(anotherUser);
            throw new Error("Expected an exception");
        } catch (err) {
            expect(err.message).equals(
                "The user was never logged into this app",
            );
        }
        // Remove
        try {
            await app.removeUser(anotherUser);
            throw new Error("Expected an exception");
        } catch (err) {
            expect(err.message).equals(
                "The user was never logged into this app",
            );
        }
        // Expect the first user to remain logged in and known to the app
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        expect(user.state).equals("active");
        // Assume the correct requests made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("expose a callable functions factory", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            { msg: "hi there!" },
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        await app.logIn(credentials, false);
        // Call the function
        const response = await app.functions.hello();
        expect(response).to.deep.equal({ msg: "hi there!" });
        expect(transport.requests).to.deep.equal([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
                headers: DEFAULT_HEADERS,
            },
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/functions/call",
                body: { name: "hello", arguments: [] },
                headers: {
                    Authorization: "Bearer deadbeef",
                    ...DEFAULT_HEADERS,
                },
            },
        ]);
    });

    it("expose a collection of service factories", () => {
        const transport = new MockNetworkTransport([]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        expect(app.services).keys(["mongodb", "http"]);
        expect(typeof app.services.mongodb).equals("function");
    });

    it("hydrates users from storage", () => {
        const storage = new MemoryStorage();
        const transport = new MockNetworkTransport([]);

        // Fill data into the storage that can be hydrated
        const appStorage = storage.prefix("app(default-app-id)");
        appStorage.set("userIds", JSON.stringify(["alices-id", "bobs-id"]));

        const alicesStorage = appStorage.prefix("user(alices-id)");
        alicesStorage.set("accessToken", "alices-access-token");
        alicesStorage.set("refreshToken", "alices-refresh-token");

        const bobsStorage = appStorage.prefix("user(bobs-id)");
        bobsStorage.set("accessToken", "bobs-access-token");
        bobsStorage.set("refreshToken", "bobs-refresh-token");

        const app = new App({
            id: "default-app-id",
            storage,
            transport,
            baseUrl: "http://localhost:1337",
        });

        expect(app.allUsers.length).equals(2);

        const alice = app.allUsers[0];
        expect(alice.id).equals("alices-id");
        expect(alice.accessToken).equals("alices-access-token");
        expect(alice.refreshToken).equals("alices-refresh-token");

        const bob = app.allUsers[1];
        expect(bob.id).equals("bobs-id");
        expect(bob.accessToken).equals("bobs-access-token");
        expect(bob.refreshToken).equals("bobs-refresh-token");
    });

    it("saves users to storage when logging in", async () => {
        const storage = new MemoryStorage();
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
        ]);
        const app = new App({
            id: "default-app-id",
            storage,
            transport,
            baseUrl: "http://localhost:1337",
        });

        const credentials = App.Credentials.anonymous();
        const user = await app.logIn(credentials, false);

        expect(user.id).equals("totally-valid-user-id");
        const appStorage = storage.prefix("app(default-app-id)");
        expect(appStorage.get("userIds")).equals(
            JSON.stringify(["totally-valid-user-id"]),
        );
        const userStorage = appStorage.prefix("user(totally-valid-user-id)");
        expect(userStorage.get("accessToken")).equals("deadbeef");
        expect(userStorage.get("refreshToken")).equals("very-refreshing");
    });

    it("merges logins and logouts of multiple apps with the same storage", async () => {
        const storage = new MemoryStorage();

        const app1 = new App({
            id: "default-app-id",
            storage,
            transport: new MockNetworkTransport([
                {
                    user_id: "alices-id",
                    access_token: "alices-access-token",
                    refresh_token: "alices-refresh-token",
                },
                {
                    user_id: "bobs-id",
                    access_token: "bobs-access-token",
                    refresh_token: "bobs-refresh-token",
                },
                {
                    data: {
                        first_name: "Bobby",
                    },
                    identities: [],
                    type: "normal",
                },
                {},
            ]),
            baseUrl: "http://localhost:1337",
        });

        const app2 = new App({
            id: "default-app-id",
            storage,
            transport: new MockNetworkTransport([
                {
                    user_id: "charlies-id",
                    access_token: "charlies-access-token",
                    refresh_token: "charlies-refresh-token",
                },
            ]),
            baseUrl: "http://localhost:1337",
        });

        const credentials = App.Credentials.anonymous();
        const alice = await app1.logIn(credentials, false);
        const charlie = await app2.logIn(credentials, false);
        const bob = await app1.logIn(credentials, true);

        const appStorage = storage.prefix("app(default-app-id)");
        expect(appStorage.get("userIds")).equals(
            // We expect Charlies id to be last, because the last login was in app1
            // We expect bobs-id to be first because he was the last login
            JSON.stringify(["bobs-id", "alices-id", "charlies-id"]),
        );

        // Logging out bob, we expect:
        // - The tokens to be removed from storage
        // - The profile to remain in storage
        // - The id to remain in the list of ids
        const bobsStorage = appStorage.prefix("user(bobs-id)");
        expect(bobsStorage.get("accessToken")).equals("bobs-access-token");
        expect(bobsStorage.get("refreshToken")).equals("bobs-refresh-token");
        const bobsProfileBefore = JSON.parse(bobsStorage.get("profile") || "");
        expect(bobsProfileBefore).deep.equals({
            type: "normal",
            identities: [],
            firstName: "Bobby",
        });

        await bob.logOut();
        expect(bobsStorage.get("accessToken")).equals(null);
        expect(bobsStorage.get("refreshToken")).equals(null);
        const bobsProfileAfter = JSON.parse(bobsStorage.get("profile") || "");
        expect(bobsProfileAfter).deep.equals(bobsProfileBefore);
        expect(appStorage.get("userIds")).equals(
            JSON.stringify(["bobs-id", "alices-id", "charlies-id"]),
        );

        // Removing Bob from the app, removes his id from apps storage
        await app1.removeUser(bob);
        expect(bobsStorage.get("profile")).equals(null);
        expect(appStorage.get("userIds")).equals(
            JSON.stringify(["alices-id", "charlies-id"]),
        );
        console.log((storage as any).storage);
    });
});
