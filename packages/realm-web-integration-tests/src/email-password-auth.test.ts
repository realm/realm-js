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
import { Credentials, MongoDBRealmError } from "realm-web";

import { createApp } from "./utils";

describe("EmailPasswordAuth", () => {
  it("registers a user", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Authenticate
    const newCredentials = Credentials.emailPassword(email, password);
    await app.logIn(newCredentials);
  });

  it("confirm a user", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await app.emailPasswordAuth.confirmUser({ token: "e30=", tokenId: "some-token-id" });
    } catch (err) {
      // We expect this to throw, since we're feading in an invalid token
      expect(err).instanceOf(MongoDBRealmError);
      expect(err.error).equals("invalid token data");
    }
  });

  it("resend email confirmation", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await app.emailPasswordAuth.resendConfirmationEmail({ email });
    } catch (err) {
      // We expect this to throw, since users are automatically confirmed with this app configuration
      expect(err).instanceOf(MongoDBRealmError);
      expect(err.error).equals("already confirmed");
    }
  });

  it("retry custom confirmation", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await app.emailPasswordAuth.retryCustomConfirmation({ email });
    } catch (err) {
      // We expect this to throw, since the app does not currently have custom confirmation enabled
      // TODO:  import an app with custom confirmation enabled
      expect(err).instanceOf(MongoDBRealmError);
      expect(err.error).equals(`cannot run confirmation for ${email}: automatic confirmation is enabled`);
    }
  });

  it("can request a password reset", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a password reset
    try {
      await app.emailPasswordAuth.sendResetPasswordEmail({ email });
    } catch (err) {
      // We expect this to throw, since password resets via email is disabled with this app configuration
      expect(err).instanceOf(MongoDBRealmError);
      expect(err.error).equals("please use reset password via function");
    }
  });

  it("can reset a password via a function", async () => {
    const app = createApp();
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a password reset
    try {
      await app.emailPasswordAuth.callResetPasswordFunction({ email, password: "my-new-password" }, "some-argument");
    } catch (err) {
      // We expect this to throw, since password resets via functions fail with this app configuration
      expect(err).instanceOf(MongoDBRealmError);
      expect(err.error).equals(`failed to reset password for user ${email}`);
    }
  });
});
