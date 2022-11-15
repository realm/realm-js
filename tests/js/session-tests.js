////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/* eslint-env es6, node */

/* global REALM_MODULE_PATH */

// Run these tests with the `DEBUG=tests:session` environment variable set to get the stdout of sub-processes.

const debug = require("debug")("tests:session");
const { Realm } = require("realm");
const { ObjectId, UUID } = Realm.BSON;

const TestCase = require("./asserts");
const Utils = require("./test-utils");
let schemas = require("./schemas");
const AppConfig = require("./support/testConfig");
const { resolve } = require("path");
const { execFileSync } = require("child_process");

const REALM_MODULE_PATH = require.resolve("realm");

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const isElectronProcess = typeof process === "object" && process.versions && process.versions.electron;

const platformSupported = isNodeProcess && !isElectronProcess;

const require_method = require;
function node_require(module) {
  return require_method(module);
}

let fetch;
if (isNodeProcess) {
  fetch = node_require("node-fetch");
}

let tmp;
let fs;
let execFile;
let path;
if (isNodeProcess) {
  tmp = node_require("tmp");
  fs = node_require("fs");
  execFile = node_require("child_process").execFile;
  tmp.setGracefulCleanup();
  path = node_require("path");
}

let appConfig = AppConfig.integrationAppConfig;

