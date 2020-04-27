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

import { Credentials, User } from "realm-web";

import { createApp } from "./utils";

describe("Realm.Credentials", () => {
    describe("AnonymousCredentials", () => {
        it("can authenticate", async () => {
            const app = createApp();
            const credentials = Credentials.anonymous();
            const user = await app.logIn(credentials);
            expect(user).to.be.instanceOf(User);
        });
    });

    describe("UsernamePasswordCredentials", () => {
        // TODO: Re-enable when we have a way to register users
        it.skip("can authenticate", async () => {
            const app = createApp();
            const credentials = Credentials.emailPassword(
                "gilfoil@testing.mongodb.com",
                "v3ry-s3cret",
            );
            expect(credentials.payload.username).equals(
                "gilfoil@testing.mongodb.com",
            );
            expect(credentials.payload.password).equals("v3ry-s3cret");
            const user = await app.logIn(credentials);
            expect(user).to.be.instanceOf(User);
        });
    });
});
