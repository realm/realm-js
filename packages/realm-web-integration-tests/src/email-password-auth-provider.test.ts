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

import { Credentials } from "realm-web";

import { createApp } from "./utils";

const runNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

describe("EmailPasswordAuthProvider", () => {
    // TODO: Fix this test
    it.skip("registers a user", async () => {
        const app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        const email = `test-user-${runNumber}@testing.mongodb.com`;
        const password = "my-super-secret-password";
        // List all existing keys
        await app.auth.emailPassword.registerUser(email, password);
        // Authenticate
        const newCredentials = Credentials.usernamePassword(email, password);
        await app.logIn(newCredentials);
    });
});
