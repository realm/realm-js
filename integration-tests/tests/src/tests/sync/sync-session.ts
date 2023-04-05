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
import { Realm, ConnectionState, ObjectSchema, BSON, User, SyncConfiguration } from "realm";
import { importAppBefore } from "../../hooks";
import { DogSchema } from "../../schemas/person-and-dog-with-object-ids";
import { getRegisteredEmailPassCredentials } from "../../utils/credentials";
import { generatePartition } from "../../utils/generators";
import { importApp } from "../../utils/import-app";
import { sleep, throwAfterTimeout } from "../../utils/sleep";

const DogForSyncSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    partition: { type: "string", default: "partition" },
  },
};

const PersonForSyncSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    dogs: "Dog[]",
    firstName: "string",
    lastName: "string",
    partition: { type: "string", default: "partition" },
  },
};

function waitForConnectionState(session: Realm.App.Sync.Session, state: string) {
  return async () => {
    const callback = (newState: ConnectionState) => {
      if (newState === state) {
        session.removeConnectionNotification(callback);
        return;
      }
    };
    session.addConnectionNotification(callback);
    callback(session.connectionState);
    sleep(10000);
    throw new Error("Connection state notification timed out");
  };
}

function getSyncConfiguration(user: Realm.User, partition: string): Realm.Configuration {
  const realmConfig = {
    schema: [
      {
        name: "Dog",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          breed: "string?",
          name: "string",
          partition: { type: "string", default: partition },
        },
      },
    ],
    sync: {
      user: user,
      partitionValue: partition,
    },
  };
  return realmConfig;
}

async function getSyncConfWithUser(app: Realm.App, partition: any) {
  const user = await app.logIn(Realm.Credentials.anonymous());
  const config = getSyncConfiguration(user, partition);
  return { user, config };
}

function createObjects(user: Realm.User, partition: string): Promise<Realm> {
  const config = getSyncConfiguration(user, partition);

  const realm = new Realm(config);
  realm.write(() => {
    for (let i = 1; i <= 3; i++) {
      realm.create("Dog", { _id: new BSON.ObjectId(), name: `Lassy ${i}` });
    }
  });

  const session = realm.syncSession;
  return new Promise((resolve) => {
    const callback = (transferred: number, total: number) => {
      if (transferred === total) {
        session?.removeProgressNotification(callback);
        resolve(realm);
      }
    };
    //@ts-expect-error TYPEBUG: enums not exposed in realm namespace
    session?.addProgressNotification("upload", "forCurrentlyOutstandingWork", callback);
  });
}

async function seedDataWithExternalUser(
  app: Realm.App<Realm.DefaultFunctionsFactory, SimpleObject>,
  partition: string,
) {
  const credentials = Realm.Credentials.anonymous();
  const user = await app.logIn(credentials);
  const realm = await createObjects(user, partition);
  realm.close();
  user.logOut();
}

