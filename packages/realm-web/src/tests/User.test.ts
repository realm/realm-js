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
import { inspect } from "util";

import { User, Credentials } from "..";
import { MongoDBRealmError } from "../MongoDBRealmError";

import {
    MockApp,
    LOCATION_RESPONSE,
    LOCATION_REQUEST,
    ACCEPT_JSON_HEADERS,
    SENDING_JSON_HEADERS,
    DEFAULT_AUTH_OPTIONS,
    INVALID_SESSION_ERROR,
} from "./utils";

// Since responses from the server uses underscores in field names:
/* eslint @typescript-eslint/camelcase: "warn" */

describe("User", () => {
    it("constructs", async () => {
        const app = new MockApp("my-mocked-app");
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Assume that the user has an access token
        expect(user.accessToken).equals("deadbeef");
    });

    it("can be inspected and stringified", () => {
        const app = new MockApp("my-mocked-app");
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef.eyJleHAiOjAsImlhdCI6MH0=.e30=",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        {
            const output = inspect(user);
            expect(typeof output).equals("string");
            expect(output.length).not.equals(0);
        }
        {
            const output = JSON.stringify(user);
            expect(typeof output).equals("string");
            expect(output.length).not.equals(0);
        }
    });

    it("deletes session when logging out", async () => {
        const app = new MockApp("my-mocked-app", [LOCATION_RESPONSE, {}]);
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Log out the user
        await user.logOut();
        // Expect that a request was made
        expect(app.requests).deep.equals([
            LOCATION_REQUEST,
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    ...ACCEPT_JSON_HEADERS,
                    // It's important that the refresh and not the access token is sent here ..
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
        // Expect the user to forget tokens anyway
        expect(user.accessToken).equals(null);
        expect(user.refreshToken).equals(null);
    });

    it("will forget tokens if session delete fails", async () => {
        const app = new MockApp("my-mocked-app", [
            LOCATION_RESPONSE,
            INVALID_SESSION_ERROR,
        ]);
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Log out the user
        try {
            await user.logOut();
            expect.fail("Log out should fail");
        } catch (err) {
            expect(err).instanceOf(MongoDBRealmError);
        }
        // Expect the user to forget tokens anyway
        expect(user.accessToken).equals(null);
        expect(user.refreshToken).equals(null);
    });

    it("will forget tokens if access token refresh fails", async () => {
        const app = new MockApp("my-mocked-app", [
            LOCATION_RESPONSE,
            INVALID_SESSION_ERROR,
        ]);
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Refresh the access token
        try {
            await user.refreshAccessToken();
            expect.fail("Log out should fail");
        } catch (err) {
            expect(err).instanceOf(MongoDBRealmError);
        }
        // Expect the user to forget tokens to prevent a lock
        expect(user.accessToken).equals(null);
        expect(user.refreshToken).equals(null);
    });

    it("can refresh the user profile", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
                LOCATION_RESPONSE,
                {
                    data: {
                        first_name: "John",
                    },
                    identities: [],
                    type: "normal",
                },
            ]),
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Expect an exception if the profile was never fetched
        expect(() => {
            user.profile;
        }).throws("A profile was never fetched for this user");
        // Refresh the profile and expect a firstName
        await user.refreshProfile();
        expect(user.profile).deep.equals({ firstName: "John" });
    });

    it("can refresh access token", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
                LOCATION_RESPONSE,
                {
                    user_id: "some-user-id",
                    access_token: "second-access-token",
                },
            ]),
            id: "some-user-id",
            accessToken: "first-access-token",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Refresh the profile and expect a firstName
        await user.refreshAccessToken();
        expect(user.accessToken).equals("second-access-token");
    });

    it("exposes custom data", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app"),
            id: "some-user-id",
            // { "exp": 1598640312, "iat": 1593456312, "user_data": { "name": "Johnny" } }
            accessToken:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1OTg2NDAzMTIsImlhdCI6MTU5MzQ1NjMxMiwidXNlcl9kYXRhIjp7Im5hbWUiOiJKb2hubnkifX0.l-ElbkTTcmMmM4EqO6gm--cIH6dmgtb5vdYfArPtBAE",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Try calling a function on the user
        expect(user.customData).deep.equals({
            name: "Johnny",
        });
    });

    it("expose a functions factory", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
                LOCATION_RESPONSE,
                { pong: "ball" },
            ]),
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Try calling a function on the user
        const pong = await user.functions.ping();
        expect(pong).deep.equals({
            pong: "ball",
        });
    });

    it("expose an api key auth provider client", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
                LOCATION_RESPONSE,
                [
                    {
                        _id: "key-1-id",
                        key: "something-secret",
                        name: "key-1-name",
                        disabled: false,
                    },
                ],
            ]),
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Try calling a function on the user
        const keys = await user.apiKeys.fetchAll();
        expect(keys).deep.equals([
            {
                _id: "key-1-id",
                key: "something-secret",
                name: "key-1-name",
                disabled: false,
            },
        ]);
    });

    it("sets tokens and profile on storage when constructed, removes them on log out", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
                LOCATION_RESPONSE,
                {
                    data: {
                        first_name: "John",
                    },
                    identities: [],
                    type: "normal",
                },
                {},
            ]),
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });
        // Fetch the profile
        await user.refreshProfile();

        const userStorage = user.app.storage.prefix("user(some-user-id)");
        expect(userStorage.get("accessToken")).equals("deadbeef");
        expect(userStorage.get("refreshToken")).equals("very-refreshing");
        const profileBefore = JSON.parse(userStorage.get("profile") || "");

        expect(profileBefore).deep.equals({
            data: {
                firstName: "John",
            },
            identities: [],
            type: "normal",
        });

        await user.logOut();
        expect(userStorage.get("accessToken")).equals(null);
        expect(userStorage.get("refreshToken")).equals(null);
        // Logging out shouldn't delete information about the profile
        expect(user.profile).deep.equals(profileBefore.data);
        const profileAfter = JSON.parse(userStorage.get("profile") || "");
        expect(profileAfter.data).deep.equals(profileBefore.data);
    });

    it("can link credentials", async () => {
        const app = new MockApp("my-mocked-app", [
            LOCATION_RESPONSE,
            {
                user_id: "some-user-id",
                access_token: "new-access-token",
            },
            {
                data: {
                    first_name: "John",
                },
                identities: [],
                type: "normal",
            },
        ]);
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
            providerType: "anon-user",
        });

        const credentials = Credentials.emailPassword(
            "gilfoyle@testing.mongodb.com",
            "s3cr3t",
        );
        await user.linkCredentials(credentials);

        expect(app.requests).deep.equals([
            LOCATION_REQUEST,
            {
                method: "POST",
                url: `http://localhost:1337/api/client/v2.0/app/my-mocked-app/auth/providers/local-userpass/login?link=true`,
                headers: {
                    ...SENDING_JSON_HEADERS,
                    Authorization: "Bearer deadbeef",
                },
                body: {
                    username: "gilfoyle@testing.mongodb.com",
                    password: "s3cr3t",
                    options: DEFAULT_AUTH_OPTIONS,
                },
            },
            {
                method: "GET",
                headers: {
                    ...ACCEPT_JSON_HEADERS,
                    Authorization: "Bearer new-access-token",
                },
                url: "http://localhost:1337/api/client/v2.0/auth/profile",
            },
        ]);
    });
});
