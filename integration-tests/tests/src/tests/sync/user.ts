////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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
import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function assertIsUser(user: Realm.User) {
  expect(user).to.not.be.undefined;
  expect(user).to.not.be.null;
  expect(user).to.be.a("object");
  expect(typeof user.accessToken).equals("string");
  expect(typeof user.refreshToken).equals("string");
  expect(typeof user.id).equals("string");
  expect(typeof user.identities).equals("object");
  expect(typeof user.customData).equals("object");
  expect(user).instanceOf(Realm.User);
}

function assertIsSameUser(value: Realm.User, user: Realm.User | null) {
  assertIsUser(value);
  expect(value.accessToken).equals(user?.accessToken);
  expect(value.id).equals(user?.id);
}

function assertIsError(error: any, message: string) {
  expect(error).instanceOf(Error, "The API should return an Error");
  if (message) {
    expect(error.message).equals(message);
  }
}

function assertIsAuthError(error: any, code: number, title: string) {
  expect(error).instanceOf(Realm.App.Sync.AuthError, "The API should return an AuthError");
  if (code) {
    expect(error.code).equals(code);
  }
  if (title) {
    expect(error.title).equals(title);
  }
}

function randomVerifiableEmail() {
  // according to the custom register function, emails will register if they contain "realm_tests_do_autoverify"
  return `realm_tests_do_autoverify_${uuid()}_@test.com`;
}

function randomNonVerifiableEmail() {
  // according to the custom register function, emails will not register if they don't contain "realm_tests_do_autoverify"
  return `should-not-register-${uuid()}_@test.com`;
}

function randomPendingVerificationEmail() {
  // create an email address that should neither auto-verify or fail verification
  return `realm_tests_do_pendverify-${uuid()}_@test.com`;
}

async function registerAndLogInEmailUser(app: Realm.App) {
  const validEmail = randomVerifiableEmail();
  const validPassword = "test1234567890";
  await app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
  const user = await app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));
  assertIsUser(user);
  assertIsSameUser(user, app.currentUser);
  return user;
}

async function logOutExistingUsers(app: Realm.App) {
  const users = app.allUsers;
  Object.keys(app.allUsers).forEach(async (id) => {
    await users[id].logOut();
  });
}

describe("User", () => {
  importAppBefore("with-db");
  authenticateUserBefore();
  openRealmBefore({
    schema: [],
  });

  it("login and logout works", async function (this: Mocha.Context & AppContext & RealmContext) {
    await logOutExistingUsers(this.app);
    const credentials = Realm.Credentials.anonymous();

    const user = await this.app.logIn(credentials);
    assertIsUser(user);
    assertIsSameUser(user, this.app.currentUser);
    await user.logOut();
    // Is now logged out.
    expect(this.app.currentUser).to.be.null;
  });
  it("login without username throws", async function (this: Mocha.Context & AppContext & RealmContext) {
    // @ts-expect-error test logging in without providing username.
    expect(() => Realm.Credentials.emailPassword(undefined, "password")).throws(
      Error,
      "email must be of type 'string', got (undefined)",
    );
  });
  it("login without password throws", async function (this: Mocha.Context & AppContext & RealmContext) {
    const username = uuid();
    // @ts-expect-error test logging in without providing password.
    expect(() => Realm.Credentials.emailPassword(username, undefined)).throws(
      Error,
      "password must be of type 'string', got (undefined)",
    );
  });
  it("login with non existing user throws", async function (this: Mocha.Context & AppContext & RealmContext) {
    const credentials = Realm.Credentials.emailPassword("foo", "pass");
    return this.app
      .logIn(credentials)
      .then((user) => {
        throw new Error("Login should have failed");
      })
      .catch((err) => {
        expect(err.message).equals("invalid username/password");
      });
  });
  it("can fetch customData", async function (this: Mocha.Context & AppContext & RealmContext) {
    await logOutExistingUsers(this.app);
    const credentials = Realm.Credentials.anonymous();
    const user = await this.app.logIn(credentials);
    const customData = user.customData;
    // TODO: Enable custom user data in the app to test this e2e
    expect(customData).to.be.a("object");
  });
  it("can fetch userProfile", async function (this: Mocha.Context & AppContext & RealmContext) {
    await logOutExistingUsers(this.app);
    const credentials = Realm.Credentials.anonymous();
    const user = await this.app.logIn(credentials);
    const profile = user.profile;
    expect(profile).to.be.a("object");

    await user.logOut();
  });
  //   it.skipIf(
  //     !environment.node,
  //     "can fetch JWTUserProfile",
  //     async function (this: Mocha.Context & AppContext & RealmContext) {
  //       const nJwt = require("njwt");
  //       const signingKey = "My_very_confidential_secretttttt";
  //       const claims = {
  //         name: "John Doe",
  //         iss: "http://myapp.com/",
  //         sub: "users/user1234",
  //         scope: "self, admins",
  //         aud: "my-audience",

  //         // metadata
  //         id: "one",
  //         license: "one-two-three",
  //       };

  //       const jwt = nJwt.create(claims, signingKey, "HS256").compact();

  //       await logOutExistingUsers(this.app);
  //       const credentials = Realm.Credentials.jwt(jwt);
  //       const user = await this.app.logIn(credentials);
  //       await user.refreshCustomData();
  //       const profile = user.profile;

  //       expect(profile).to.be("object");
  //       expect(profile.id).equals(claims.id);
  //       expect(profile.license).equals(claims.license);

  //       await user.logOut();
  //     },
  //   );
  it("email password authprovider is correct instance", async function (this: Mocha.Context &
    AppContext &
    RealmContext) {
    const provider = this.app.emailPasswordAuth;
    expect(provider).instanceof(Realm.Auth.EmailPasswordAuth);
  });
  it("autoverify email password works", async function (this: Mocha.Context & AppContext & RealmContext) {
    const validEmail = randomVerifiableEmail();
    const invalidEmail = randomNonVerifiableEmail();
    const invalidPassword = "pass"; // too short
    const validPassword = "password123456";

    {
      // invalid email, invalid password
      const credentials = Realm.Credentials.emailPassword(invalidEmail, invalidPassword);
      expect(() => this.app.logIn(credentials)).throws("invalid username/password"); // this user does not exist yet
      expect(() => this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: invalidPassword })).throws(
        Error,
        "password must be between 6 and 128 characters",
      );
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user did not register
    }
    {
      // invalid email, valid password
      const credentials = Realm.Credentials.emailPassword(invalidEmail, validPassword);
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user does not exist yet

      expect(() => this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: validPassword })).throws(
        Error,
        "failed to confirm user ${invalidEmail}",
      );
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user did not register
    }
    {
      // valid email, invalid password
      const credentials = Realm.Credentials.emailPassword(validEmail, invalidPassword);
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user does not exist yet
      expect(() => this.app.emailPasswordAuth.registerUser({ email: validEmail, password: invalidPassword })).throws(
        Error,
        "password must be between 6 and 128 characters",
      );
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user did not register
    }
    {
      // valid email, valid password
      const credentials = Realm.Credentials.emailPassword(validEmail, validPassword);
      expect(() => this.app.logIn(credentials)).throws(Error, "invalid username/password"); // this user does not exist yet
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(credentials);
      assertIsUser(user);
      assertIsSameUser(user, this.app.currentUser);
      await user.logOut();
    }
  });
});
