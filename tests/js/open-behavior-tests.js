////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* global navigator, WorkerNavigator */

const Realm = require("realm");
const TestCase = require("./asserts");
const schemas = require("./schemas");
const Utils = require("./test-utils");
const AppConfig = require("./support/testConfig");

const { ObjectId } = Realm.BSON;

const APP_CONFIG = AppConfig.integrationAppConfig;

class TestError extends Error {
  constructor(message) {
    super(message);
  }
}

// NOTE: these tests can be simplified once we can create multiple anonymous users.

module.exports = {
  static_references_defined: function () {
    TestCase.assertDefined(
      Realm.App.Sync.openLocalRealmBehavior,
      "static Realm.App.Sync.openLocalRealmBehavior is missing",
    );
    TestCase.assertDefined(
      Realm.App.Sync.downloadBeforeOpenBehavior,
      "static Realm.App.Sync.downloadBeforeOpenBehavior is missing",
    );
  },

  testNewFile_openLocal: async function () {
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.

    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [],
      sync: {
        user,
        partitionValue,
        newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
      },
    };

    TestCase.assertFalse(Realm.exists(config));

    const realm = await Realm.open(config);

    TestCase.assertDefined(realm.path);

    realm.close();
    await user.logOut();
  },

  testExistingFile_openLocal: async function () {
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.

    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    {
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
        },
      };

      TestCase.assertFalse(Realm.exists(config));

      const realm = new Realm(config);
      realm.write(() => {
        realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Bella" });
      });
      realm.close();
    }

    {
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          existingRealmFileBehavior: { type: "openImmediately" },
        },
      };

      const realm = await Realm.open(config);

      TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 1);

      realm.close();
    }

    await user.logOut();
  },

  testNewFile_downloadBeforeOpen: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [schemas.DogForSync],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const realm = await Realm.open(config);

    TestCase.assertTrue(realm.isEmpty);

    realm.close();
    await user.logOut();
  },

  testExistingFile_downloadBeforeOpen: async function () {
    // 1. Open empty Realm
    // 2. Close Realm
    // 3. Let other user upload changes to the Realm on the server.
    // 4. Re-open empty Realm with `existingRealmFileBehavior = syncWhenOpen`

    const app = new Realm.App(APP_CONFIG);
    const partitionValue = Utils.genPartition();
    const returningUserCredentials = await Utils.getRegisteredEmailPassCredentials(app);

    {
      // Ensure empty realm file exists
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.close();
      await user.logOut();
    }

    {
      // Update realm with different (anonymous) user
      const user = await app.logIn(Realm.Credentials.anonymous());
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Milo" });
      });

      await realm.syncSession.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      // Check that realm contains changes made (using the same user)
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: { type: "downloadBeforeOpen" },
        },
      };

      TestCase.assertTrue(Realm.exists(config));

      const realm = await Realm.open(config);

      TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 1);

      realm.close();
      await user.logOut();
    }
  },

  testNewFile_downloadBeforeOpen_throwOnTimeOut: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [schemas.DogForSync],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        newRealmFileBehavior: {
          type: "downloadBeforeOpen",
          timeOut: 0,
          timeOutBehavior: "throwException",
        },
      },
    };

    await TestCase.assertThrowsAsyncContaining(async () => {
      const realm = await Realm.open(config);
      realm.close();
    }, "could not be downloaded in the allocated time");

    await user.logOut();
  },

  testExistingFile_downloadBeforeOpen_throwOnTimeOut: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    {
      // Ensure the file exists for "user"
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);
      realm.close();
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: {
            type: "downloadBeforeOpen",
            timeOut: 0,
            timeOutBehavior: "throwException",
          },
        },
      };

      TestCase.assertTrue(Realm.exists(config));

      await TestCase.assertThrowsAsyncContaining(async () => {
        const realm = await Realm.open(config);
        realm.close();
      }, "could not be downloaded in the allocated time");
    }

    await user.logOut();
  },

  testNewFile_downloadBeforeOpen_openLocalOnTimeOut: async function () {
    // 1. Add data to server Realm from User 1
    // 2. Open Realm with User 2
    // 3. Timeout and check that the returned Realm is empty.

    const app = new Realm.App(APP_CONFIG);
    const partitionValue = Utils.genPartition();

    {
      // Add data to the realm with a different user
      const user = await app.logIn(Realm.Credentials.anonymous());
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Lola" });
      });

      await realm.syncSession.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const user = await app.logIn(Realm.Credentials.anonymous());
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          newRealmFileBehavior: {
            type: "downloadBeforeOpen",
            timeOut: 0,
            timeOutBehavior: "openLocalRealm",
          },
        },
      };

      TestCase.assertFalse(Realm.exists(config));

      const realm = await Realm.open(config);

      TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 0);

      realm.close();

      await user.logOut();
    }
  },

  testNewFile_downloadBeforeOpen_openLocalOnTimeOut_existing: async function () {
    // This is a regression test for the following issue:
    // https://github.com/realm/realm-js/issues/4453
    // If one were to logout before the openLocalRealm timeout
    // then the timeout would try to open a local realm with the timed out user

    // 1. Add data to server Realm from User
    // 2. Open Realm again with User
    // 3. Logout User and run timeout
    // 4. It should not crash

    const app = new Realm.App(APP_CONFIG);
    const partitionValue = Utils.genPartition();

    const returningUserCredentials = await Utils.getRegisteredEmailPassCredentials(app);

    {
      // Add data to the realm with a different user
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Lola" });
      });

      await realm.syncSession.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: {
            type: "downloadBeforeOpen",
            timeOut: 1000,
            timeOutBehavior: "openLocalRealm",
          },
        },
      };
      await Realm.open(config);

      await user.logOut();

      // Wait for the timeout to run.  This used to crash, since it opens a local realm with a logged out user.
      await new Promise((resolve) => setTimeout(() => resolve(), 2000));
    }
  },

  testExistingFile_downloadBeforeOpen_openLocalOnTimeOut: async function () {
    // 1. Open empty Realm
    // 2. Close Realm
    // 3. Let other user upload changes to the Realm on the server.
    // 4. Re-open empty Realm with timeOut and localOpen, Realm should still be empty.

    const app = new Realm.App(APP_CONFIG);
    const partitionValue = Utils.genPartition();
    const returningUserCredentials = await Utils.getRegisteredEmailPassCredentials(app);

    {
      // Ensure a realm file exists for the returning user
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.close();
      await user.logOut();
    }

    {
      // Add data to the realm with a different user
      const user = await app.logIn(Realm.Credentials.anonymous());
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
        },
      };

      const realm = await Realm.open(config);

      realm.write(() => {
        realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Molly" });
      });

      await realm.syncSession.uploadAllLocalChanges();

      realm.close();
      await user.logOut();
    }

    {
      // Reopen with impossible "timeOut" and test that "timeOutBehavior" holds true.
      const user = await app.logIn(returningUserCredentials);
      const config = {
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          existingRealmFileBehavior: {
            type: "downloadBeforeOpen",
            timeOut: 0,
            timeOutBehavior: "openLocalRealm",
          },
        },
      };

      TestCase.assertTrue(Realm.exists(config));

      const realm = await Realm.open(config);

      TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 0);

      realm.close();
      await user.logOut();
    }
  },

