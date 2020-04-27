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

describe("ApiKeyAuthProvider", () => {
    // TODO: Fix this test
    it.skip("lists, creates, gets, enables, authenticates, disables and deletes api keys", async () => {
        const app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        // List all existing keys
        const keys = await app.auth.apiKey.list();
        // console.log(keys);
        // Create an api key
        const key = await app.auth.apiKey.create("my-key");
        // console.log(key);
    });
});
