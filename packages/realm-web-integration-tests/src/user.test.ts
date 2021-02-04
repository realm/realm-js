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
import { Base64 } from "js-base64";

import { Credentials, User, UserState } from "realm-web";

import { createApp, INVALID_TOKEN, describeIf } from "./utils";

// This global is injected by WebPack
declare const TEST_CREDENTIALS: string[];

function idFromAccessToken(user: User) {
    if (typeof (user as any).decodeAccessToken === "function") {
        const { subject } = (user as any).decodeAccessToken();
        return subject;
    } else {
        throw new Error("Failed to call private 'decodeAccessToken' method");
    }
}

function deviceIdFromToken(token: string) {
    const payload = token.split(".")[1];
    const parsedPayload = JSON.parse(Base64.decode(payload));
    return parsedPayload["baas_device_id"];
}

describe("User", () => {
    it("can login a user", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        expect(typeof user.id).equals("string");
        expect(user.state).equals(UserState.Active);
        expect(user.state).equals("active");
        expect(user.isLoggedIn).equals(true);
    });

    it("has a profile", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        // Expect something of the user profile
        expect(typeof user.profile).equals("object");
        expect(user.profile.name).equals(undefined);
        expect(Array.isArray(user.identities)).equals(true);
        expect(user.identities.length).equals(1);
    });

    it("has custom data", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        // TODO: Add some data first ...
        expect(user.customData).deep.equals({});
    });

    it("can be stringified", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        const output = JSON.stringify(user);
        expect(typeof output).equals("string");
    });

    it("refresh invalid access tokens", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Invalidate the token
        (user as any)._accessToken = INVALID_TOKEN;
        expect(user.accessToken).equals(INVALID_TOKEN);
        // Try using the broken access token
        const response = await user.functions.translate("hello", "en_fr");
        expect(response).to.equal("bonjour");
        // Expect the user to have a diffent token now
        expect(user.accessToken).not.equals(INVALID_TOKEN);
    });

    it.skip("retrieves and resends device ids when authenticating", async () => {
        const app = createApp();
        // Clear any device id already in the storage.
        app.storage.remove("deviceId");
        // Generate a nonce that allowing the test to run more than once.
        const now = new Date();
        const nonce = now.getTime();

        // Register a user
        {
            const email = `dinesh-${nonce}@testing.mongodb.com`;
            const password = "v3ry-s3cret";
            await app.emailPasswordAuth.registerUser(email, password);
            const credentials = Credentials.emailPassword(email, password);
            // Log in
            const user1 = await app.logIn(credentials);
            const deviceId1 = deviceIdFromToken(user1.accessToken || "");
            // Log out
            await user1.logOut();
            // Log in again
            const user2 = await app.logIn(credentials);
            const deviceId2 = deviceIdFromToken(user2.accessToken || "");
            // Expect the two device ids to equal to that in storage
            const storedDeviceId = app.storage.get("deviceId");
            expect(storedDeviceId).not.equals(null);
            expect(storedDeviceId).not.equals("000000000000000000000000");
            expect(deviceId1).equals(storedDeviceId);
            expect(deviceId2).equals(storedDeviceId);
        }

        // Register another user
        {
            const email = `gilfoyle-${nonce}@testing.mongodb.com`;
            const password = "v3ry-s3cret";
            await app.emailPasswordAuth.registerUser(email, password);
            const credentials = Credentials.emailPassword(email, password);
            // Read out the device id generated by the previous user
            const storedDeviceId = app.storage.get("deviceId");
            // Log in
            const user = await app.logIn(credentials);
            const deviceId = deviceIdFromToken(user.accessToken || "");
            // Expect the device id to equal to that in storage
            expect(storedDeviceId).not.equals(null);
            expect(storedDeviceId).not.equals("000000000000000000000000");
            expect(deviceId).equals(storedDeviceId);
        }
    });

    describe("linking with Email/Password credentials", () => {
        it("reuse id in access token and adds identity", async () => {
            const app = createApp();
            const credentials = Credentials.anonymous();
            const user = await app.logIn(credentials);

            {
                // Switch active user by authenticate another user
                // This is to test that the right access token is used when requesting
                const credentials = Credentials.anonymous();
                await app.logIn(credentials);
            }

            const now = new Date();
            const nonce = now.getTime();
            const email = `dinesh-${nonce}@testing.mongodb.com`;
            const password = "v3ry-s3cret";
            await app.emailPasswordAuth.registerUser(email, password);
            const emailCredentials = Credentials.emailPassword(email, password);
            await user.linkCredentials(emailCredentials);
            expect(user.identities.length).equals(2);
            const identityTypes = user.identities.map(i => i.providerType);
            expect(identityTypes).deep.equals(["anon-user", "local-userpass"]);
        });
    });

    describeIf(
        TEST_CREDENTIALS.includes("google") && typeof location !== "undefined",
        "linking with Google credentials",
        () => {
            it("reuse id in access token and adds identity", async function () {
                // Allowing time to manually complete the OAuth flow
                this.timeout(60 * 1000); // 1 min

                const app = createApp();
                const credentials = Credentials.anonymous();
                const user = await app.logIn(credentials);
                const userIdBefore = idFromAccessToken(user);
                expect(user.id).equals(userIdBefore);

                {
                    // Switch active user by authenticate another user
                    // This is to test that the right access token is used when requesting
                    const credentials = Credentials.anonymous();
                    await app.logIn(credentials);
                }

                // Link user
                const googleCredentials = Credentials.google(
                    "http://localhost:8080/google-callback",
                );
                await user.linkCredentials(googleCredentials);

                // Expect the ids from the user object and tokens to match
                const userIdAfter = idFromAccessToken(user);
                expect(user.id).equals(userIdAfter);
                expect(userIdAfter).equals(userIdBefore);

                // Expect the new authentication provider in the list of identities
                expect(user.identities.length).equals(2);
                const identityTypes = user.identities.map(i => i.providerType);
                expect(identityTypes).deep.equals([
                    "anon-user",
                    "oauth2-google",
                ]);
            });
        },
    );
});
