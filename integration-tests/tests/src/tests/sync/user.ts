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
  uuid,
} from "../../utils/generators";
import { KJUR } from "jsrsasign";
import { sleep } from "../../utils/sleep";

function assertIsUser(user: Realm.User) {
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

async function registerAndLogInEmailUser(app: Realm.App) {
  const validEmail = randomVerifiableEmail();
  const validPassword = "test1234567890";
  await app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
  const user = await app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));
  assertIsUser(user);
  assertIsSameUser(user, app.currentUser);
  return user;
}

async function removeExistingUsers(app: Realm.App) {
  const users = app.allUsers;
  Object.keys(app.allUsers).forEach(async (id) => {
    await app.removeUser(users[id]);
  });
}

describe.skipIf(environment.missingServer, "User", () => {
  describe("email password", () => {
    importAppBefore("with-email-password");
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

      // invalid email, invalid password
      let credentials = Realm.Credentials.emailPassword(invalidEmail, invalidPassword);
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user does not exist yet
        });
      this.app.emailPasswordAuth
        .registerUser({ email: invalidEmail, password: invalidPassword })
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("password must be between 6 and 128 characters");
        });
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user did not register
        });

      // invalid email, valid password
      credentials = Realm.Credentials.emailPassword(invalidEmail, validPassword);
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user does not exist yet
        });
      this.app.emailPasswordAuth
        .registerUser({ email: invalidEmail, password: invalidPassword })
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("failed to confirm user ${invalidEmail}");
        });
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user did not register
        });

      // valid email, invalid password
      credentials = Realm.Credentials.emailPassword(validEmail, invalidPassword);
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user does not exist yet
        });
      this.app.emailPasswordAuth
        .registerUser({ email: invalidEmail, password: invalidPassword })
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("password must be between 6 and 128 characters");
        });
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user did not register
        });

      // valid email, valid password
      credentials = Realm.Credentials.emailPassword(validEmail, validPassword);
      this.app
        .logIn(credentials)
        .then(() => {
          throw new Error("Login should have failed");
        })
        .catch((err) => {
          expect(err.message).equals("invalid username/password"); // this user does not exist yet
        });
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(credentials);
      assertIsUser(user);
      assertIsSameUser(user, this.app.currentUser);
      await user.logOut();
    });
  });

  describe("properties and methods", () => {
    describe("with anonymous", () => {
      importAppBefore("with-db");
      it("login and logout works", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        const credentials = Realm.Credentials.anonymous();

        const user = await this.app.logIn(credentials);
        assertIsUser(user);
        assertIsSameUser(user, this.app.currentUser);
        await user.logOut();
        // Is now logged out.
        expect(this.app.currentUser).to.be.null;
      });

      it("can fetch customData", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        const credentials = Realm.Credentials.anonymous();
        const user = await this.app.logIn(credentials);
        const customData = user.customData;
        // TODO: Enable custom user data in the app to test this e2e
        expect(typeof customData).equals("object");
      });

      it("can fetch userProfile", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        const credentials = Realm.Credentials.anonymous();
        const user = await this.app.logIn(credentials);
        const profile = user.profile;
        expect(typeof profile).equals("object");

        await user.logOut();
      });
      it("can fetch allUsers with anonymous", async function (this: Mocha.Context & AppContext & RealmContext) {
        let all = this.app.allUsers;
        await removeExistingUsers(this.app);

        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(0, "Noone to begin with");

        const credentials = Realm.Credentials.anonymous();
        const user1 = await this.app.logIn(credentials);
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(1, "One user");
        assertIsSameUser(all[user1.id], user1);
        const user2 = await this.app.logIn(Realm.Credentials.anonymous());
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(1, "still one user");
        // NOTE: the list of users is in latest-first order.
        assertIsSameUser(all[user2.id], user2);
        assertIsSameUser(all[user1.id], user1);

        await user2.logOut(); // logs out the shared anonymous session
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(0, "All gone");
      });
      it("can fetch currentUser with anonymous", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        expect(this.app.currentUser).to.be.null;

        const firstUser = await this.app.logIn(Realm.Credentials.anonymous());
        assertIsSameUser(firstUser, this.app.currentUser);
        const secondUser = await this.app.logIn(Realm.Credentials.anonymous());
        // the most recently logged in user is considered current
        expect(firstUser.isLoggedIn).to.be.true;
        expect(secondUser.isLoggedIn).to.be.true;
        assertIsSameUser(secondUser, this.app.currentUser);
        secondUser.logOut();
        // since anonymous user sessions are shared, firstUser is logged out as well
        expect(this.app.currentUser).to.be.null;
        expect(firstUser.isLoggedIn).to.be.false;
        expect(secondUser.isLoggedIn).to.be.false;
      });
    });
    describe("with email password", () => {
      importAppBefore("with-email-password");
      it("can fetch allUsers with email password", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);

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
        assertIsSameUser(all[user1.id], user1);
        const user2 = await registerAndLogInEmailUser(this.app);
        all = this.app.allUsers;
        expect(Object.keys(all).length).equals(2, "Two users");
        // NOTE: the list of users is in latest-first order.
        assertIsSameUser(all[user2.id], user2);
        assertIsSameUser(all[user1.id], user1);

        await user2.logOut();
        all = this.app.allUsers;
        assertIsSameUser(all[user2.id], user2);
        assertIsSameUser(all[user1.id], user1);
        expect(user2.isLoggedIn).to.be.false;
        expect(user1.isLoggedIn).to.be.true;
        expect(Object.keys(all).length).equals(2, "still holds references to both users");

        await user1.logOut();
        all = this.app.allUsers;
        expect(user1.isLoggedIn).to.be.false;
        expect(user2.isLoggedIn).to.be.false;
        expect(Object.keys(all).length).equals(2, "still holds references to both users"); // FIXME: is this actually expected?
      });
      it("can fetch currentUser with email password", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        expect(this.app.currentUser).to.be.null;

        const firstUser = await registerAndLogInEmailUser(this.app);
        assertIsSameUser(firstUser, this.app.currentUser);
        const secondUser = await registerAndLogInEmailUser(this.app);
        assertIsSameUser(secondUser, this.app.currentUser); // the most recently logged in user is considered current
        await secondUser.logOut();
        assertIsSameUser(firstUser, this.app.currentUser); // auto change back to another logged in user
        await firstUser.logOut();
        expect(this.app.currentUser).to.be.null;
      });
      it("can remove a user", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app); //this somewhat already tests the remove function
        expect(this.app.currentUser, "No users").to.be.null;

        const validEmail = randomVerifiableEmail();
        const validPassword = "test1234567890";
        await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
        const user1 = await this.app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));

        expect(user1.isLoggedIn).to.be.true;

        this.app.removeUser(user1);
        expect(user1.isLoggedIn).to.be.false;

        // Expect that the user still exists on the server
        const user2 = await this.app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));
        expect(user2.isLoggedIn).to.be.true;

        await user2.logOut();
      });
      it("can delete a user", async function (this: Mocha.Context & AppContext & RealmContext) {
        await removeExistingUsers(this.app);
        expect(this.app.currentUser, "No users").to.be.null;

        const validEmail = randomVerifiableEmail();
        const validPassword = "test1234567890";
        await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
        const user = await this.app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));

        expect(user.isLoggedIn).to.be.true;

        await this.app.deleteUser(user);
        expect(user.isLoggedIn, "User is logged out").to.be.false;

        // cannot log in - user doesn't exist
        let didFail = false;
        const user2 = await this.app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword)).catch((err) => {
          expect(err.message).equals("invalid username/password");
          expect(err.code).equals(50);
          didFail = true;
        });
        expect(user2).to.be.undefined;
        expect(didFail).to.be.true;
      });
    });
  });
  describe("JWT", () => {
    importAppBefore("with-jwt");
    it.skipIf(
      !environment.node,
      "can fetch JWTUserProfile",
      async function (this: Mocha.Context & AppContext & RealmContext) {
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
        await removeExistingUsers(this.app);
        const credentials = Realm.Credentials.jwt(jwt);
        const user = await this.app.logIn(credentials);
        await user.refreshCustomData();
        const profile = user.profile;

        expect(typeof profile).equals("object");
        expect(profile.id).equals(claims.id);
        expect(profile.license).equals(claims.license);

        await user.logOut();
      },
    );
  });
  describe("api-key auth", () => {
    importAppBefore("with-api-key");
    it("can create valid key", async function (this: Mocha.Context & AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const validPassword = "test1234567890";
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });
      const user = await this.app.logIn(Realm.Credentials.emailPassword(validEmail, validPassword));
      expect(user.apiKeys instanceof Realm.Auth.ApiKeyAuth).to.be.true;

      // TODO: Enable when fixed: Disabling this test since the CI stitch integration returns cryptic error.
      // const apikey = await user.apiKeys.create("mykey");
      // const keys = await user.apiKeys.fetchAll();
      // expect(Array.isArray(keys)).to.be.true;

      // expect(keys.length).equals(1);

      // expect(keys[0]._id).to.not.be.null;
      // expect(keys[0]._id).to.not.be.undefined;
      // expect(keys[0].name).equals(apikey);

      await user.logOut();
    });
  });
  describe("custom functions", () => {
    importAppBefore("with-custom-function");
    it("custom confirmation function works", async function (this: Mocha.Context & AppContext & RealmContext) {
      const pendingEmail = randomPendingVerificationEmail();
      const validPassword = "password123456";

      // we should be able to register our user as pending confirmation
      await this.app.emailPasswordAuth.registerUser({ email: pendingEmail, password: validPassword });

      // we should be able to call the registration function again
      await this.app.emailPasswordAuth.retryCustomConfirmation({ email: pendingEmail });
    });
    it("reset password function works", async function (this: Mocha.Context & AppContext & RealmContext) {
      const validEmail = randomVerifiableEmail();
      const validPassword = "password123456";
      await this.app.emailPasswordAuth.registerUser({ email: validEmail, password: validPassword });

      const newPassword = "realm_tests_do_reset654321";
      await this.app.emailPasswordAuth.callResetPasswordFunction({ email: validEmail, password: newPassword });

      // see if we can log in
      const creds = Realm.Credentials.emailPassword(validEmail, newPassword);
      const user = await this.app.logIn(creds);
      expect(user instanceof Realm.User).to.be.true;

      await user.logOut();
    });
    it("arbitrary custom function works", async function (this: Mocha.Context & AppContext & RealmContext) {
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

      try {
        await user.functions.error();
      } catch (err: any) {
        expect(err.message).equals("function not found: 'error'");
      }
    });
  });
  describe("mongo client", () => {
    importAppBefore("with-db");
    it("can perform operations on a collection via the client", async function (this: Mocha.Context &
      AppContext &
      RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);

      const mongo = user.mongoClient("mongodb");
      //@ts-expect-error TYPEBUG: serviceName is a missing property on MongoDB interface
      expect(mongo.serviceName).equals("mongodb");
      const database = mongo.db("test-database");
      //@ts-expect-error TYPEBUG: name is a missing property on MongoDBDatabase interface
      expect(database.name).equals("test-database");

      const collection = database.collection("testRemoteMongoClient");
      //@ts-expect-error TYPEBUG: name is a missing property on MongoDBCollection interface
      expect(collection.name).equals("testRemoteMongoClient");

      await collection.deleteMany({});
      await collection.insertOne({ hello: "world" });
      expect(await collection.count({})).equals(1);
      expect(await collection.count({ hello: "world" })).equals(1);
      expect(await collection.count({ hello: "pineapple" })).equals(0);
    });
    it("can watch changes correctly", async function (this: Mocha.Context & AppContext & RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      const collection = user.mongoClient("mongodb").db("test-database").collection("testRemoteMongoClient") as any;

      await collection.deleteMany({});

      const str = "use some odd chars to force weird encoding %\n\r\n\\????>>>>";
      await Promise.all([
        (async () => {
          // There is a race with creating the watch() streams, since they won't
          // see inserts from before they are created.
          // Wait 500ms (490+10) before first insert to try to avoid it.
          await sleep(490);
          for (let i = 0; i < 10; i++) {
            await sleep(10);
            await collection.insertOne({ _id: i, hello: "world", str });
          }
          await collection.insertOne({ _id: "done", done: true }); // break other sides out of loop
        })(),
        (async () => {
          let expected = 0;
          for await (const event of collection.watch()) {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equals(expected++);
          }
          expect(expected).equals(10);
        })(),
        (async () => {
          const filter = { $or: [{ "fullDocument._id": 3, "fullDocument.str": str }, { "fullDocument.done": true }] };
          let seenIt = false;
          for await (const event of collection.watch({ filter })) {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equals(3);
            seenIt = true;
          }
          expect(seenIt, "seenIt for filter").to.be.true;
        })(),
        (async () => {
          let seenIt = false;
          for await (const event of collection.watch({ ids: [5, "done"] })) {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equals(5);
            seenIt = true;
          }
          expect(seenIt).to.be.true;
        })(),
      ]);

      // Test failure of initial request by logging out.
      await user.logOut();
      try {
        for await (const _ of collection.watch()) {
          expect(false, "This should be unreachable").to.be.true;
        }
      } catch (err: any) {
        expect(err.code).equals(401);
      }
    });
  });
  describe("push service", () => {
    importAppBefore("with-db");
    it("can perform operations on a collection via the client", async function (this: Mocha.Context &
      AppContext &
      RealmContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);

      const push = user.push("gcm");

      await push.deregister(); // deregister never registered not an error
      await push.register("hello");
      await push.register("hello"); // double register not an error
      await push.deregister();
      await push.deregister(); // double deregister not an error

      try {
        await user.push("nonesuch").register("hello");
      } catch (err: any) {
        expect(err.message).equals("service not found: 'nonesuch'");
      }
    });
  });
});
