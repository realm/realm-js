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

import { createApp } from "./utils";

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
        expect(Array.isArray(user.profile.identities)).equals(true);
        expect(user.profile.identities.length).equals(1);
        expect(user.profile.name).equals(undefined);
    });
});