describe("SessionTest", () => {
  importAppBefore("with-db");

  describe("invalid syncsessions", () => {
    afterEach(() => Realm.clearTestState());

    it("local realm", () => {
      const realm = new Realm();
      expect(realm.syncSession).to.be.null;
    });

    it("config with undefined sync property", async () => {
      const config = {
        sync: undefined,
      };
      const realm = await Realm.open(config);
      expect(realm.syncSession).to.be.null;
    });

    it("config with sync and inMemory set", async () => {
      await expect(
        Realm.open({
          sync: {} as SyncConfiguration,
          inMemory: true,
        }),
      ).rejectedWith("The realm configuration options 'inMemory' and 'sync' cannot both be defined.");
    });

    it("config with onMigration and sync set", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);
      config.onMigration = () => {
        /* empty function */
      };
      await expect(Realm.open(config)).rejectedWith(
        "The realm configuration options 'onMigration' and 'sync' cannot both be defined.",
      );
    });

    it("invalid sync user object", async function (this: AppContext) {
      // test if an invalid object is used as user
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);
      //@ts-expect-error setting an invalid user object
      config.sync.user = { username: "John Doe" };
      await expect(Realm.open(config)).rejectedWith(
        "Expected 'user' on realm sync configuration to be an instance of User, got an object",
      );
    });

    it("propagates custom http headers", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);
      config.sync.customHttpHeaders = { language: "English" };
      const realm = new Realm(config);
      const session = realm.syncSession;
      expect(session.config.customHttpHeaders.language).equals(
        "English",
        "Synced realm does not contain the expected customHttpHeader",
      );
    });
  });

  describe("opening realm", () => {
    afterEach(() => Realm.clearTestState());

    it("contains synced data from other instance", async function (this: AppContext) {
      const expectedObjectsCount = 3;
      const partition = generatePartition();
      await seedDataWithExternalUser(this.app, partition);
      const { user, config } = await getSyncConfWithUser(this.app, partition);
      const realm = await Realm.open(config);
      const actualObjectsCount = realm.objects("Dog").length;
      expect(actualObjectsCount).equals(expectedObjectsCount);
      const session = realm.syncSession;
      expect(session).instanceOf(Realm.App.Sync.Session);
      expect(session?.user.id).equals(user.id);
      //@ts-expect-error comparing undefined with undefined, url does not exist on config.
      expect(session?.config.url).equals(config.sync?.url);
      expect(session?.config.partitionValue).equals(config.sync?.partitionValue);
      expect(session?.config.user.id).equals(config.sync?.user.id);
      expect(session?.state).equals("active");
    });

    it("with destructive schema update throws", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);
      const realm = await Realm.open(config);
      realm.close();
      // change the 'breed' property from 'string?' to 'string' to trigger a non-additive-only error.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (config.schema![0] as ObjectSchema).properties.breed = "string";

      try {
        await Realm.open(config);
      } catch (error: any) {
        expect(error.message).contain("The following changes cannot be made in additive-only schema mode:");
      }
    });

    it("with an already existing local realm", async function (this: AppContext) {
      const partition = generatePartition();
      const expectedObjectsCount = 3;
      await seedDataWithExternalUser(this.app, partition);
      const { user, config } = await getSyncConfWithUser(this.app, partition);
      config.schemaVersion = 1;

      // Open the Realm with a schema version of 1, then immediately close it.
      // This verifies that Realm.open doesn't hit issues when the schema version
      // of an existing, local Realm is different than the one passed in the configuration.
      const realm = new Realm(config);
      realm.close();

      config.schemaVersion = 2;
      const realm2 = await Realm.open(config);
      const actualObjectsCount = realm2.objects("Dog").length;
      expect(actualObjectsCount).equals(expectedObjectsCount);
      const session = realm2.syncSession;
      expect(session).instanceOf(Realm.App.Sync.Session);
      expect(session?.user.id).equals(user.id);
      //@ts-expect-error comparing undefined with undefined, url does not exist on config.
      expect(session?.config.url).equals(config.sync?.url);
      expect(session?.config.partitionValue).equals(config.sync?.partitionValue);
      expect(session?.config.user.id).equals(config.sync?.user.id);
      expect(session?.state).equals("active");
    });
  });

  describe("error handling", () => {
    afterEach(() => Realm.clearTestState());
    it("can simulate an error", async function (this: AppContext) {
      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();
      return this.app.logIn(credentials).then((user) => {
        return new Promise((resolve, _reject) => {
          const config = getSyncConfiguration(user, partition);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          config.sync!.onError = (_, error: any) => {
            try {
              expect(error.message).equals("simulated error");
              expect(error.code).equals(123);
              resolve();
            } catch (e) {
              _reject(e);
            }
          };
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          config.sync!.clientReset = {
            //@ts-expect-error TYPEBUG: can't apply enums.
            mode: "manual",
          };
          const realm = new Realm(config);
          const session = realm.syncSession;
          //@ts-expect-error using internal method.
          session._simulateError(123, "simulated error", "realm::sync::ProtocolError", false);
        });
      });
    });
  });

  describe("progress notification", () => {
    afterEach(() => Realm.clearTestState());
    it("is called", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);
      let progressCalled = false;
      await Promise.race([
        Realm.open(config).progress(() => {
          progressCalled = true;
        }),
        throwAfterTimeout(5000),
      ]);
      expect(progressCalled).to.be.true;
    });

    it("removing progress notification does not invoke callback again", async function (this: AppContext) {
      const partition = generatePartition();
      const { user, config } = await getSyncConfWithUser(this.app, partition);
      const realm = new Realm(config);
      let unregisterFunc: () => void;
      const writeDataFunc = () => {
        realm.write(() => {
          for (let i = 1; i <= 3; i++) {
            realm.create("Dog", { _id: new BSON.ObjectId(), name: `Lassy ${1}` });
          }
        });
      };
      await new Promise<void>((resolve, reject) => {
        let syncFinished = false;
        let failOnCall = false;
        const progressCallback = (transferred: number, total: number) => {
          unregisterFunc = () => {
            realm.syncSession?.removeProgressNotification(progressCallback);
          };
          if (failOnCall) {
            reject(new Error("Progress callback should not be called after removeProgressNotification"));
          }
          syncFinished = transferred === total;
          //unregister and write some new data.
          if (syncFinished) {
            failOnCall = true;
            unregisterFunc();
            //use second callback to wait for sync finished
            //@ts-expect-error TYPEBUG: enums not exposed in realm namespace
            realm.syncSession?.addProgressNotification("upload", "reportIndefinitely", (transferred, transferable) => {
              if (transferred === transferable) {
                resolve();
              }
            });
            writeDataFunc();
          }
        };
        //@ts-expect-error TYPEBUG: enums not exposed in realm namespace
        realm.syncSession?.addProgressNotification("upload", "reportIndefinitely", progressCallback);
        writeDataFunc();
      });
      await realm.close();
      user.logOut();
    });
  });

  describe("Logging", () => {
    afterEach(() => Realm.clearTestState());
    it("can set custom logging function", async function (this: AppContext) {
      // setting a custom logging function must be done immediately after instantiating an app

      const { appId, baseUrl } = await importApp("with-db");
      const app = new Realm.App({ id: appId, baseUrl });

      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();

      const logLevelStr = "info"; // "all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"
      const logLevelNum = 4; // == "info", see index.d.ts, logger.hpp for definitions

      const promisedLog = new Promise((resolve) => {
        Realm.App.Sync.setLogLevel(app, logLevelStr);
        Realm.App.Sync.setLogger(app, (level, message) => {
          if (level == logLevelNum && message.includes("Connection") && message.includes("Session")) {
            // we should, at some point, receive a log message that looks like
            // Connection[1]: Session[1]: client_reset_config = false, Realm exists = true, client reset = false
            resolve(true);
          }
        });
      });

      const user = await app.logIn(credentials);
      const config = getSyncConfiguration(user, partition);
      await Realm.open(config);
      await promisedLog;
    });
  });

  describe("Connection", () => {
    afterEach(() => Realm.clearTestState());
    it("can add connectionNotification", async function (this: AppContext) {
      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();
      return this.app
        .logIn(credentials)
        .then((u) => {
          const config = getSyncConfiguration(u, partition);
          return Realm.open(config);
        })
        .then((realm) => {
          return new Promise((resolve) => {
            realm.syncSession?.addConnectionNotification((newState, oldState) => {
              if (oldState === "connected" && newState === "disconnected") {
                resolve();
              }
            });
            realm.close();
          });
        });
    });

    it("can remove connectionNotification", async function (this: AppContext) {
      const credentials = Realm.Credentials.anonymous();
      const partition = generatePartition();
      return this.app
        .logIn(credentials)
        .then((u) => {
          const config = getSyncConfiguration(u, partition);
          return Realm.open(config);
        })
        .then((realm) => {
          return new Promise((resolve, reject) => {
            const callback1 = () => {
              reject("Should not be called");
            };
            const callback2 = (newState: ConnectionState, oldState: ConnectionState) => {
              if (oldState === "connected" && newState === "disconnected") {
                resolve();
              }
            };
            const session = realm.syncSession;
            session?.addConnectionNotification(callback1);
            session?.addConnectionNotification(callback2);
            session?.removeConnectionNotification(callback1);
            realm.close();
          });
        });
    });

    it("reflects correct connection state", async function (this: AppContext) {
      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();
      return this.app
        .logIn(credentials)
        .then((u) => {
          const config = getSyncConfiguration(u, partition);
          return Realm.open(config);
        })
        .then(async (realm) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const session = realm.syncSession!;
          session.pause();
          expect(session.connectionState).equals("disconnected");
          expect(session.isConnected()).to.be.false;

          return async () => {
            session?.addConnectionNotification((newState) => {
              const state = session.connectionState;
              const isConnected = session.isConnected();
              switch (newState) {
                case "disconnected":
                  expect(state).equals("disconnected");
                  expect(isConnected).to.be.false;
                  break;
                case "connecting":
                  expect(state).equals("connecting");
                  expect(isConnected).to.be.false;
                  break;
                case "connected":
                  expect(state).equals("connected");
                  expect(isConnected).to.be.true;
                  break;
                default:
                  throw new Error(`unknown connection value: ${newState}`);
              }

              if (newState === "connected") {
                return;
              }
            });
            session.resume();
            await sleep(10000);
            throw new Error("timeout");
          };
        });
    });
  });

  describe("pausing and resuming synchronization", () => {
    afterEach(() => Realm.clearTestState());
    it("can resume and pause synchronization", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);

      const realm = await Realm.open(config);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const session = realm.syncSession!;
      await waitForConnectionState(session, "connected");

      session?.pause();
      await waitForConnectionState(session, "disconnected");

      session?.resume();
      await waitForConnectionState(session, "connected");
    });

    it("can resume multiple times", async function (this: AppContext) {
      const partition = generatePartition();
      const { config } = await getSyncConfWithUser(this.app, partition);

      const realm = await Realm.open(config);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const session = realm.syncSession!;
      await waitForConnectionState(session, "connected");

      session.resume();
      session.resume();
      session.resume();

      await waitForConnectionState(session, "connected");
      expect(session.isConnected()).to.be.true;
    });

    it("multiple following pauses are treated as one", async function (this: AppContext) {
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      const partition = generatePartition();
      const config = getSyncConfiguration(user, partition);

      const realm = await Realm.open(config);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const session = realm.syncSession!;
      await waitForConnectionState(session, "connected");

      session.pause();
      session.pause();
      session.pause();

      await waitForConnectionState(session, "connected");
      expect(session.isConnected()).to.be.false;
    });
  });

  describe("upload and download data", () => {
    afterEach(() => Realm.clearTestState());
    it("uploaded data from one user is propagated to another", async function (this: AppContext) {
      let realm2: Realm;
      const partition = generatePartition();

      const credentials = Realm.Credentials.anonymous();
      return this.app
        .logIn(credentials)
        .then((user1) => {
          const config1 = getSyncConfiguration(user1, partition);
          return Realm.open(config1);
        })
        .then((realm1) => {
          realm1.write(() => {
            realm1.create("Dog", { _id: new BSON.ObjectId(), name: "Lassy" });
          });
          return realm1.syncSession?.uploadAllLocalChanges(1000);
        })
        .then(() => {
          return this.app.logIn(Realm.Credentials.anonymous());
        })
        .then((user2) => {
          const config2 = getSyncConfiguration(user2, partition);
          return Realm.open(config2).then((r) => {
            realm2 = r;
            return realm2.syncSession?.downloadAllServerChanges();
          });
        })
        .then(() => {
          expect(1).equals(realm2.objects("Dog").length);
        });
    });

    it("timeout on download successfully throws", async function (this: AppContext) {
      const partition = generatePartition();
      let realm!: Realm;
      await expect(
        this.app.logIn(Realm.Credentials.anonymous()).then((user) => {
          const config = getSyncConfiguration(user, partition);
          realm = new Realm(config);
          return realm.syncSession?.downloadAllServerChanges(1);
        }),
      ).is.rejectedWith("Downloading changes did not complete in 1 ms.");
    });

    it("timeout on upload successfully throws", async function (this: AppContext) {
      const partition = generatePartition();
      expect(
        this.app.logIn(Realm.Credentials.anonymous()).then((user) => {
          const config = getSyncConfiguration(user, partition);
          const realm = new Realm(config);
          return realm.syncSession?.uploadAllLocalChanges(1);
        }),
      ).rejectedWith("Uploading changes did not complete in 1 ms.");
    });
  });

  describe("reconnect", () => {
    afterEach(() => Realm.clearTestState());
    it("smoketest", async function (this: AppContext) {
      const credentials = Realm.Credentials.anonymous();
      const partition = generatePartition();
      return this.app.logIn(credentials).then((user) => {
        const config = getSyncConfiguration(user, partition);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const realm = new Realm(config);

        // No real way to check if this works automatically.
        // This is just a smoke test, making sure the method doesn't crash outright.
        Realm.App.Sync.reconnect(this.app);
      });
    });
  });

  describe("hasExistingSessions", () => {
    afterEach(() => Realm.clearTestState());
    it("starting and stopping syncsessions propagates to hasExistingSessions", async function (this: AppContext) {
      expect(Realm.App.Sync._hasExistingSessions(this.app)).to.be.false;

      const credentials = Realm.Credentials.anonymous();
      const partition = generatePartition();
      return this.app.logIn(credentials).then((user) => {
        const config = getSyncConfiguration(user, partition);
        const realm = new Realm(config);
        expect(Realm.App.Sync._hasExistingSessions(this.app)).to.be.true;
        realm.close();

        // Wait for the session to finish
        return async () => {
          for (let i = 50; i >= 0; i--) {
            if (!Realm.App.Sync._hasExistingSessions(this.app)) {
              return;
            }
            await sleep(100);
          }
          throw new Error("Failed to cleanup session in time");
        };
      });
    });
  });

  describe("getSyncSession", () => {
    afterEach(() => Realm.clearTestState());
    it("returns null on non existing session", async function (this: AppContext) {
      const partition = generatePartition();
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const session = Realm.App.Sync.getSyncSession(user, partition);
      expect(session).to.be.null;
      user.logOut();
    });

    it("successfully returns existing session", async function (this: AppContext) {
      const partition = generatePartition();
      const { user, config } = await getSyncConfWithUser(this.app, partition);
      const realm = new Realm(config);
      const session = Realm.App.Sync.getSyncSession(user, partition);
      expect(session).to.not.be.null;
      user.logOut();
      realm.close();
    });
  });

  describe("getAllSyncSession", () => {
    afterEach(() => Realm.clearTestState());
    it("returns correct number of active sesions", async function (this: AppContext) {
      const partition = generatePartition();
      const user = await this.app.logIn(Realm.Credentials.anonymous());
      // no sessions should be active initially
      const sessions1 = Realm.App.Sync.getAllSyncSessions(user);
      expect(sessions1.length).equals(0);

      const config = getSyncConfiguration(user, partition);
      new Realm(config);

      const sessions2 = Realm.App.Sync.getAllSyncSessions(user);
      expect(sessions2.length).equals(1);
      expect(sessions2[0]).to.not.be.null;
    });
  });

  describe("sessionStopPolicy", () => {
    afterEach(() => Realm.clearTestState());
    it("can only set valid properties", async function (this: AppContext) {
      const credentials = Realm.Credentials.anonymous();
      const partition = generatePartition();

      return this.app.logIn(credentials).then((user) => {
        // Check valid input
        const config1 = getSyncConfiguration(user, partition);
        //@ts-expect-error internal field
        config1.sync._sessionStopPolicy = "after-upload";

        new Realm(config1).close();

        const config2 = config1;
        //@ts-expect-error internal field
        config2.sync._sessionStopPolicy = "immediately";
        new Realm(config2).close();

        const config3 = config1;
        //@ts-expect-error internal field
        config3.sync._sessionStopPolicy = "never";
        new Realm(config3).close();

        // Invalid input
        const config4 = config1;
        //@ts-expect-error internal field
        config4.sync._sessionStopPolicy = "foo";
        expect(() => new Realm(config4)).throws();
      });
    });

    it("stop policy immediately succesfully removes session when realm is out of scope", async function (this: AppContext) {
      const credentials = Realm.Credentials.anonymous();
      const partition = generatePartition();

      return this.app.logIn(credentials).then((user) => {
        // Check valid input
        const config = getSyncConfiguration(user, partition);
        //@ts-expect-error internal field
        config.sync._sessionStopPolicy = "immediately";

        {
          expect(Realm.App.Sync._hasExistingSessions(this.app)).to.be.false;
          const realm = new Realm(config);
          expect(Realm.App.Sync._hasExistingSessions(this.app)).to.be.true;
          realm.close();
        }
        expect(Realm.App.Sync._hasExistingSessions(this.app)).to.be.false;
      });
    });
  });

  it("rejects non accepted value types", async function (this: AppContext) {
    const testPartitionValues = [
      true,
      {},
      [],
      undefined,
      Number.MAX_SAFE_INTEGER + 1,
      1.2,
      0.0000000000000001,
      -0.0000000000000001,
      -1.3,
      -Number.MAX_SAFE_INTEGER - 1,
    ];

    for (const partition of testPartitionValues) {
      const { config } = await getSyncConfWithUser(this.app, partition);
      // Note: We do not test with Realm.open() as we do not care about server errors (these tests MUST fail before hitting the server).
      expect(() => new Realm(config)).throws;
    }
  });

  describe("deleteModel", () => {
    afterEach(() => Realm.clearTestState());
    it("throws when sync is active", async function (this: AppContext) {
      const partition = generatePartition();
      return this.app
        .logIn(Realm.Credentials.anonymous())
        .then((u) => {
          const config = getSyncConfiguration(u, partition);
          return Realm.open(config);
        })
        .then((realm) => {
          realm.write(() => {
            expect(() => {
              realm.deleteModel(DogSchema.name);
            }).throws;
          });
          realm.close();
        });
    });
  });

  describe("writeCopyTo on synced realms", () => {
    afterEach(() => Realm.clearTestState());
    it("can create encrypted copies", async function (this: AppContext) {
      /*
    Test that we can create encrypted copies of a realm, and that only the
    correct encryption key will allow us to re-open that copy
  */
      const credentials1 = await getRegisteredEmailPassCredentials(this.app);
      const credentials2 = await getRegisteredEmailPassCredentials(this.app);
      const partition = generatePartition();

      /*
      Test 1:  assert that we can create an encrypted copy of a realm and
        re-open it with a valid key
    */
      const user1 = await this.app.logIn(credentials1);
      const config1: Realm.Configuration = {
        sync: {
          user: user1,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        schema: [PersonForSyncSchema, DogForSyncSchema],
      };

      const realm1 = await Realm.open(config1);
      realm1.write(() => {
        for (let i = 0; i < 25; i++) {
          realm1.create("Person", {
            _id: new BSON.ObjectId(),
            age: i,
            firstName: "John",
            lastName: "Smith",
            partition: partition,
          });
        }
      });

      // sync changes
      await realm1.syncSession?.uploadAllLocalChanges();
      await realm1.syncSession?.downloadAllServerChanges();
      realm1.syncSession?.pause();

      // create encrypted copy
      const encryptedCopyName = realm1.path + ".copy-encrypted.realm";
      const encryptionKey = new Int8Array(64);
      for (let i = 0; i < 64; i++) {
        encryptionKey[i] = 1;
      }

      const outputConfig1 = { ...config1, path: encryptedCopyName, encryptionKey: encryptionKey };
      realm1.writeCopyTo(outputConfig1);
      await user1.logOut();

      const user2 = await this.app.logIn(credentials2);
      let encryptedCopyConfig: Realm.Configuration = {
        sync: {
          user: user2,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        path: encryptedCopyName,
        encryptionKey: encryptionKey,
        schema: [PersonForSyncSchema, DogForSyncSchema],
      };

      let encryptedRealmCopy: Realm | undefined = new Realm(encryptedCopyConfig);
      expect(25).equals(encryptedRealmCopy.objects("Person").length);
      encryptedRealmCopy.close();

      /*
      Test 2:  check that we cannot open an encrypted realm copy with an
        invalid encryption key
    */
      encryptionKey[0] = 0;
      encryptedCopyConfig = {
        sync: {
          user: user2,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        path: encryptedCopyName,
        encryptionKey: encryptionKey,
        schema: [PersonForSyncSchema, DogForSyncSchema],
      };

      encryptedRealmCopy = undefined;
      expect(() => {
        encryptedRealmCopy = new Realm(encryptedCopyConfig);
      }).throws;

      expect(encryptedRealmCopy).to.be.undefined;

      /*
      Test 3:  check that we cannot open an encrypted realm copy without
        using an encryption key
    */
      encryptedCopyConfig = {
        sync: {
          user: user2,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        path: encryptedCopyName,
        schema: [PersonForSyncSchema, DogForSyncSchema],
      };

      encryptedRealmCopy = undefined;
      expect(() => {
        encryptedRealmCopy = new Realm(encryptedCopyConfig);
      }).throws;
      expect(encryptedRealmCopy).to.be.undefined;
    });

    it("has expected behaviour", async function (this: AppContext) {
      this.longTimeout();
      const credentials1 = await getRegisteredEmailPassCredentials(this.app);
      const credentials2 = await getRegisteredEmailPassCredentials(this.app);
      const credentials3 = await getRegisteredEmailPassCredentials(this.app);
      const partition = generatePartition();

      /*
      Test 1:  check whether calls to `writeCopyTo` are allowed at the right times
      */
      let user1 = await this.app.logIn(credentials1);
      const config1: Realm.Configuration = {
        sync: {
          user: user1,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        schema: [PersonForSyncSchema, DogForSyncSchema],
      };

      const realm1 = await Realm.open(config1);
      const realm1Path = realm1.path;

      realm1.write(() => {
        for (let i = 0; i < 25; i++) {
          realm1.create("Person", {
            _id: new BSON.ObjectId(),
            age: i,
            firstName: "John",
            lastName: "Smith",
            partition,
          });
        }
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      await realm1.syncSession?.downloadAllServerChanges();

      const outputConfig1 = {
        schema: [PersonForSyncSchema, DogForSyncSchema],
        path: realm1Path + "copy1.realm",
      };
      // changes are synced -- we should be able to copy the realm
      realm1.writeCopyTo(outputConfig1);

      // log out the user that created the realm
      await user1.logOut();

      // add another 25 people
      realm1.write(() => {
        for (let i = 0; i < 25; i++) {
          realm1.create("Person", {
            _id: new BSON.ObjectId(),
            age: i,
            firstName: "John",
            lastName: "Smith",
            partition,
          });
        }
      });

      // Log user back in to attempt to copy synced changes
      user1 = await this.app.logIn(credentials1);
      const realm2Path = `${realm1Path}copy2.realm`;
      const outputConfig2: Realm.Configuration = {
        sync: {
          user: user1,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        schema: [PersonForSyncSchema, DogForSyncSchema],
        path: realm2Path,
      };

      // we haven't uploaded our recent changes -- we're not allowed to copy
      expect(() => {
        realm1.writeCopyTo(outputConfig2);
      }).throws("All client changes must be integrated in server before writing copy");

      // log back in and upload the changes we made locally
      user1 = await this.app.logIn(credentials1);
      await realm1.syncSession?.uploadAllLocalChanges();

      // create copy no. 2 of the realm
      realm1.writeCopyTo(outputConfig2);

      /*
      Test 2:  check that a copied realm can be opened by another user, and that
        the contents of the original realm and the copy are as expected
      */
      // log in a new user, open the realm copy we created just above
      const user2 = await this.app.logIn(credentials2);
      const config2: Realm.Configuration = {
        sync: {
          user: user2,
          partitionValue: partition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        },
        schema: [PersonForSyncSchema, DogForSyncSchema],
        path: realm2Path,
      };

      const realm2 = await Realm.open(config2);

      let realm1Persons = realm1.objects("Person");
      let realm2Persons = realm2.objects("Person");
      expect(realm1Persons.length).equals(
        realm2Persons.length,
        "The same number of people should be in the two realms",
      );

      // add another 25 people locally to the original realm
      realm1.syncSession?.pause();
      realm1.write(() => {
        for (let i = 0; i < 25; i++) {
          realm1.create("Person", {
            _id: new BSON.ObjectId(),
            age: i,
            firstName: "John",
            lastName: "Smith",
            partition,
          });
        }
      });

      realm1Persons = realm1.objects("Person");
      realm2Persons = realm2.objects("Person");
      expect(realm1Persons.length).equals(realm2Persons.length + 25, "realm1 should have an additional 25 people");
      realm1.syncSession?.resume();

      await realm1.syncSession?.uploadAllLocalChanges();
      await realm1.syncSession?.downloadAllServerChanges();

      await user2.logOut();
      realm2.close();
      Realm.deleteFile(config2);

      /*
      Test 3:  open a copy of our realm with a new user and a new
        partition key.  We expect it to fail because of the mismatch
        in partition keys
      */
      const realm3Path = realm1Path + "copy3.realm";
      const outputConfig3 = { ...config1, path: realm3Path };
      realm1.writeCopyTo(outputConfig3);

      const user3 = await this.app.logIn(credentials3);
      const otherPartition = generatePartition();
      const config3: Realm.Configuration = {
        sync: {
          user: user3,
          partitionValue: otherPartition,
          //@ts-expect-error internal field
          _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
          clientReset: {
            //@ts-expect-error TYPEBUG: enum not exposed in realm namespace
            mode: "manual",
            onManual: (...args) => console.log("error", args),
          },
        },
        schema: [PersonForSyncSchema, DogForSyncSchema],
        path: realm3Path,
      };

      let realm3;
      try {
        realm3 = await Realm.open(config3);
        throw new Error("successfully opened invalid realm");
      } catch (e: any) {
        expect(e.message).contains("Bad server version");
      }

      expect(realm3).to.be.undefined;
    });
  });
});
