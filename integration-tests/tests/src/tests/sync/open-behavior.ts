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
import Realm, { BSON, OpenRealmBehaviorType, OpenRealmTimeOutBehavior } from "realm";
import { generatePartition, randomVerifiableEmail } from "../../utils/generators";
import { importAppBefore } from "../../hooks";
import { sleep } from "../../utils/sleep";
import { buildAppConfig } from "../../utils/build-app-config";

const DogForSyncSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "string?",
  },
};

async function getRegisteredEmailPassCredentials(app: Realm.App<any, any>) {
  if (!app) {
    throw new Error("No app supplied to 'getRegisteredEmailPassCredentials'");
  }

  const email = randomVerifiableEmail();
  const password = "test1234567890";
  // Create the user (see note in 'randomVerifiableEmail')
  await app.emailPasswordAuth.registerUser({ email, password });

  return Realm.Credentials.emailPassword(email, password);
}

describe("OpenBehaviour", function () {
  this.longTimeout();
  importAppBefore(buildAppConfig("with-pbs").anonAuth().emailPasswordAuth().partitionBasedSync());
  afterEach(() => Realm.clearTestState());

  it("static references are defined", () => {
    expect(Realm.App.Sync.openLocalRealmBehavior.type).to.equal(OpenRealmBehaviorType.OpenImmediately);

    expect(Realm.App.Sync.downloadBeforeOpenBehavior.type).to.equal(OpenRealmBehaviorType.DownloadBeforeOpen);
    expect(Realm.App.Sync.downloadBeforeOpenBehavior.timeOut).to.equal(30000);
    expect(Realm.App.Sync.downloadBeforeOpenBehavior.timeOutBehavior).to.equal(OpenRealmTimeOutBehavior.ThrowException);
  });

  it("open synced realm with localRealmBehaviour", async function (this: AppContext) {
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.

    const partitionValue = generatePartition();
    const user = await this.app.logIn(Realm.Credentials.anonymous());
    const config = {
      schema: [],
      sync: {
        user,
        partitionValue,
        newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
      },
    };

    expect(Realm.exists(config)).to.be.false;

    const realm = await Realm.open(config);

    expect(realm.path).to.not.be.undefined;
  });

  it("reopening synced realm with localRealmBehaviour", async function (this: AppContext) {
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.

    const partitionValue = generatePartition();
    const user = await this.app.logIn(Realm.Credentials.anonymous());

    const config = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
      },
    };

    expect(Realm.exists(config)).to.be.false;

    let realm = new Realm(config);
    realm.write(() => {
      realm.create(DogForSyncSchema.name, { _id: new BSON.ObjectId(), name: "Bella" });
    });
    realm.close();

    const config2: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        //@ts-expect-error const enum is removed at runtime, should either remove const or leave this as is.
        existingRealmFileBehavior: { type: "openImmediately" },
      },
    };

    realm = await Realm.open(config2);

    expect(realm.objects(DogForSyncSchema.name).length).equals(1);
  });

  it("opening new synced realm with downloadBeforeOpen set", async function (this: AppContext) {
    const partitionValue = generatePartition();
    const user = await this.app.logIn(Realm.Credentials.anonymous());

    const config: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        //@ts-expect-error const enum is removed at runtime, should either remove const or leave this as is.
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const realm = await Realm.open(config);

    expect(realm.isEmpty).to.be.true;
  });

  it("opening existing synced realm with downloadBeforeOpen set", async function (this: AppContext) {
    // 1. Open empty Realm
    // 2. Close Realm
    // 3. Let other user upload changes to the Realm on the server.
    // 4. Re-open empty Realm with `existingRealmFileBehavior = syncWhenOpen`
    const partitionValue = generatePartition();
    const returningUserCredentials = await getRegisteredEmailPassCredentials(this.app);
    {
      // Ensure empty realm file exists
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };
      await Realm.open(config);
    }
    {
      // Update realm with different (anonymous) user
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };
      const realm = await Realm.open(config);
      realm.write(() => {
        realm.create(DogForSyncSchema.name, { _id: new BSON.ObjectId(), name: "Milo" });
      });
      await realm.syncSession?.uploadAllLocalChanges();
    }
    {
      // Check that realm contains changes made (using the same user)
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          existingRealmFileBehavior: { type: "downloadBeforeOpen" },
        },
      };
      expect(Realm.exists(config)).to.be.true;
      const realm = await Realm.open(config);
      expect(realm.objects(DogForSyncSchema.name).length).equals(1);
    }
  });

  it("opening new synced realm with downloadBeforeOpen set throws on timeout", async function (this: AppContext) {
    const partitionValue = generatePartition();
    const user = await this.app.logIn(Realm.Credentials.anonymous());

    const config: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        newRealmFileBehavior: {
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          type: "downloadBeforeOpen",
          timeOut: 0,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          timeOutBehavior: "throwException",
        },
      },
    };

    try {
      const realm = await Realm.open(config);
      realm.close();
    } catch (e: any) {
      expect(e.message).contains("could not be downloaded in the allocated time");
    }
  });

  it("opening existing synced realm with downloadBeforeOpen set throws on timeout", async function (this: AppContext) {
    const partitionValue = generatePartition();
    const user = await this.app.logIn(Realm.Credentials.anonymous());

    {
      // Ensure the file exists for "user"
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };

      await Realm.open(config);
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: {
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            type: "downloadBeforeOpen",
            timeOut: 0,
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            timeOutBehavior: "throwException",
          },
        },
      };

      expect(Realm.exists(config)).to.be.true;

      try {
        const realm = await Realm.open(config);
        realm.close();
      } catch (e: any) {
        expect(e.message).contains("could not be downloaded in the allocated time");
      }
    }
  });

  it("timeout when opening new synced realm with downloadBeforeOpen and openLocal set opens an empty local realm.", async function (this: AppContext) {
    // 1. Add data to server Realm from User 1
    // 2. Open Realm with User 2
    // 3. Timeout and check that the returned Realm is empty.

    const partitionValue = generatePartition();

    {
      // Add data to the realm with a different user
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(DogForSyncSchema.name, { _id: new BSON.ObjectId(), name: "Lola" });
      });

      await realm.syncSession?.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          newRealmFileBehavior: {
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            type: "downloadBeforeOpen",
            timeOut: 0,
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            timeOutBehavior: "openLocalRealm",
          },
        },
      };

      expect(Realm.exists(config)).to.be.false;

      const realm = await Realm.open(config);

      expect(realm.objects(DogForSyncSchema.name).length).equals(0);
    }
  });

  it("timeout when opening an existing synced realm with downloadBeforeOpen and openLocal set opens an empty local realm.", async function (this: AppContext) {
    // 1. Open empty Realm
    // 2. Close Realm
    // 3. Let other user upload changes to the Realm on the server.
    // 4. Re-open empty Realm with timeOut and localOpen, Realm should still be empty.

    const partitionValue = generatePartition();
    const returningUserCredentials = await getRegisteredEmailPassCredentials(this.app);

    {
      // Ensure a realm file exists for the returning user
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.close();
      await user.logOut();
    }

    {
      // Add data to the realm with a different user
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(DogForSyncSchema.name, { _id: new BSON.ObjectId(), name: "Molly" });
      });

      await realm.syncSession?.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: {
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            type: "downloadBeforeOpen",
            timeOut: 0,
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            timeOutBehavior: "openLocalRealm",
          },
        },
      };

      expect(Realm.exists(config)).to.be.true;

      const realm = await Realm.open(config);

      expect(realm.objects(DogForSyncSchema.name).length).equals(0);
    }
  });

  it("timeout when opening synced realm with downloadBeforeOpen and openLocal set opens a local realm.", async function (this: AppContext) {
    // This is a regression test for the following issue:
    // https://github.com/realm/realm-js/issues/4453
    // If one were to logout before the openLocalRealm timeout
    // then the timeout would try to open a local realm with the timed out user

    // 1. Add data to server Realm from User
    // 2. Open Realm again with User
    // 3. Logout User and run timeout
    // 4. It should not crash

    const partitionValue = generatePartition();

    const returningUserCredentials = await getRegisteredEmailPassCredentials(this.app);

    {
      // Add data to the realm with a different user
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          //@ts-expect-error TYPEBUG: cannot access const enum at runtime
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(DogForSyncSchema.name, { _id: new BSON.ObjectId(), name: "Lola" });
      });

      await realm.syncSession?.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      const user = await this.app.logIn(returningUserCredentials);
      const config: Realm.Configuration = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          existingRealmFileBehavior: {
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            type: "downloadBeforeOpen",
            timeOut: 1000,
            //@ts-expect-error TYPEBUG: cannot access const enum at runtime
            timeOutBehavior: "openLocalRealm",
          },
        },
      };
      await Realm.open(config);

      await user.logOut();

      // Wait for the timeout to run.  This used to crash, since it opens a local realm with a logged out user.
      await sleep(1000);
    }
  });

  it("opening realm inside canceled promise", async function (this: AppContext) {
    const user = await this.app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    const config: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        //@ts-expect-error TYPEBUG: cannot access const enum at runtime
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const openPromise = new Promise(() => {
      const promise = Realm.open(config);
      promise.cancel();
      return promise;
    });

    const unexpectedPromise = openPromise
      .then(() => {
        throw new Error("Realm was opened after being canceled.");
      })
      .catch((err) => {
        throw new Error("An error was thrown after open was canceled: " + err.message);
      });

    const timeOut = await sleep(1000);

    await Promise.race([unexpectedPromise, timeOut]);
  });

  it("canceling promise with multiple realm.open calls active", async function (this: AppContext) {
    const user = await this.app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    const config: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        //@ts-expect-error TYPEBUG: cannot access const enum at runtime
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const openPromise1 = Realm.open(config);
    const openPromise2 = Realm.open(config);

    openPromise1.cancel(); // Will cancel both promise 1 and 2 at the native level.
    await expect(openPromise2).rejectedWith("Async open canceled");
  });

  it("progress-listener should not fire events on canceled realm.open", async function (this: AppContext) {
    const user = await this.app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    const config: Realm.Configuration = {
      schema: [DogForSyncSchema],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        //@ts-expect-error TYPEBUG: cannot access const enum at runtime
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const openPromise = new Promise((resolve, reject) => {
      const promise = Realm.open(config);
      // NOTE: could this potentially trigger before canceling?
      promise.progress(() => {
        reject("Progress listener called");
      });
      promise.cancel();
      return promise;
    });

    const unexpectedPromise = openPromise
      .then(() => {
        throw new Error("Realm was opened after being canceled.");
      })
      .catch((err) => {
        throw new Error("An error was thrown after open was canceled: " + err.message);
      });

    // Wait for 1 second after canceling. The open promise should not emit any events in that period.
    const timeOutPromise = await sleep(1000);
    const any = Promise.race([timeOutPromise, unexpectedPromise]);

    return any.finally(() => user.logOut());
  });

  it("opening realm with invalid options throw", async function (this: AppContext) {
    const user = await this.app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    await expect(() =>
      Realm.open({
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          //@ts-expect-error testing invalid value for newRealmFileBehaviour
          newRealmFileBehavior: { type: "foo" },
        },
      }),
    ).throws;

    await expect(() =>
      Realm.open({
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          //@ts-expect-error testing invalid value for newRealmFileBehaviour
          newRealmFileBehavior: { type: "openLocalRealm", timeOutBehavior: "foo" },
        },
      }),
    ).throws;

    await expect(() =>
      Realm.open({
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          //@ts-expect-error testing invalid value for newRealmFileBehaviour
          newRealmFileBehavior: { type: "openLocalRealm", timeOut: "bar" },
        },
      }),
    ).throws;
  });
});
