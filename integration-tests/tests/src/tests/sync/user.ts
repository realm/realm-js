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
import { KJUR } from "jsrsasign";
import Realm, { ProviderType, UserState } from "realm";

import { importAppBefore } from "../../hooks";
import {
  randomNonVerifiableEmail,
  randomPendingVerificationEmail,
  randomVerifiableEmail,
} from "../../utils/generators";
import { buildAppConfig } from "../../utils/build-app-config";
import { baseUrl } from "../../hooks/import-app-before";

type AnyApp = Realm.App<any, any>;
type AnyUser = Realm.User<any, any, any>;

function expectIsUser(user: Realm.User) {
  expect(user).to.be.an("object");
  expect(user.accessToken).to.be.a("string");
  expect(user.refreshToken).to.be.a("string");
  expect(user.id).to.be.a("string");
  expect(user.identities).to.be.an("array");
  expect(user.customData).to.be.an("object");
  expect(user).instanceOf(Realm.User);
}

function expectIsSameUser(value: AnyUser, user: AnyUser | null) {
  expectIsUser(value);
  expect(value.accessToken).equals(user?.accessToken);
  expect(value.id).equals(user?.id);
}

function expectUserFromAll(all: Record<string, AnyUser>, user: Realm.User) {
  expectIsSameUser(all[user.id], user);
}

function expectIsProviderType(user: Realm.User, providerType: ProviderType) {
  expect(user.identities.some((identity) => identity.providerType === providerType)).to.be.true;
}

async function registerAndLogInEmailUser(app: AnyApp) {
  const validEmail = randomVerifiableEmail();
  const validPassword = "test1234567890";
  await app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
  const user = await app.logIn(Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }));
  expectIsUser(user);
  expectIsSameUser(user, app.currentUser);
  expectIsProviderType(user, ProviderType.LocalUserPass);
  return user;
}

function removeExistingUsers(): void {
  beforeEach(async function (this: AppContext & Partial<UserContext>) {
    if (this.app) {
      const users = this.app.allUsers;
      for (const userId of Object.keys(this.app.allUsers)) {
        await this.app.removeUser(users[userId]);
      }
    }
  });
}