function getSyncConfiguration(user, partition) {
  const realmConfig = {
    schema: [
      {
        name: "Dog",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          breed: "string?",
          name: "string",
          realm_id: "string?",
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

function copyFileToTempDir(filename) {
  let tmpDir = tmp.dirSync();
  let content = fs.readFileSync(filename);
  let tmpFile = tmp.fileSync({ dir: tmpDir.name });
  fs.appendFileSync(tmpFile.fd, content);
  return tmpFile.name;
}

function runOutOfProcess() {
  const args = Array.prototype.slice.call(arguments);
  let tmpDir = tmp.dirSync();
  debug(`runOutOfProcess : ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    try {
      execFile(process.execPath, args, { cwd: tmpDir.name }, (error, stdout, stderr) => {
        if (error) {
          console.error("runOutOfProcess failed\n", error, stdout, stderr);
          reject(new Error(`Running ${args[0]} failed. error: ${error}`));
          return;
        }

        debug("runOutOfProcess success\n" + stdout);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

function waitForConnectionState(session, state) {
  return new Promise((resolve, reject) => {
    let callback = (newState) => {
      if (newState === state) {
        session.removeConnectionNotification(callback);
        resolve();
      }
    };
    session.addConnectionNotification(callback);
    callback(session.connectionState);
    setTimeout(() => {
      reject("Connection state notification timed out");
    }, 10000);
  });
}

function unexpectedError(e) {
  function printObject(o) {
    var out = "";
    for (var p in o) {
      out += p + ": " + o[p] + "\n";
    }
    return out;
  }

  return `Failed with unexpected error ${e}: ${printObject(e)}`;
}

module.exports = {
  async testHttpHeaders() {
    const partition = Utils.genPartition();
    let credentials = Realm.Credentials.anonymous();
    let app = new Realm.App(appConfig);
    const user = await app.logIn(credentials);
    const config = getSyncConfiguration(user, partition);
    config.sync.customHttpHeaders = { language: "English" };
    const realm = new Realm(config);
    const session = realm.syncSession;
    TestCase.assertEqual(
      "English",
      session.config.customHttpHeaders.language,
      "Synced realm does not contain the expected customHttpHeader",
    );
  },

  testLocalRealmHasNoSession() {
    let realm = new Realm();
    TestCase.assertNull(realm.syncSession);
  },

  testRealmSyncUndefinedHasNoSession() {
    const config = {
      sync: undefined,
    };

    return Realm.open(config).then((realm) => {
      TestCase.assertNull(realm.syncSession);
    });
  },

  async testRealmInvalidSyncConfiguration1() {
    const config = {
      sync: true,
      inMemory: true,
    };

    await TestCase.assertThrowsAsyncContaining(async () => {
      await Realm.open(config);
    }, "Expected 'user' to be an instance of User, got undefined");
  },

  async testRealmInvalidSyncConfiguration2() {
    const partition = Utils.genPartition();
    let credentials = Realm.Credentials.anonymous();
    let app = new Realm.App(appConfig);

    const user = await app.logIn(credentials);

    let config = getSyncConfiguration(user, partition);
    config.onMigration = (_) => {
      // Migration functions and sync are mutually exclusive.
    };
    await TestCase.assertThrowsAsyncContaining(async () => {
      await Realm.open(config);
    }, "Options 'onMigration' and 'sync' are mutually exclusive");
  },

  async testRealmInvalidSyncUser() {
    // test if an invalid object is used as user
    const partition = Utils.genPartition();
    let credentials = Realm.Credentials.anonymous();
    let app = new Realm.App(appConfig);
    let user = app.logIn(credentials);
    let config = getSyncConfiguration(user, partition);
    config.sync.user = { username: "John Doe" }; // this is an invalid user object
    await TestCase.assertThrowsAsyncContaining(async () => {
      await Realm.open(config);
    }, "Expected 'user' to be an instance of User, got an object");
  },

  async testRealmOpen() {
    if (!isNodeProcess) {
      return;
    }

    const partition = Utils.genPartition();
    const expectedObjectsCount = 3;

    let credentials = Realm.Credentials.anonymous();
    let app = new Realm.App(appConfig);

    await runOutOfProcess(
      __dirname + "/download-api-helper.js",
      appConfig.id,
      appConfig.baseUrl,
      partition,
      REALM_MODULE_PATH,
    );

    const user = await app.logIn(credentials);

    const config = getSyncConfiguration(user, partition);
    const realm = await Realm.open(config);

    let actualObjectsCount = realm.objects("Dog").length;
    TestCase.assertEqual(
      actualObjectsCount,
      expectedObjectsCount,
      "Synced realm does not contain the expected objects count",
    );

    const session = realm.syncSession;
    TestCase.assertInstanceOf(session, Realm.App.Sync.Session);
    TestCase.assertEqual(session.user.id, user.id);
    TestCase.assertEqual(session.config.url, config.sync.url);
    TestCase.assertEqual(session.config.partitionValue, config.sync.partitionValue);
    TestCase.assertEqual(session.config.user.id, config.sync.user.id);
    TestCase.assertEqual(session.state, "active");

    await user.logOut();
  },

  async testRealmOpenWithDestructiveSchemaUpdate() {
    if (!isNodeProcess) {
      return;
    }

    const partition = Utils.genPartition();

    await runOutOfProcess(
      __dirname + "/download-api-helper.js",
      appConfig.id,
      appConfig.baseUrl,
      partition,
      REALM_MODULE_PATH,
    );

    const app = new Realm.App(appConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const config = getSyncConfiguration(user, partition);

    const realm = await Realm.open(config);
    realm.close();

    // change the 'breed' property from 'string?' to 'string' to trigger a non-additive-only error.
    config.schema[0].properties.breed = "string";

    await TestCase.assertThrowsAsyncContaining(
      async () => await Realm.open(config), // This crashed in bug #3414.
      "The following changes cannot be made in additive-only schema mode:",
    );
  },

  async testRealmOpenWithExistingLocalRealm() {
    if (!platformSupported) {
      return;
    }

    const partition = Utils.genPartition();
    const expectedObjectsCount = 3;

    let user, config;
    let app = new Realm.App(appConfig);
    const credentials = Realm.Credentials.anonymous();
    return runOutOfProcess(
      __dirname + "/download-api-helper.js",
      appConfig.id,
      appConfig.baseUrl,
      partition,
      REALM_MODULE_PATH,
    )
      .then(() => app.logIn(credentials))
      .then(async (u) => {
        user = u;
        config = getSyncConfiguration(user, partition);
        config.schemaVersion = 1;

        // Open the Realm with a schema version of 1, then immediately close it.
        // This verifies that Realm.open doesn't hit issues when the schema version
        // of an existing, local Realm is different than the one passed in the configuration.
        let realm = new Realm(config);
        realm.close();

        config.schemaVersion = 2;
        const realm2 = await Realm.open(config);
        return realm2;
      })
      .then((realm) => {
        let actualObjectsCount = realm.objects("Dog").length;
        TestCase.assertEqual(
          actualObjectsCount,
          expectedObjectsCount,
          "Synced realm does not contain the expected objects count",
        );

        const session = realm.syncSession;
        TestCase.assertInstanceOf(session, Realm.App.Sync.Session);
        TestCase.assertEqual(session.user.id, user.id);
        TestCase.assertEqual(session.config.url, config.sync.url);
        TestCase.assertEqual(session.config.user.id, config.sync.user.id);
        TestCase.assertEqual(session.state, "active");
        realm.close();
      });
  },

  testRealmOpenLocalRealm() {
    const expectedObjectsCount = 3;

    let config = {
      schema: [{ name: "Dog", properties: { name: "string" } }],
    };

    return Realm.open(config).then((realm) => {
      realm.write(() => {
        for (let i = 1; i <= 3; i++) {
          realm.create("Dog", { name: `Lassy ${i}` });
        }
      });

      let actualObjectsCount = realm.objects("Dog").length;
      TestCase.assertEqual(
        actualObjectsCount,
        expectedObjectsCount,
        "Local realm does not contain the expected objects count",
      );
      realm.close();
    });
  },

  testErrorHandling() {
    let app = new Realm.App(appConfig);
    const partition = Utils.genPartition();
    const credentials = Realm.Credentials.anonymous();
    return app.logIn(credentials).then((user) => {
      return new Promise((resolve, _reject) => {
        const config = getSyncConfiguration(user, partition);
        config.sync.onError = (_, error) => {
          try {
            TestCase.assertEqual(error.message, "simulated error");
            TestCase.assertEqual(error.code, 123);
            resolve();
          } catch (e) {
            _reject(e);
          }
        };
        config.sync.clientReset = {
          mode: "manual",
        };
        const realm = new Realm(config);
        const session = realm.syncSession;
        session._simulateError(123, "simulated error", "realm::sync::ProtocolError", false);
      });
    });
  },

  /* testListNestedSync() {
        if (!platformSupported) {
            return;
        }

        const partition = Utils.genPartition();
        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return runOutOfProcess(__dirname + '/nested-list-helper.js', appConfig.id, appConfig.baseUrl, partition, REALM_MODULE_PATH)
            .then(() => {
                return app.logIn(credentials)
            })
            .then(user => {
                let config = {
                    // FIXME: schema not working yet
                    schema: [schemas.ParentObject, schemas.NameObject],
                    sync: { user, partitionValue: partition }
                };
                Realm.deleteFile(config);
                return Realm.open(config)
            }).then(realm => {
                let objects = realm.objects('ParentObject');

                let json = JSON.stringify(objects);
                // TestCase.assertEqual(json, '{"0":{"id":1,"name":{"0":{"family":"Larsen","given":{"0":"Hans","1":"Jørgen"},"prefix":{}},"1":{"family":"Hansen","given":{"0":"Ib"},"prefix":{}}}},"1":{"id":2,"name":{"0":{"family":"Petersen","given":{"0":"Gurli","1":"Margrete"},"prefix":{}}}}}');
                TestCase.assertEqual(objects.length, 2);
                TestCase.assertEqual(objects[0].name.length, 2);
                TestCase.assertEqual(objects[0].name[0].given.length, 2);
                TestCase.assertEqual(objects[0].name[0].prefix.length, 0);
                TestCase.assertEqual(objects[0].name[0].given[0], 'Hans');
                TestCase.assertEqual(objects[0].name[0].given[1], 'Jørgen')
                TestCase.assertEqual(objects[0].name[1].given.length, 1);
                TestCase.assertEqual(objects[0].name[1].given[0], 'Ib');
                TestCase.assertEqual(objects[0].name[1].prefix.length, 0);

                TestCase.assertEqual(objects[1].name.length, 1);
                TestCase.assertEqual(objects[1].name[0].given.length, 2);
                TestCase.assertEqual(objects[1].name[0].prefix.length, 0);
                TestCase.assertEqual(objects[1].name[0].given[0], 'Gurli');
                TestCase.assertEqual(objects[1].name[0].given[1], 'Margrete');
            });
    },*/

  async testProgressNotificationsUnregisterForRealmConstructor() {
    if (!platformSupported) {
      return;
    }

    const partition = Utils.genPartition();

    let app = new Realm.App(appConfig);
    const credentials = Realm.Credentials.anonymous();
    await runOutOfProcess(
      __dirname + "/download-api-helper.js",
      appConfig.id,
      appConfig.baseUrl,
      partition,
      REALM_MODULE_PATH,
    );
    const user = await app.logIn(credentials);
    let config = getSyncConfiguration(user, partition);

    let realm = new Realm(config);
    let unregisterFunc;

    let writeDataFunc = () => {
      realm.write(() => {
        for (let i = 1; i <= 3; i++) {
          realm.create("Dog", { _id: new ObjectId(), name: `Lassy ${i}` });
        }
      });
    };

    await new Promise((resolve, reject) => {
      let syncFinished = false;
      let failOnCall = false;
      const progressCallback = (transferred, total) => {
        if (failOnCall) {
          reject(new Error("Progress callback should not be called after removeProgressNotification"));
        }

        syncFinished = transferred === total;

        //unregister and write some new data.
        if (syncFinished) {
          failOnCall = true;
          unregisterFunc();

          //use second callback to wait for sync finished
          realm.syncSession.addProgressNotification("upload", "reportIndefinitely", (transferred, transferable) => {
            if (transferred === transferable) {
              resolve();
            }
          });
          writeDataFunc();
        }
      };

      realm.syncSession.addProgressNotification("upload", "reportIndefinitely", progressCallback);

      unregisterFunc = () => {
        realm.syncSession.removeProgressNotification(progressCallback);
      };

      writeDataFunc();
    });
  },

  async testProgressNotificationsForRealmOpen() {
    if (!platformSupported) {
      return;
    }

    const partition = Utils.genPartition();
    let progressCalled = false;

    const credentials = Realm.Credentials.anonymous();
    const app = new Realm.App(appConfig);
    await runOutOfProcess(
      __dirname + "/download-api-helper.js",
      appConfig.id,
      appConfig.baseUrl,
      partition,
      REALM_MODULE_PATH,
    );
    const user = await app.logIn(credentials);
    const config = getSyncConfiguration(user, partition);
    await Promise.race([
      Realm.open(config).progress((transferred, total) => {
        progressCalled = true;
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject("Progress Notifications API failed to call progress callback for Realm constructor"),
          5000,
        ),
      ),
    ]);
    TestCase.assertTrue(progressCalled);
  },

  // test that it is possible to register a custom logging function on a
  // Sync session, and that it is invoked when a session is established
  async testCustomSessionLogging() {
    const partition = Utils.genPartition();
    let credentials = Realm.Credentials.anonymous();
    let app = new Realm.App(appConfig);
    let user = await app.logIn(credentials);
    let config = getSyncConfiguration(user, partition);

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

    const realm = await Realm.open(config);
    await promisedLog;
    realm.close();
  },

  async testAddConnectionNotification() {
    const partition = Utils.genPartition();
    const app = new Realm.App(appConfig);
    const credentials = Realm.Credentials.anonymous();
    const user = await app.logIn(credentials);
    const config = getSyncConfiguration(user, partition);
    const realm = await Realm.open(config);
    await new Promise((resolve, reject) => {
      realm.syncSession.addConnectionNotification((newState, oldState) => {
        if (
          oldState === Realm.App.Sync.ConnectionState.Connected &&
          newState === Realm.App.Sync.ConnectionState.Disconnected
        ) {
          resolve();
        }
      });
      realm.close();
    });
  },

  testRemoveConnectionNotification() {
    let app = new Realm.App(appConfig);
    const credentials = Realm.Credentials.anonymous();
    const partition = Utils.genPartition();
    return app
      .logIn(credentials)
      .then((u) => {
        let config = getSyncConfiguration(u, partition);
        return Realm.open(config);
      })
      .then((realm) => {
        return new Promise((resolve, reject) => {
          let callback1 = () => {
            reject("Should not be called");
          };
          let callback2 = (newState, oldState) => {
            if (
              oldState === Realm.App.Sync.ConnectionState.Connected &&
              newState === Realm.App.Sync.ConnectionState.Disconnected
            ) {
              resolve();
            }
          };
          let session = realm.syncSession;
          session.addConnectionNotification(callback1);
          session.addConnectionNotification(callback2);
          session.removeConnectionNotification(callback1);
          realm.close();
        });
      });
  },

  testConnectionState() {
    if (!platformSupported) {
      return;
    }
    const partition = Utils.genPartition();
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    return app
      .logIn(credentials)
      .then((u) => {
        let config = getSyncConfiguration(u, partition);
        return Realm.open(config);
      })
      .then((realm) => {
        let session = realm.syncSession;
        session.pause();
        TestCase.assertEqual(session.connectionState, Realm.App.Sync.ConnectionState.Disconnected);
        TestCase.assertFalse(session.isConnected());

        return new Promise((resolve, reject) => {
          session.addConnectionNotification((newState, _) => {
            let state = session.connectionState;
            let isConnected = session.isConnected();
            switch (newState) {
              case Realm.App.Sync.ConnectionState.Disconnected:
                TestCase.assertEqual(state, Realm.App.Sync.ConnectionState.Disconnected);
                TestCase.assertFalse(isConnected);
                break;
              case Realm.App.Sync.ConnectionState.Connecting:
                TestCase.assertEqual(state, Realm.App.Sync.ConnectionState.Connecting);
                TestCase.assertFalse(isConnected);
                break;
              case Realm.App.Sync.ConnectionState.Connected:
                TestCase.assertEqual(state, Realm.App.Sync.ConnectionState.Connected);
                TestCase.assertTrue(isConnected);
                break;
              default:
                reject(`unknown connection value: ${newState}`);
            }

            if (newState === Realm.App.Sync.ConnectionState.Connected) {
              resolve();
            }
          });
          session.resume();
          setTimeout(() => {
            reject("timeout");
          }, 10000);
        });
      });
  },

  async testResumePause() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const user = await app.logIn(credentials);
    const partition = Utils.genPartition();
    let config = getSyncConfiguration(user, partition);

    const realm = await Realm.open(config);
    const session = realm.syncSession;
    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Connected);

    session.pause();
    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Disconnected);

    session.resume();
    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Connected);
  },

  async testMultipleResumes() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const user = await app.logIn(credentials);
    const partition = Utils.genPartition();
    let config = getSyncConfiguration(user, partition);

    const realm = await Realm.open(config);
    const session = realm.syncSession;
    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Connected);

    session.resume();
    session.resume();
    session.resume();

    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Connected);
    TestCase.assertTrue(session.isConnected());
  },

  async testMultiplePauses() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const user = await app.logIn(credentials);
    const partition = Utils.genPartition();
    let config = getSyncConfiguration(user, partition);

    const realm = await Realm.open(config);
    const session = realm.syncSession;
    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Connected);

    session.pause();
    session.pause();
    session.pause();

    await waitForConnectionState(session, Realm.App.Sync.ConnectionState.Disconnected);
    TestCase.assertFalse(session.isConnected());
  },

  testUploadDownloadAllChanges() {
    let app = new Realm.App(appConfig);

    let realm2;
    const realmPartition = Utils.genPartition();

    const credentials = Realm.Credentials.anonymous();
    return app
      .logIn(credentials)
      .then((user1) => {
        const config1 = getSyncConfiguration(user1, realmPartition);
        return Realm.open(config1);
      })
      .then((realm1) => {
        realm1.write(() => {
          realm1.create("Dog", { _id: new ObjectId(), name: "Lassy" });
        });
        return realm1.syncSession.uploadAllLocalChanges(1000);
      })
      .then(() => {
        return app.logIn(Realm.Credentials.anonymous());
      })
      .then((user2) => {
        const config2 = getSyncConfiguration(user2, realmPartition);
        return Realm.open(config2).then((r) => {
          realm2 = r;
          return realm2.syncSession.downloadAllServerChanges();
        });
      })
      .then(() => {
        TestCase.assertEqual(1, realm2.objects("Dog").length);
      });
  },

  async testDownloadAllServerChangesTimeout() {
    if (!platformSupported) {
      return;
    }

    const app = new Realm.App(appConfig);
    const realmPartition = Utils.genPartition();
    const user = await app.logIn(Realm.Credentials.anonymous());

    const config = getSyncConfiguration(user, realmPartition);
    const realm = new Realm(config);
    await TestCase.assertThrowsAsyncContaining(async () => {
      await realm.syncSession.downloadAllServerChanges(1);
    }, "Downloading changes did not complete in 1 ms.");
  },

  async testUploadAllLocalChangesTimeout() {
    if (!platformSupported) {
      return;
    }

    const app = new Realm.App(appConfig);
    const realmPartition = Utils.genPartition();
    const user = await app.logIn(Realm.Credentials.anonymous());

    const config = getSyncConfiguration(user, realmPartition);
    const realm = new Realm(config);
    await TestCase.assertThrowsAsyncContaining(async () => {
      await realm.syncSession.uploadAllLocalChanges(1);
    }, "Uploading changes did not complete in 1 ms.");
  },

  testReconnect() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();
    return app.logIn(credentials).then((user) => {
      const config = getSyncConfiguration(user, realmPartition);
      let realm = new Realm(config);

      // No real way to check if this works automatically.
      // This is just a smoke test, making sure the method doesn't crash outright.
      Realm.App.Sync.reconnect(app);
    });
  },

  test_hasExistingSessions() {
    let app = new Realm.App(appConfig);

    TestCase.assertFalse(Realm.App.Sync._hasExistingSessions(app));

    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();
    return app.logIn(credentials).then((user) => {
      const config = getSyncConfiguration(user, realmPartition);
      let realm = new Realm(config);
      realm.close();

      // Wait for the session to finish
      return new Promise((resolve, reject) => {
        let intervalId;
        let it = 50;
        intervalId = setInterval(function () {
          if (!Realm.App.Sync._hasExistingSessions(app)) {
            clearInterval(intervalId);
            resolve();
          } else if (it < 0) {
            clearInterval(intervalId);
            reject("Failed to cleanup session in time");
          } else {
            it--;
          }
        }, 100);
      });
    });
  },

  async testGetSyncSession() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();
    let user = await app.logIn(credentials);
    let session1 = Realm.App.Sync.getSyncSession(user, realmPartition);
    TestCase.assertNull(session1);

    const config = getSyncConfiguration(user, realmPartition);
    let realm = new Realm(config);
    let session2 = Realm.App.Sync.getSyncSession(user, realmPartition);
    TestCase.assertNotNull(session2);
    realm.close();
  },

  async testGetAllSyncSessions() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();
    let user = await app.logIn(credentials);
    let sessions1 = Realm.App.Sync.getAllSyncSessions(user);
    TestCase.assertArrayLength(sessions1, 0);

    const config = getSyncConfiguration(user, realmPartition);
    let realm = new Realm(config);

    let sessions2 = Realm.App.Sync.getAllSyncSessions(user);
    TestCase.assertArrayLength(sessions2, 1);
    TestCase.assertNotNull(sessions2[0]);
    realm.close();
  },

  testSessionStopPolicy() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();

    return app.logIn(credentials).then((user) => {
      // Check valid input
      let config1 = getSyncConfiguration(user, realmPartition);
      config1.sync._sessionStopPolicy = "after-upload";

      new Realm(config1).close();

      const config2 = config1;
      config2.sync._sessionStopPolicy = "immediately";
      new Realm(config2).close();

      const config3 = config1;
      config3.sync._sessionStopPolicy = "never";
      new Realm(config3).close();

      // Invalid input
      const config4 = config1;
      config4.sync._sessionStopPolicy = "foo";
      TestCase.assertThrows(() => new Realm(config4));
    });
  },

  async testAcceptedPartitionValueTypes() {
    const testPartitionValues = [
      Utils.genPartition(), // string
      Number.MAX_SAFE_INTEGER,
      6837697641419457,
      26123582,
      0,
      -12342908,
      -7482937500235834,
      -Number.MAX_SAFE_INTEGER,
      new ObjectId("603fa0af4caa9c90ff6e126c"),
      new UUID("f3287217-d1a2-445b-a4f7-af0520413b2a"),
      null,
      "",
    ];

    for (const partitionValue of testPartitionValues) {
      const app = new Realm.App(appConfig);

      const user = await app.logIn(Realm.Credentials.anonymous());

      const config = getSyncConfiguration(user, partitionValue);
      TestCase.assertEqual(partitionValue, config.sync.partitionValue);

      // TODO: Update docker testing-setup to allow for multiple apps and test each type on a supported App.
      // Note: This does NOT await errors from the server, as we currently have limitations in the docker-server-setup. All tests with with non-string fails server-side.
      const realm = new Realm(config);
      TestCase.assertDefined(realm);

      const spv = realm.syncSession.config.partitionValue;

      // BSON types have their own 'equals' comparer
      if (spv instanceof ObjectId) {
        TestCase.assertTrue(spv.equals(partitionValue));
      } else if (spv && spv.toUUID !== undefined) {
        TestCase.assertTrue(spv.toUUID().equals(partitionValue));
      } else {
        TestCase.assertEqual(spv, partitionValue);
      }

      realm.close();
    }
  },

  async testNonAcceptedPartitionValueTypes() {
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

    for (const partitionValue of testPartitionValues) {
      const app = new Realm.App(appConfig);

      const user = await app.logIn(Realm.Credentials.anonymous());

      const config = getSyncConfiguration(user, partitionValue);
      // Note: We do not test with Realm.open() as we do not care about server errors (these tests MUST fail before hitting the server).
      TestCase.assertThrows(() => new Realm(config));
    }
  },

  testSessionStopPolicyImmediately() {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    const realmPartition = Utils.genPartition();

    return app.logIn(credentials).then((user) => {
      // Check valid input
      var config = getSyncConfiguration(user, realmPartition);
      config.sync._sessionStopPolicy = "immediately";

      {
        TestCase.assertFalse(Realm.App.Sync._hasExistingSessions(app));
        const realm = new Realm(config);
        const session = realm.syncSession;
        TestCase.assertTrue(Realm.App.Sync._hasExistingSessions(app));
        realm.close();
      }
      TestCase.assertFalse(Realm.App.Sync._hasExistingSessions(app));
    });
  },

  testDeleteModelThrowsWhenSync() {
    if (!platformSupported) {
      return;
    }

    let app = new Realm.App(appConfig);
    const realmPartition = Utils.genPartition();
    return app
      .logIn(Realm.Credentials.anonymous())
      .then((u) => {
        const config = getSyncConfiguration(u, realmPartition);
        return Realm.open(config);
      })
      .then((realm) => {
        realm.write(() => {
          TestCase.assertThrows(() => {
            realm.deleteModel(schemas.Dog.name);
          });
        });
        realm.close();
      });
  },

  /*
    Test the functionality of the writeCopyTo() operation on synced realms.
  */
  testSyncWriteCopyTo: async function () {
    let app = new Realm.App(appConfig);
    const credentials1 = await Utils.getRegisteredEmailPassCredentials(app);
    const credentials2 = await Utils.getRegisteredEmailPassCredentials(app);
    const credentials3 = await Utils.getRegisteredEmailPassCredentials(app);
    const partition = Utils.genPartition();

    /*
      Test 1:  check whether calls to `writeCopyTo` are allowed at the right times
    */
    let user1 = await app.logIn(credentials1);
    const config1 = {
      sync: {
        user: user1,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.PersonForSync, schemas.DogForSync],
    };
    const realm1 = await Realm.open(config1);
    const realm1Path = realm1.path;

    realm1.write(() => {
      for (let i = 0; i < 25; i++) {
        realm1.create("Person", {
          _id: new ObjectId(),
          age: i,
          firstName: "John",
          lastName: "Smith",
        });
      }
    });

    await realm1.syncSession.uploadAllLocalChanges();
    await realm1.syncSession.downloadAllServerChanges();

    const outputConfig1 = {
      schema: [schemas.PersonForSync, schemas.DogForSync],
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
          _id: new ObjectId(),
          age: i,
          firstName: "John",
          lastName: "Smith",
        });
      }
    });

    // Log user back in to attempt to copy synced changes
    user1 = await app.logIn(credentials1);
    const realm2Path = `${realm1Path}copy2.realm`;
    const outputConfig2 = {
      sync: {
        user: user1,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.PersonForSync, schemas.DogForSync],
      path: realm2Path,
    };

    // we haven't uploaded our recent changes -- we're not allowed to copy
    TestCase.assertThrowsContaining(() => {
      realm1.writeCopyTo(outputConfig2);
    }, "Could not write file as not all client changes are integrated in server");

    // log back in and upload the changes we made locally
    user1 = await app.logIn(credentials1);
    await realm1.syncSession.uploadAllLocalChanges();

    // create copy no. 2 of the realm
    realm1.writeCopyTo(outputConfig2);

    /*
      Test 2:  check that a copied realm can be opened by another user, and that
        the contents of the original realm and the copy are as expected
    */
    // log in a new user, open the realm copy we created just above
    const user2 = await app.logIn(credentials2);
    const config2 = {
      sync: {
        user: user2,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.PersonForSync, schemas.DogForSync],
      path: realm2Path,
    };

    const realm2 = await Realm.open(config2);

    let realm1Persons = realm1.objects("Person");
    let realm2Persons = realm2.objects("Person");
    TestCase.assertEqual(
      // the contents of the two realm should be the same
      realm1Persons.length,
      realm2Persons.length,
      "The same number of people should be in the two realms",
    );

    // add another 25 people locally to the original realm
    realm1.syncSession.pause();
    realm1.write(() => {
      for (let i = 0; i < 25; i++) {
        realm1.create("Person", {
          _id: new ObjectId(),
          age: i,
          firstName: "John",
          lastName: "Smith",
        });
      }
    });

    realm1Persons = realm1.objects("Person");
    realm2Persons = realm2.objects("Person");
    TestCase.assertTrue(
      // realm1 and realm2 should no longer be the same
      realm1Persons.length == realm2Persons.length + 25,
      "realm1 should have an additional 25 people",
    );
    realm1.syncSession.resume();

    await realm1.syncSession.uploadAllLocalChanges();
    await realm1.syncSession.downloadAllServerChanges();

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

    const user3 = await app.logIn(credentials3);
    const otherPartition = Utils.genPartition();
    const config3 = {
      sync: {
        user: user3,
        partitionValue: otherPartition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
        clientReset: {
          mode: "manual",
          onManual: () => console.log("error"),
        },
      },
      schema: [schemas.PersonForSync, schemas.DogForSync],
      path: realm3Path,
    };

    let realm3;
    await TestCase.assertThrowsAsyncContaining(async () => {
      realm3 = await Realm.open(config3);
    }, "Bad server version");

    TestCase.assertUndefined(realm3);

    realm1.close();
  },

  /*
     Test that we can convert realms between synced and non-synced, encrypted
     and non-encrypted instances.
     Note:  conversion tests from the `testWriteCopyTo.*` tests should be moved
     here when we clean up the test suite
  */
  testRealmConversions: async function () {
    const appConfig = AppConfig.integrationAppConfig;
    let app = new Realm.App(appConfig);
    let credentials = await Utils.getRegisteredEmailPassCredentials(app); //anonymous();
    let credentials2 = await Utils.getRegisteredEmailPassCredentials(app); //anonymous();
    let user = await app.logIn(credentials);

    /*
      Tests matrix:
        1)   local, unencrypted Realm -> local, unencrypted Realm
        2)   local, unencrypted Realm -> local, encrypted
        3)   local, encrypted Realm -> local, encrypted Realm
        4)   local, encrypted Realm -> local, unencrypted Realm

        5)   local, unencrypted Realm -> synced, unencrypted Realm
        6)   local, unencrypted Realm -> synced, encrypted
        7)   local, encrypted Realm -> synced, encrypted Realm
        8)   local, encrypted Realm -> synced, unencrypted Realm

        9)   synced, unencrypted Realm -> local, unencrypted Realm
        10)  synced, unencrypted Realm -> local, encrypted Realm
        11)  synced, encrypted Realm -> local, unencrypted Realm
        12)  synced, encrypted Realm -> local, encrypted Realm

        13)  synced, unencrypted Realm -> synced, unencrypted Realm
        14)  synced, unencrypted Realm -> synced, encrypted Realm
        15)  synced, encrypted Realm -> synced, unencrypted Relam
        16)  synced, encrypted Realm -> synced, encrypted Realm
    */

    const sourceLocation = ["local", "synced"];
    const destinationLocation = ["local", "synced"];
    const sourceEncryption = ["plain", "encrypted"];
    const destinationEncryption = ["plain", "encrypted"];

    var encryptionKey1 = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey1[i] = 1;
    }
    var encryptionKey2 = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey2[i] = 2;
    }

    // local realm that we will put a few dogs into
    const configLocal = {
      schema: [schemas.PersonForSync, schemas.DogForSync],
      path: "dogsLocal.realm",
    };

    // local, encrypted, realm that we will put a few dogs into
    const configLocalEnc = {
      schema: [schemas.PersonForSync, schemas.DogForSync],
      encryptionKey: encryptionKey1,
      path: "dogsLocalEnc.realm",
    };

    // shim config for the synced realms
    const configSync = {
      sync: {
        // TODO: export_to doesn't fail is there's no user..?
        user,
        partitionValue: "foo",
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.DogForSync],
      path: "dogsSynced.realm",
    };

    // shim config for the synced realms
    const configSyncEnc = {
      sync: {
        // TODO: export_to doesn't fail is there's no user..?
        // TODO:  Realm.open() fails after export_to() of synced -> local
        user,
        partitionValue: "foo",
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.DogForSync],
      encryptionKey: encryptionKey2,
      path: "dogsSyncedEnc.realm",
    };

    // create five dogs in our local realm
    const realmLocal = await Realm.open(configLocalEnc);
    realmLocal.write(() => {
      for (let i = 0; i < 5; i++) {
        realmLocal.create("Dog", {
          _id: new ObjectId(),
          breed: "Domestic Short Hair",
          name: `Brutus no. ${i}`,
          realm_id: "foo",
        });
      }
    });
    realmLocal.close();

    // create five dogs in our local realm
    const realmLocalEnc = await Realm.open(configLocal);
    realmLocalEnc.write(() => {
      for (let i = 0; i < 5; i++) {
        realmLocalEnc.create("Dog", {
          _id: new ObjectId(),
          breed: "Domestic Short Hair",
          name: `..Encrypted.. no. ${i}`,
          realm_id: "foo",
        });
      }
    });
    realmLocalEnc.close();

    const configSyncedDogs = configSync;
    configSyncedDogs.path = "dummy.realm";
    configSyncedDogs.sync.user = user;

    // create five dogs in our synced realm
    const realmSynced = await Realm.open(configSyncedDogs);
    realmSynced.write(() => {
      for (let i = 0; i < 5; i++) {
        realmSynced.create("Dog", {
          _id: new ObjectId(),
          breed: "Fancy Long Hair",
          name: `Darletta no. ${i}`,
          realm_id: "foo",
        });
      }
    });
    realmSynced.close();

    await user.logOut();

    // FIXME:
    // The test loops below should be refactored when moving to integration tests.
    // Multiple tests should be generated instead of looping over the test combinations
    // (see https://mochajs.org/#dynamically-generating-tests)
    let testNo = 1;
    for (const source of sourceLocation) {
      for (const destination of destinationLocation) {
        for (const srcEncryption of sourceEncryption) {
          for (const dstEncryption of destinationEncryption) {
            const configSrc = Object.assign(
              {},
              source == "local"
                ? srcEncryption == "plain"
                  ? configLocal
                  : configLocalEnc
                : srcEncryption == "plain"
                ? configSync
                : configSyncEnc,
            );
            const configDst = Object.assign(
              {},
              destination == "local"
                ? dstEncryption == "plain"
                  ? configLocal
                  : configLocalEnc
                : dstEncryption == "plain"
                ? configSync
                : configSyncEnc,
            );

            if (source == "synced") {
              configSrc.sync.user = await app.logIn(credentials);
            }
            if (destination == "synced") {
              configDst.sync.user = source == "synced" ? configSrc.sync.user : await app.logIn(credentials2);
            }

            console.log(`\nTest ${testNo})  ${source}, ${srcEncryption}  -> ${destination}, ${dstEncryption}...\n`);

            configDst.path += `_test_${testNo}.realm`;

            if (srcEncryption == "encrypted") {
              configSrc.encryptionKey = encryptionKey1;
            }
            if (dstEncryption == "encrypted") {
              configDst.encryptionKey = encryptionKey2;
            }

            const realmSrc = await Realm.open(configSrc);
            if (source == "synced") {
              await realmSrc.syncSession.uploadAllLocalChanges();
              await realmSrc.syncSession.downloadAllServerChanges();
            }
            realmSrc.writeCopyTo(configDst);
            realmSrc.close();

            const realmDst = await Realm.open(configDst);
            if (destination == "synced") {
              TestCase.assertDefined(realmDst.syncSession);
              await realmDst.syncSession.downloadAllServerChanges();
              await realmDst.syncSession.uploadAllLocalChanges();
            }
            realmDst.close();

            if (source == "synced") {
              await configSrc.sync.user.logOut();
            }
            if (destination == "synced") {
              await configDst.sync.user.logOut();
            }
            Realm.deleteFile(configDst);

            testNo++;
          }
        }
      }
    }
  },

  /*
    Test that all the exceptions from the C++ codebase are thrown at the
    right times
  */
  testRealmConversionFailures: async function () {
    // simple local realm
    const configLocal = {
      schema: [schemas.PersonForSync, schemas.DogForSync],
      path: "dogsLocal.realm",
    };

    // user for flexible sync test
    let app = new Realm.App(appConfig);
    const credentials = await Utils.getRegisteredEmailPassCredentials(app);
    let user = await app.logIn(credentials);

    /*
     *  Test 1:  check that `writeCopyTo` verifies parameter count and types
     */
    const realm = await Realm.open(configLocal);
    TestCase.assertThrowsContaining(() => {
      // too many arguments
      realm.writeCopyTo("path", "encryptionKey", "invalidParameter");
    }, "Invalid arguments: at most 1 expected, but 3 supplied.");
    TestCase.assertThrowsContaining(() => {
      // too few arguments
      realm.writeCopyTo();
    }, "Expected a config object");
    TestCase.assertThrowsContaining(() => {
      // wrong argument type
      realm.writeCopyTo(null);
    }, "`config` parameter must be an object");
    TestCase.assertThrowsContaining(() => {
      // missing `path` property
      realm.writeCopyTo({});
    }, "`path` property must exist in output configuration");
    TestCase.assertThrowsContaining(() => {
      // wrong `path` property type
      realm.writeCopyTo({ path: 12345 });
    }, "`path` property must be a string");
    TestCase.assertThrowsContaining(() => {
      // wrong `encryptionKey` property type
      realm.writeCopyTo({ path: "outputPath", encryptionKey: "notBinary" });
    }, "'encryptionKey' property must be an ArrayBuffer or ArrayBufferView");
    TestCase.assertThrowsContaining(() => {
      // wrong `sync` property type
      realm.writeCopyTo({ path: "outputPath", sync: "invalidProperty" });
    }, "'sync' property must be an object");
    TestCase.assertThrowsContaining(() => {
      realm.writeCopyTo({ path: "output", sync: { flexible: true, user } });
    }, "Realm cannot be converted if flexible sync is enabled");
    /*
     *  Test 2:  check that `writeCopyTo` can only be called at the right time
     */
    realm.write(() => {
      TestCase.assertThrowsContaining(() => {
        realm.writeCopyTo({ path: "outputPath", sync: "invalidProperty" });
      }, "Can only convert Realms outside a transaction");
    });

    realm.close();
  },

  /*
    Test that we can create encrypted copies of a realm, and that only the
    correct encryption key will allow us to re-open that copy
  */
  testSyncWriteCopyToEncrypted: async function () {
    let app = new Realm.App(appConfig);
    const credentials1 = await Utils.getRegisteredEmailPassCredentials(app);
    const credentials2 = await Utils.getRegisteredEmailPassCredentials(app);
    const partition = Utils.genPartition();

    /*
      Test 1:  assert that we can create an encrypted copy of a realm and
        re-open it with a valid key
    */
    let user1 = await app.logIn(credentials1);
    const config1 = {
      sync: {
        user: user1,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      schema: [schemas.PersonForSync, schemas.DogForSync],
    };

    const realm1 = await Realm.open(config1);
    realm1.write(() => {
      for (let i = 0; i < 25; i++) {
        realm1.create("Person", {
          _id: new ObjectId(),
          age: i,
          firstName: "John",
          lastName: "Smith",
        });
      }
    });

    // sync changes
    await realm1.syncSession.uploadAllLocalChanges();
    await realm1.syncSession.downloadAllServerChanges();
    realm1.syncSession.pause();

    // create encrypted copy
    const encryptedCopyName = realm1.path + ".copy-encrypted.realm";
    var encryptionKey = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey[i] = 1;
    }

    const outputConfig1 = { ...config1, path: encryptedCopyName, encryptionKey: encryptionKey };
    realm1.writeCopyTo(outputConfig1);
    await user1.logOut();

    const user2 = await app.logIn(credentials2);
    let encryptedCopyConfig = {
      sync: {
        user: user2,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      path: encryptedCopyName,
      encryptionKey: encryptionKey,
      schema: [schemas.PersonForSync, schemas.DogForSync],
    };

    let encryptedRealmCopy = new Realm(encryptedCopyConfig);
    TestCase.assertEqual(25, encryptedRealmCopy.objects("Person").length);
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
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      path: encryptedCopyName,
      encryptionKey: encryptionKey,
      schema: [schemas.PersonForSync, schemas.DogForSync],
    };

    encryptedRealmCopy = undefined;
    TestCase.assertThrows(() => {
      encryptedRealmCopy = new Realm(encryptedCopyConfig);
    }, "Opening realm with wrong encryption key should fail");
    TestCase.assertUndefined(encryptedRealmCopy);

    /*
      Test 3:  check that we cannot open an encrypted realm copy without
        using an encryption key
    */
    encryptedCopyConfig = {
      sync: {
        user: user2,
        partitionValue: partition,
        _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
      },
      path: encryptedCopyName,
      schema: [schemas.PersonForSync, schemas.DogForSync],
    };

    encryptedRealmCopy = undefined;
    TestCase.assertThrows(() => {
      encryptedRealmCopy = new Realm(encryptedCopyConfig);
    }, "Opening realm without encryption key should fail");
    TestCase.assertUndefined(encryptedRealmCopy);

    realm1.close();
  },
};