/*  testCancel: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [schemas.DogForSync],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const openPromise = new Promise((resolve, reject) => {
      const promise = Realm.open(config);
      promise.cancel();
      return promise;
    });

    openPromise
      .then(() => {
        throw new TestError("Realm was opened after being canceled.");
      })
      .catch((err) => {
        throw new TestError("An error was thrown after open was canceled: " + err.message);
      });

    // Wait for 1 second after canceling. The open promise should not emit any events in that period.
    const timeOutPromise = new Promise((resolve) => setTimeout(resolve, 1000));

    const any = Promise.race([openPromise, timeOutPromise]);

    return any.finally(() => user.logOut());
  },*/

/*  testCancel_multipleOpenCalls: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [schemas.DogForSync],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
        newRealmFileBehavior: { type: "downloadBeforeOpen" },
      },
    };

    const openPromise1 = Realm.open(config);
    const openPromise2 = Realm.open(config);

    openPromise1.cancel(); // Will cancel both promise 1 and 2 at the native level.

    try {
      await openPromise2;
      throw new TestError("openPromise2 should have been rejected..");
    } catch (err) {
      TestCase.assertEqual(err.message, "Operation canceled");
    }
  },*/

/*  testDownloadListener_whenCanceled: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    const config = {
      schema: [schemas.DogForSync],
      sync: {
        user,
        partitionValue,
        _sessionStopPolicy: "immediately",
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

    openPromise
      .then(() => {
        throw new TestError("Realm was opened after being canceled.");
      })
      .catch((err) => {
        throw new TestError("An error was thrown after open was canceled: " + err.message);
      });

    // Wait for 1 second after canceling. The open promise should not emit any events in that period.
    const timeOutPromise = new Promise((resolve) => setTimeout(resolve, 1000));

    const any = Promise.race([timeOutPromise, openPromise]);

    return any.finally(() => user.logOut());
  },*/

  testBehavior_invalidOptions: async function () {
    const app = new Realm.App(APP_CONFIG);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = Utils.genPartition();

    await TestCase.assertThrowsAsync(() =>
      Realm.open({
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          newRealmFileBehavior: { type: "foo" }, // this should fail
        },
      }),
    );

    await TestCase.assertThrowsAsync(() =>
      Realm.open({
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          newRealmFileBehavior: { type: "openLocalRealm", timeOutBehavior: "foo" }, // this should fail
        },
      }),
    );

    await TestCase.assertThrowsAsync(() =>
      Realm.open({
        schema: [schemas.DogForSync],
        sync: {
          user,
          partitionValue,
          _sessionStopPolicy: "immediately",
          newRealmFileBehavior: { type: "openLocalRealm", timeOut: "bar" }, // this should fail
        },
      }),
    );

    await user.logOut();
  },
};
