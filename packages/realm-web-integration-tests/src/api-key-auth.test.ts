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

// This global is injected by WebPack
declare const TEST_CREDENTIALS: string[];

// The function credential is used to authenticate the user
describe("ApiKeyAuth", function () {
    this.slow(1000);
    this.timeout(10000);

    it("lists, creates, gets, enables, authenticates, disables and deletes api keys", async () => {
        const app = createApp();
        // Login a user
        // const credentials = Credentials.anonymous();
        const credentials = Credentials.function({
            username: "my-very-own-username",
            secret: "v3ry-s3cret",
        });
        const user = await app.logIn(credentials);
        // List all existing keys
        const keysBefore = await user.apiKeys.fetchAll();
        // Delete any existing keys
        for (const key of keysBefore) {
            await user.apiKeys.delete(key._id);
        }
        // Create an api key
        const keyName = `api-key-${keysBefore.length}`;
        const { _id, key, name, disabled } = await user.apiKeys.create(keyName);
        expect(typeof _id).equals("string");
        expect(typeof key).equals("string");
        expect(name).equals(keyName);
        expect(disabled).equals(false);
        // List all existing keys
        const keysAfter = await user.apiKeys.fetchAll();
        // Expect a new key
        expect(keysAfter.length).equals(1);
        // Disable the key and fetch the key
        await user.apiKeys.disable(_id);
        const disabledKey = await user.apiKeys.fetch(_id);
        expect(disabledKey).deep.equals({ _id, name, disabled: true });
        // Re-enable the key
        await user.apiKeys.enable(_id);
        // Get the specific key
        const retrievedKey = await user.apiKeys.fetch(_id);
        expect(retrievedKey).deep.equals({ _id, name, disabled: false });
        // Try authenticating
        const apiKeyCredentials = Credentials.apiKey(key);
        const apiKeyUser = await app.logIn(apiKeyCredentials);
        expect(apiKeyUser.id).equals(user.id);
        // Delete the key again
        // But reauthenticate first, since deleting the key in use will fail with a "403 Forbidden".
        await app.logIn(credentials);
        await user.apiKeys.delete(_id);
        // Verify its no longer there
        const keysAfterDeletion = await user.apiKeys.fetchAll();
        expect(keysAfterDeletion).deep.equals([]);
    });
});
