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
import { buildConfig } from "@realm/app-importer";

import { importAppBefore } from "../../hooks";

//These tests are adopted from email-password-auth.test.ts in the realm-web-integration-tests directory.
describe.skipIf(environment.missingServer, "email-password credentials", () => {
  importAppBefore(
    buildConfig("with-email-password").authProvider({
      name: "local-userpass",
      type: "local-userpass",
      config: {
        autoConfirm: true,
        resetPasswordUrl: "http://localhost/resetPassword",
      },
      disabled: false,
    }),
  );

  it("authenticates", async function (this: AppContext) {
    const credentialsBlob = { email: "validEmail", password: "validPassword" };
    await this.app.emailPasswordAuth.registerUser(credentialsBlob);
    const user = await this.app.logIn(Credentials.emailPassword(credentialsBlob));
    expect(user).instanceOf(User);
  });

  it("invalid token on confirmation throws", async function (this: AppContext) {
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await this.app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await this.app.emailPasswordAuth.confirmUser({ token: "e30=", tokenId: "some-token-id" });
    } catch (err) {
      // We expect this to throw, since we're feading in an invalid token
      expect((err as Error).message).equals("invalid token data");
    }
  });

  it("resending confirmation on already confirmed account throws", async function (this: AppContext) {
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await this.app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await this.app.emailPasswordAuth.resendConfirmationEmail({ email });
    } catch (err) {
      // We expect this to throw, since users are automatically confirmed with this app configuration
      expect((err as Error).message).equals("already confirmed");
    }
  });

  it("custom confirmation on already confirmed account throws", async function (this: AppContext) {
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await this.app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a new confirmation email
    try {
      await this.app.emailPasswordAuth.retryCustomConfirmation({ email });
    } catch (err) {
      // We expect this to throw, since the app does not currently have custom confirmation enabled
      // TODO:  import an app with custom confirmation enabled
      expect((err as Error).message).equals(`cannot run confirmation for ${email}: automatic confirmation is enabled`);
    }
  });

  it("can request a password reset", async function (this: AppContext) {
    // Prepare email and password
    const now = new Date();
    const nonce = now.getTime();
    const email = `gilfoil-${nonce}@testing.mongodb.com`;
    const password = "my-super-secret-password";
    // Register a user
    await this.app.emailPasswordAuth.registerUser({ email, password });
    // Ask for a password reset
    try {
      await this.app.emailPasswordAuth.sendResetPasswordEmail({ email });
    } catch (err) {
      // We expect this to throw, since password resets via email is disabled with this app configuration
      expect((err as Error).message).equals("error processing request");
    }
  });
  // TODO: add test for CallResetPasswordFunction onse BSONArray is in place
});
