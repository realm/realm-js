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
import { importAppBefore } from "../../hooks";
import {
  randomNonVerifiableEmail,
  randomPendingVerificationEmail,
  randomVerifiableEmail,
} from "../../utils/generators";
import { KJUR } from "jsrsasign";

function expectIsUSer(user: Realm.User) {
  expect(user).to.not.be.undefined;
  expect(user).to.not.be.null;
  expect(typeof user).equals("object");
  expect(typeof user.accessToken).equals("string");
  expect(typeof user.refreshToken).equals("string");
  expect(typeof user.id).equals("string");
  expect(typeof user.identities).equals("object");
  expect(typeof user.customData).equals("object");
  expect(user).instanceOf(Realm.User);
}

function expectIsSameUser(value: Realm.User, user: Realm.User | null) {
  expectIsUSer(value);
  expect(value.accessToken).equals(user?.accessToken);
  expect(value.id).equals(user?.id);
}

function expectUserFromAll(all: Realm.User[], user: Realm.User) {
  expectIsSameUser(
    all.find((other) => other.id === user.id),
    user,
  );
}

async function registerAndLogInEmailUser(app: Realm.App) {
  const validEmail = randomVerifiableEmail();
  const validPassword = "test1234567890";
  await app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
  const user = await app.logIn(Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }));
  expectIsUSer(user);
  expectIsSameUser(user, app.currentUser);
  return user;
}

function removeExistingUsers(): void {
  beforeEach(async function (this: AppContext & Partial<UserContext>) {
    if (this.app) {
      const users = this.app.allUsers;
      Object.keys(this.app.allUsers).forEach(async (id) => {
        await this.app.removeUser(users[id]);
      });
    }
  });
}

