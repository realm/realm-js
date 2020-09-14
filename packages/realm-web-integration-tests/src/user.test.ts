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

import { Credentials, UserState } from "realm-web";

import { createApp, INVALID_TOKEN } from "./utils";

describe("User", () => {
    it("can login a user", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        expect(typeof user.id).equals("string");
        expect(user.state).equals(UserState.Active);
        expect(user.state).equals("active");
        // Expect something of the user profile
        expect(user.profile.type).equals("normal");
        // TODO: expect(Array.isArray(user.profile.identities)).equals(true);
        // TODO: expect(user.profile.identities.length).equals(1);
        expect(user.profile.name).equals(undefined);
        expect(user.customData).deep.equals({});
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

    it("can link credentials", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);

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
