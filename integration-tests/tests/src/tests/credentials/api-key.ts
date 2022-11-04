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
import { Credentials, User } from "realm";
import { importAppBefore } from "../../hooks";


//These tests are adopted from api-key-auth.test.ts in the realm-web-integration-tests directory.
describe.skipIf(environment.missingServer, "api-key credentials", () => {
  importAppBefore("with-auth-providers");

  it("lists, creates, gets, enables, authenticates, disables and deletes api keys", async function (this: AppContext) {
    this.slow(1000);
    this.timeout(10000);
    // Login a user
    // const credentials = Credentials.anonymous();
    const credentialData = {
      email: "my-very-own-username",
      password: "v3ry-s3cret",
    };
    const credentials = Credentials.emailPassword(credentialData);
    await this.app.emailPasswordAuth.registerUser(credentialData);
    const user = await this.app.logIn(credentials);
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
    const apiKeyCredentials = Credentials.apiKey(key as string);
    const apiKeyUser = await this.app.logIn(apiKeyCredentials);
    expect(apiKeyUser.id).equals(user.id);
    // Delete the key again
    // But reauthenticate first, since deleting the key in use will fail with a "403 Forbidden".
    await this.app.logIn(credentials);
    await user.apiKeys.delete(_id);
    // Verify its no longer there
    const keysAfterDeletion = await user.apiKeys.fetchAll();
    expect(keysAfterDeletion).deep.equals([]);
  });
});