describe("User", () => {
  describe("email password", () => {
    importAppBefore(buildAppConfig("with-email-password").emailPasswordAuth());
    removeExistingUsers();

    it("login without username throws", async function (this: AppContext & RealmContext) {
      //@ts-expect-error email cannot be undefined.
      expect(() => Realm.Credentials.emailPassword({ email: undefined, password: "password" })).throws(
        "Expected 'email' to be a string, got undefined",
      );
    });

    it("login without password throws", async function (this: AppContext & RealmContext) {
      const username = new Realm.BSON.UUID().toHexString();
      //@ts-expect-error password cannot be undefined.
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
  });

  describe("autoverify email password works", () => {
    // any email address is valid and registerUser() will never fail when auto-confirm is enabled. The combination invalid email
    // valid password cannot be tested.
    importAppBefore(buildAppConfig("with-email-password").emailPasswordAuth());
    removeExistingUsers();

    const validEmail = randomVerifiableEmail();
    const invalidEmail = randomNonVerifiableEmail();
    const invalidPassword = "pass"; // too short
    const validPassword = "password123456";

    it("invalid email, invalid password", async function (this: AppContext & RealmContext) {
      const credentials = Realm.Credentials.emailPassword({ email: invalidEmail, password: invalidPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await expect(
        this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: invalidPassword }),
      ).to.eventually.be.rejectedWith("password must be between 6 and 128 characters");
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register
    });

    it("valid email, invalid password", async function (this: AppContext & RealmContext) {
      const credentials = Realm.Credentials.emailPassword({ email: validEmail, password: invalidPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await expect(
        this.app.emailPasswordAuth.registerUser({ email: validEmail, password: invalidPassword }),
      ).to.eventually.be.rejectedWith("password must be between 6 and 128 characters");
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register
    });

    it("valid email, valid password", async function (this: AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const validPassword = "password123456";

      const credentials = Realm.Credentials.emailPassword({ email: validEmail, password: validPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(credentials);
      expectIsUser(user);
      expectIsSameUser(user, this.app.currentUser);
      expectIsProviderType(user, ProviderType.LocalUserPass);
      await user.logOut();
    });

    it("valid email, valid password", async function (this: AppContext & RealmContext) {
      removeExistingUsers();
      const credentials = Realm.Credentials.emailPassword({ email: validEmail, password: validPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(credentials);
      expectIsUser(user);
      expectIsSameUser(user, this.app.currentUser);
      expectIsProviderType(user, ProviderType.LocalUserPass);
      await user.logOut();
    });
  });

  describe("properties and methods", () => {
    describe("with anonymous", () => {
      importAppBefore(buildAppConfig("with-anon").anonAuth());
      removeExistingUsers();

      it("login and logout works", async function (this: AppContext & RealmContext) {
        const credentials = Realm.Credentials.anonymous();

        const user = await this.app.logIn(credentials);
        expectIsUser(user);
        expectIsSameUser(user, this.app.currentUser);
        expectIsProviderType(user, ProviderType.AnonUser);
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
      importAppBefore(buildAppConfig("with-email-password").emailPasswordAuth());
      removeExistingUsers();

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

      it("double login", async function (this: AppContext & RealmContext) {
        expect(this.app.currentUser, "No users").to.be.null;

        const validEmail = randomVerifiableEmail();
        const validPassword = "test1234567890";
        await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });

        const user1 = await this.app.logIn(
          Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
        );

        const user2 = await this.app.logIn(
          Realm.Credentials.emailPassword({ email: validEmail, password: validPassword }),
        );
        expectIsSameUser(user1, user2);

        await user2.logOut();
        await user1.logOut();
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

      it("can switch user", async function (this: Mocha.Context & AppContext & RealmContext) {
        expect(this.app.currentUser).to.be.null;
        expect(Object.keys(this.app.allUsers)).to.have.lengthOf(0);

        const user1 = await registerAndLogInEmailUser(this.app);
        const user2 = await registerAndLogInEmailUser(this.app);

        expect(this.app.currentUser?.id).to.equal(user2.id);
        expect(Object.keys(this.app.allUsers)).to.have.lengthOf(2);

        this.app.switchUser(user1);

        expect(this.app.currentUser?.id).to.equal(user1.id);
        expect(Object.keys(this.app.allUsers)).to.have.lengthOf(2);
        await user1.logOut();
      });

      it("throws when switching to a logged out user", async function (this: Mocha.Context &
        AppContext &
        RealmContext) {
        expect(this.app.currentUser).to.be.null;
        expect(Object.keys(this.app.allUsers)).to.have.lengthOf(0);

        const user1 = await registerAndLogInEmailUser(this.app);
        const user2 = await registerAndLogInEmailUser(this.app);

        expect(this.app.currentUser?.id).to.equal(user2.id);

        await user1.logOut();
        expect(() => this.app.switchUser(user1)).to.throw("User is no longer valid or is logged out");

        await user2.logOut();
      });

      describe("state", () => {
        it("can fetch state when logged in with email password", async function (this: AppContext & RealmContext) {
          expect(this.app.currentUser).to.be.null;
          const user = await registerAndLogInEmailUser(this.app);
          expect(user.state).to.equal(UserState.LoggedIn);
        });

        it("can fetch state when logged out with email password", async function (this: AppContext & RealmContext) {
          const user = await registerAndLogInEmailUser(this.app);
          await user.logOut();
          expect(user.state).to.equal(UserState.LoggedOut);
        });

        it("can fetch state when removed with email password", async function (this: AppContext & RealmContext) {
          const user = await registerAndLogInEmailUser(this.app);
          await this.app.removeUser(user);
          expect(user.state).to.equal(UserState.Removed);
        });
      });
    });
  });

  const privateKey = "2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu";

  describe("JWT", () => {
    importAppBefore(
      buildAppConfig("with-custom-token").customTokenAuth({
        privateKey,
        metadataFields: [
          {
            required: true,
            name: "mySecretField",
            field_name: "secret",
          },
          {
            required: false,
            name: "id",
            field_name: "id",
          },
          {
            required: false,
            name: "license",
            field_name: "license",
          },
        ],
      }),
    );

    it.skipIf(!environment.node, "can fetch JWTUserProfile", async function (this: AppContext & RealmContext) {
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

      const jwt = KJUR.jws.JWS.sign(null, { alg: "HS256" }, claims, privateKey);
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
    importAppBefore(buildAppConfig("with-api-key").apiKeyAuth().emailPasswordAuth());

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

  // FIXME: when importing customFunctionAuth we are almost consistently getting "Syntax error: unexpected EOF (400 Bad Request)".
  // https://jira.mongodb.org/browse/RJS-2545
  describe.skip("custom auth functions", () => {
    importAppBefore(
      buildAppConfig("with-custom-function")
        .anonAuth()
        .emailPasswordAuth({
          autoConfirm: false,
          confirmEmailSubject: "",
          confirmationFunctionName: "confirmFunc",
          emailConfirmationUrl: "http://localhost/confirmEmail",
          resetFunctionName: "resetFunc",
          resetPasswordSubject: "",
          resetPasswordUrl: "http://localhost/resetPassword",
          runConfirmationFunction: true,
          runResetFunction: true,
        })
        .function({
          name: "confirmFunc",
          private: false,
          can_evaluate: {},
          source: `
          exports = ({ tokenId, username }) => {
            // process the confirm token, tokenId and username
            // - usernames that contain realm_tests_do_autoverify* will automatically be registered and approved.
            // - usernames that contain realm_tests_do_pendverify* will automatically be registered pending approval.
            // - all other usernames will fail verification and not be registered.
            if (username.includes("realm_tests_do_autoverify")) {
              return { status: "success" };
            } else if (username.includes("realm_tests_do_pendverify")) {
              return { status: "pending" };
            } else {
              return { status: "fail" };
            }
          };
          `,
        })
        .customFunctionAuth(
          `
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
        `,
        )
        .function({
          name: "resetFunc",
          private: false,
          can_evaluate: {},
          source: `
            exports = ({ token, tokenId, username, password }) => {
              // process the reset token, tokenId, username and password
              if (password.includes("realm_tests_do_reset")) {
                return { status: "success" };
              }
              // will not reset the password
              return { status: "fail" };
            };
          `,
        }),
    );

    it("custom confirmation function works", async function (this: AppContext & RealmContext) {
      const pendingEmail = randomPendingVerificationEmail();
      const validPassword = "password123456";

      // we should be able to register our user as pending confirmation
      await this.app.emailPasswordAuth.registerUser({ email: pendingEmail, password: validPassword });

      // we should be able to call the registration function again
      await this.app.emailPasswordAuth.retryCustomConfirmation({ email: pendingEmail });
    });

    it("custom confirmation function rejects invalid email", async function (this: AppContext & RealmContext) {
      const invalidEmail = randomNonVerifiableEmail();
      const validPassword = "password123456";

      const credentials = Realm.Credentials.emailPassword({ email: invalidEmail, password: validPassword });
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user does not exist yet
      expect(
        this.app.emailPasswordAuth.registerUser({ email: invalidEmail, password: validPassword }),
      ).to.eventually.be.rejectedWith(`failed to confirm user "${invalidEmail}"`);
      await expect(this.app.logIn(credentials)).to.be.rejectedWith("invalid username/password"); // this user did not register
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
  });

  describe("custom functions", () => {
    importAppBefore(
      buildAppConfig("with-custom-function")
        .anonAuth()
        .function({
          can_evaluate: {},
          name: "sumFunc",
          private: false,
          source: `
            exports = function (...args) {
              return args.reduce((a, b) => a + b, 0);
            };
          `,
        }),
    );

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

      await expect(user.functions.error()).to.be.rejectedWith("function not found");
    });
  });

  describe("currentUser", () => {
    importAppBefore(buildAppConfig("with-anon-auth").anonAuth());

    it("persists currentUser on opening the app", async function (this: AppContext & RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      const appId = this.app.id;

      //@ts-expect-error Wanting to prove that a completely new app instance will still return the current logged in user
      delete this.app;
      this.app = new Realm.App({ id: appId, baseUrl });

      {
        const currentUser = this.app.currentUser;
        expect(currentUser).not.to.be.null;
        expect(user.id).to.equal(currentUser?.id);
      }

      {
        const newApp = new Realm.App(appId);
        const currentUser = newApp.currentUser;
        expect(currentUser).not.to.be.null;
        expect(user.id).to.equal(currentUser?.id);
      }
    });
  });
});
