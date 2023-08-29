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
import { buildAppConfig } from "../../utils/build-app-config";

// FIXME: when importing customFunctionAuth we are almost consistently getting "Syntax error: unexpected EOF (400 Bad Request)".
// https://jira.mongodb.org/browse/RJS-2545
// describe.skipIf(environment.missingServer, "custom-function credentials", () => {
describe.skip("custom-function credentials", () => {
  importAppBefore(
    buildAppConfig("with-custom-function").mongodbService().customFunctionAuth(`
        exports = async function (loginPayload) {
          // Get a handle for the app.users collection
          const users = context.services.get("mongodb").db("app").collection("users");

          // Parse out custom data from the FunctionCredential

          const { username, secret } = loginPayload;

          if (secret !== "v3ry-s3cret") {
            throw new Error("Ah ah ah, you didn't say the magic word");
          }
          // Query for an existing user document with the specified username

          const user = await users.findOne({ username });

          if (user) {
            // If the user document exists, return its unique ID
            return user._id.toString();
          } else {
            // If the user document does not exist, create it and then return its unique ID
            const result = await users.insertOne({ username });
            return result.insertedId.toString();
          }
        };
      `),
  );

  it("authenticates", async function (this: AppContext) {
    this.timeout(60 * 1000); // 1 min
    // Log in
    const credentials = Credentials.function({
      username: "my-very-own-username",
      secret: "v3ry-s3cret",
    });
    const user = await this.app.logIn(credentials);
    expect(user).to.be.instanceOf(User);
  });
});