describe.skipIf(environment.missingServer, "User", () => {
  describe("email password", () => {
    importAppBefore("with-email-password");
    it("login without username throws", async function (this: AppContext & RealmContext) {
      // @ts-expect-error test logging in without providing username.
      expect(() => Realm.Credentials.emailPassword({ email: undefined, password: "password" })).throws(
        "Expected 'email' to be a string, got undefined",
      );
    });

    it("login without password throws", async function (this: AppContext & RealmContext) {
      const username = new Realm.BSON.UUID().toHexString();
      // @ts-expect-error test logging in without providing password.
      expect(() => Realm.Credentials.emailPassword({ email: username, password: undefined })).throws(
        "Expected 'password' to be a string, got undefined",
      );
    });

    it("login with non existing user throws", async function (this: AppContext & RealmContext) {
      const credentials = Realm.Credentials.emailPassword({ email: "foo", password: "pass" });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password");
    });

    it("email password authprovider is correct instance", async function (this: AppContext & RealmContext) {
      const provider = this.app.emailPasswordAuth;
      expect(provider).instanceof(Realm.Auth.EmailPasswordAuth);
    });

    it("autoverify email password works", async function (this: AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const invalidEmail = randomNonVerifiableEmail();
      const invalidPassword = "pass"; // too short
      const validPassword = "password123456";

      // invalid email, invalid password
      let credentials = Realm.Credentials.emailPassword({ email: invalidEmail, password: invalidPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await expect(
        this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: invalidPassword }),
      ).to.be.rejectedWith("password must be between 6 and 128 characters");
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register

      // invalid email, valid password
      credentials = Realm.Credentials.emailPassword({ email: invalidEmail, password: validPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      expect(
        this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: validPassword }),
      ).to.be.rejectedWith(`failed to confirm user "${invalidEmail}"`);
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register

      // valid email, invalid password
      credentials = Realm.Credentials.emailPassword({ email: validEmail, password: invalidPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await expect(
        this.app.emailPasswordAuth.registerUser({ email: validEmail, password: invalidPassword }),
      ).to.be.rejectedWith("password must be between 6 and 128 characters");
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register

      // valid email, valid password
      credentials = Realm.Credentials.emailPassword({ email: validEmail, password: validPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(credentials);
      expectIsUSer(user);
      expectIsSameUser(user, this.app.currentUser);
      await user.logOut();
    });
  });

  describe("properties and methods", () => {
    describe("with anonymous", () => {
      importAppBefore("with-db");
      beforeEach(() => {
        removeExistingUsers();
      });
      it("login and logout works", async function (this: AppContext & RealmContext) {
        const credentials = Realm.Credentials.anonymous();

        const user = await this.app.logIn(credentials);
        expectIsUSer(user);
        expectIsSameUser(user, this.app.currentUser);
        await user.logOut();
        // Is now logged out.
        expect(this.app.currentUser).to.be.null;
      });

      it("can fetch customData", async function (this: AppContext & RealmContext) {
        const credentials = Realm.Credentials.anonymous();
        const user = await this.app.logIn(credentials);
        const customData = user.customData;
        // TODO: Enable custom user data in the app to test this e2e
        expect(typeof customData).equals("object");
      });

      it("can fetch userProfile", async function (this: AppContext & RealmContext) {
        const credentials = Realm.Credentials.anonymous();
        const user = await this.app.logIn(credentials);
        const profile = user.profile;
        expect(typeof profile).equals("object");

        await user.logOut();
      });

      it("can fetch allUsers with anonymous", async function (this: AppContext & RealmContext) {
        let all = this.app.allUsers;

        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(0, "Noone to begin with");

        const credentials = Realm.Credentials.anonymous();
        const user1 = await this.app.logIn(credentials);
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(1, "One user");
        expectUserFromAll(all, user1);
        const user2 = await this.app.logIn(Realm.Credentials.anonymous());
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(1, "still one user");
        // NOTE: the list of users is in latest-first order.
        expectUserFromAll(all, user2);
        expectUserFromAll(all, user1);

        await user2.logOut(); // logs out the shared anonymous session
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(0, "All gone");
      });

      it("can fetch currentUser with anonymous", async function (this: AppContext & RealmContext) {
        expect(this.app.currentUser).to.be.null;

        const firstUser = await this.app.logIn(Realm.Credentials.anonymous());
        expectIsSameUser(firstUser, this.app.currentUser);
        const secondUser = await this.app.logIn(Realm.Credentials.anonymous());
        // the most recently logged in user is considered current
        expect(firstUser.isLoggedIn).to.be.true;
        expect(secondUser.isLoggedIn).to.be.true;
        expectIsSameUser(secondUser, this.app.currentUser);
        secondUser.logOut();
        // since anonymous user sessions are shared, firstUser is logged out as well
        expect(this.app.currentUser).to.be.null;
        expect(firstUser.isLoggedIn).to.be.false;
        expect(secondUser.isLoggedIn).to.be.false;
      });
    });

    describe("with email password", () => {
      importAppBefore("with-email-password");
      beforeEach(() => {
        removeExistingUsers();
      });
      it("can fetch allUsers with email password", async function (this: AppContext & RealmContext) {
        let all = this.app.allUsers;
        const userIDs = Object.keys(all);

        let loggedInUsers = 0;
        for (let i = 0; i < userIDs.length; i++) {
          console.log("Checking for login on user " + userIDs[i] + "\n");
          if (all[userIDs[i]].isLoggedIn) {
            loggedInUsers++;
          }
        }
        expect(loggedInUsers).equals(0, "Noone to begin with");

        const credentials = Realm.Credentials.anonymous();
        const user1 = await registerAndLogInEmailUser(this.app);
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(1, "One user");
        expectUserFromAll(all, user1);
        const user2 = await registerAndLogInEmailUser(this.app);
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(2, "Two users");
        // NOTE: the list of users is in latest-first order.
        expectUserFromAll(all, user2);
        expectUserFromAll(all, user1);

        await user2.logOut();
        all = this.app.allUsers;
        expectUserFromAll(all, user2);
        expectUserFromAll(all, user1);
        expect(user2.isLoggedIn).to.be.false;
        expect(user1.isLoggedIn).to.be.true;
        expect(Object.keys(all).length).equals(2, "still holds references to both users");

        await user1.logOut();
        all = this.app.allUsers;
        expect(user1.isLoggedIn).to.be.false;
        expect(user2.isLoggedIn).to.be.false;
        expect(Object.keys(all).length).equals(2, "still holds references to both users"); // FIXME: is this actually expected?
      });

      it("can fetch currentUser with email password", async function (this: AppContext & RealmContext) {
        expect(this.app.currentUser).to.be.null;

        const firstUser = await registerAndLogInEmailUser(this.app);
        expectIsSameUser(firstUser, this.app.currentUser);
        const secondUser = await registerAndLogInEmailUser(this.app);
        expectIsSameUser(secondUser, this.app.currentUser); // the most recently logged in user is considered current
        await secondUser.logOut();
        expectIsSameUser(firstUser, this.app.currentUser); // auto change back to another logged in user
        await firstUser.logOut();
        expect(this.app.currentUser).to.be.null;
      });

      it("can remove a user", async function (this: AppContext & RealmContext) {
        expect(this.app.currentUser, "No users").to.be.null;

        const validEmail = randomVerifiableEmail();
        const validPassword = "test1234567890";
        await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
        const user1 = await this.app.logIn(
          Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
        );

        expect(user1.isLoggedIn).to.be.true;

        this.app.removeUser(user1);
        expect(user1.isLoggedIn).to.be.false;

        // Expect that the user still exists on the server
        const user2 = await this.app.logIn(
          Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
        );
        expect(user2.isLoggedIn).to.be.true;

        await user2.logOut();
      });

      it("can delete a user", async function (this: AppContext & RealmContext) {
        expect(this.app.currentUser, "No users").to.be.null;

        const validEmail = randomVerifiableEmail();
        const validPassword = "test1234567890";
        await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
        const user = await this.app.logIn(
          Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
        );

        expect(user.isLoggedIn).to.be.true;

        await this.app.deleteUser(user);
        expect(user.isLoggedIn, "User is logged out").to.be.false;

        // cannot log in - user doesn't exist
        let didFail = false;
        const user2 = await this.app
          .logIn(Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }))
          .catch((err) => {
            expect(err.message).equals("invalid username/password");
            expect(err.code).equals(4349);
            didFail = true;
          });
        expect(user2).to.be.undefined;
        expect(didFail).to.be.true;
      });
    });
  });

  describe("JWT", () => {
    importAppBefore("with-jwt");
    it.skipIf(!environment.node, "can fetch JWTUserProfile", async function (this: AppContext & RealmContext) {
      const signingKey = "2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu";
      const claims = {
        name: "John Doe",
        iss: "http://myapp.com/",
        sub: "users/user1234",
        scope: "self, admins",
        aud: this.app.id,
        exp: 4070908800, // 01/01/2099

        // metadata
        mySecretField: "foo",
        id: "one",
        license: "one-two-three",
      };

      const jwt = KJUR.jws.JWS.sign(null, { alg: "HS256" }, claims, signingKey);
      const credentials = Realm.Credentials.jwt(jwt);
      const user = await this.app.logIn(credentials);
      await user.refreshCustomData();
      const profile = user.profile;

      expect(typeof profile).equals("object");
      expect(profile.id).equals(claims.id);
      expect(profile.license).equals(claims.license);

      await user.logOut();
    });
  });

  describe("api-key auth", () => {
    importAppBefore("with-api-key");
    it("can create valid key", async function (this: AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const validPassword = "test1234567890";
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(
        Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
      );
      expect(user.apiKeys instanceof Realm.Auth.ApiKeyAuth).to.be.true;

      // TODO: Enable when fixed: Disabling this test since the CI stitch integration returns cryptic error.
      const key = await user.apiKeys.create("mykey");
      expect(key._id).is.string;
      expect(key.name).equals("mykey");
      expect(key.disabled).equals(false);
      expect(key.key).is.string;

      const keys = await user.apiKeys.fetchAll();
      expect(keys).deep.equals([
        {
          _id: key._id,
          name: key.name,
          disabled: key.disabled,
        },
      ]);

      await user.logOut();
    });
  });

  describe("custom functions", () => {
    importAppBefore("with-custom-function");
    it("custom confirmation function works", async function (this: AppContext & RealmContext) {
      const pendingEmail = randomPendingVerificationEmail();
      const validPassword = "password123456";

      // we should be able to register our user as pending confirmation
      await this.app.emailPasswordAuth.registerUser({ email: pendingEmail, password: validPassword });

      // we should be able to call the registration function again
      await this.app.emailPasswordAuth.retryCustomConfirmation({ email: pendingEmail });
    });

    it("reset password function works", async function (this: AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const validPassword = "password123456";
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });

      const newPassword = "realm_tests_do_reset654321";
      await this.app.emailPasswordAuth.callResetPasswordFunction({ email: validEmail, password: newPassword });

      // see if we can log in
      const creds = Realm.Credentials.emailPassword({ email: validEmail, password: newPassword });
      const user = await this.app.logIn(creds);
      expect(user instanceof Realm.User).to.be.true;

      await user.logOut();
    });

    it("arbitrary custom function works", async function (this: AppContext & RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);

      expect(await user.callFunction("sumFunc")).equals(0);
      expect(await user.callFunction("sumFunc", 123)).equals(123);
      expect(await user.functions.sumFunc(123)).equals(123);
      expect(await user.functions["sumFunc"](123)).equals(123);

      // Test method stashing / that `this` is bound correctly.
      const sumFunc = user.functions.sumFunc;
      expect(await sumFunc()).equals(0);
      expect(await sumFunc(123)).equals(123);
      expect(await sumFunc(123)).equals(123); // Not just one-shot

      expect(await user.functions.sumFunc()).equals(0);
      expect(await user.functions.sumFunc(1, 2, 3)).equals(6);

      await expect(user.functions.error()).to.be.rejectedWith("function not found: 'error'");
    });
  });
});
