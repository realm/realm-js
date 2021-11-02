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
import jwtEncode from "jwt-encode";

import { createApp, describeIf } from "./utils";

// This global is injected by WebPack
declare const TEST_CREDENTIALS: string[];

describe("Credentials", () => {
  describeIf(TEST_CREDENTIALS.includes("anonymous"), "anonymous", () => {
    it("can authenticate", async () => {
      const app = createApp();
      const credentials = Credentials.anonymous();
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
    });
  });

  describeIf(TEST_CREDENTIALS.includes("email-password"), "emailPassword", () => {
    it("can register and authenticate", async () => {
      const app = createApp();

      const now = new Date();
      const nonce = now.getTime();
      const email = `gilfoil-${nonce}@testing.mongodb.com`;
      const password = "v3ry-s3cret";
      // Register the user
      await app.emailPasswordAuth.registerUser({ email, password });
      // Log in
      const credentials = Credentials.emailPassword(email, password);
      expect(credentials.payload.username).equals(email);
      expect(credentials.payload.password).equals(password);
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
    });
  });

  describeIf(TEST_CREDENTIALS.includes("function"), "function", () => {
    it("can authenticate", async function () {
      this.timeout(60 * 1000); // 1 min
      const app = createApp();
      // Log in
      const credentials = Credentials.function({
        username: "my-very-own-username",
        secret: "v3ry-s3cret",
      });
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
    });
  });

  describeIf(TEST_CREDENTIALS.includes("jwt"), "jwt", () => {
    it("can authenticate", async function () {
      this.timeout(60 * 1000); // 1 min
      const app = createApp();
      // Log in
      const token = jwtEncode(
        {
          aud: app.id,
          exp: 4070908800, // 01/01/2099
          sub: "my-awesome-internal-id",
          mySecretField: "some-secret-stuff",
        },
        // Needs to match the value in the apps secrets.json
        "2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu",
      );
      const credentials = Credentials.jwt(token);
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
      // Expect that we can read "some-secret-stuff" out of the profile
      // NOTE: The mapping from mySecretField → secret is declared in the Realm App configuration
      expect(Object.keys(user.profile)).deep.equals(["secret"]);
      expect(user.profile.secret).equals("some-secret-stuff");
    });
  });

  describeIf(TEST_CREDENTIALS.includes("google"), "google", () => {
    it("can authenticate", async function () {
      this.timeout(60 * 1000); // 1 min
      const app = createApp();
      // Log in
      const credentials = Credentials.google("http://localhost:8080/google-callback");
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
    });
  });

  describeIf(TEST_CREDENTIALS.includes("facebook"), "facebook", () => {
    it("can authenticate", async function () {
      this.timeout(60 * 1000); // 1 min
      const app = createApp();
      // Log in
      const credentials = Credentials.facebook("http://localhost:8080/facebook-callback");
      const user = await app.logIn(credentials);
      expect(user).to.be.instanceOf(User);
    });
  });
});
