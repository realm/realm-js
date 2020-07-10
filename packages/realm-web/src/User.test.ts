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

import { MockApp } from "./test/MockApp";
import { UserType, User } from "./User";

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
        });
        // Assume that the user has an access token
        expect(user.accessToken).equals("deadbeef");
    });

    it("deletes session when logging out", async () => {
        const app = new MockApp("my-mocked-app", [{}]);
        const user = new User({
            app,
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
        });
        // Log out the user
        await user.logOut();
        // Expect that a request was made
        expect(app.mockTransport.requests).deep.equals([
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    // It's important that the refresh and not the access token is sent here ..
                    Authorization: "Bearer very-refreshing",
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            },
        ]);
    });

    it("can refresh the user profile", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
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
        });
        // Expect an exception if the profile was never fetched
        expect(() => {
            user.profile;
        }).throws("A profile was never fetched for this user");
        // Refresh the profile and expect a firstName
        await user.refreshProfile();
        expect(user.profile).deep.equals({
            identities: [],
            type: UserType.Normal,
            firstName: "John",
        });
    });

    it("exposes custom data", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app"),
            id: "some-user-id",
            // { "exp": 1598640312, "iat": 1593456312, "user_data": { "name": "Johnny" } }
            accessToken:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1OTg2NDAzMTIsImlhdCI6MTU5MzQ1NjMxMiwidXNlcl9kYXRhIjp7Im5hbWUiOiJKb2hubnkifX0.l-ElbkTTcmMmM4EqO6gm--cIH6dmgtb5vdYfArPtBAE",
            refreshToken: "very-refreshing",
        });
        // Try calling a function on the user
        expect(user.customData).deep.equals({
            name: "Johnny",
        });
    });

    it("expose a functions factory", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [{ pong: "ball" }]),
            id: "some-user-id",
            accessToken: "deadbeef",
            refreshToken: "very-refreshing",
        });
        // Try calling a function on the user
        const pong = await user.functions.ping();
        expect(pong).deep.equals({
            pong: "ball",
        });
    });

    it("sets tokens and profile on storage when constructed, removes them on log out", async () => {
        const user = new User({
            app: new MockApp("my-mocked-app", [
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
        });
        // Fetch the profile
        await user.refreshProfile();

        const userStorage = user.app.storage.prefix("user(some-user-id)");
        expect(userStorage.get("accessToken")).equals("deadbeef");
        expect(userStorage.get("refreshToken")).equals("very-refreshing");
        const profileBefore = JSON.parse(userStorage.get("profile") || "");

        expect(profileBefore).deep.equals({
            firstName: "John",
            identities: [],
            type: "normal",
        });

        await user.logOut();
        expect(userStorage.get("accessToken")).equals(null);
        expect(userStorage.get("refreshToken")).equals(null);
        // Logging out shouldn't delete information about the profile
        expect(user.profile).deep.equals(profileBefore);
        const profileAfter = JSON.parse(userStorage.get("profile") || "");
        expect(profileAfter).deep.equals(profileBefore);
    });
});
