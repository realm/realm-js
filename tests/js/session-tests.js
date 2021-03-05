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

'use strict';

/* global REALM_MODULE_PATH */

// Run these tests with the `DEBUG=tests:session` environment variable set to get the stdout of sub-processes.

const debug = require('debug')('tests:session');
const Realm = require('realm');
const { ObjectId } = Realm.BSON;

const TestCase = require('./asserts');
const Utils = require('./test-utils');
let schemas = require('./schemas');
const AppConfig = require('./support/testConfig');

const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isElectronProcess = typeof process === 'object' && process.versions && process.versions.electron;

const platformSupported = isNodeProcess && !isElectronProcess;

const require_method = require;
function node_require(module) {
    return require_method(module);
}

let fetch;
if (isNodeProcess) {
    fetch = node_require('node-fetch');
}

let tmp;
let fs;
let execFile;
let path;
if (isNodeProcess) {
    tmp = node_require('tmp');
    fs = node_require('fs');
    execFile = node_require('child_process').execFile;
    tmp.setGracefulCleanup();
    path = node_require("path");
}

let appConfig = AppConfig.integrationAppConfig;

function getSyncConfiguration(user, partition) {
    const realmConfig = {
        schema: [{
            name: 'Dog',
            primaryKey: '_id',
            properties: {
                _id: 'objectId?',
                breed: 'string?',
                name: 'string',
                realm_id: 'string?',
            }
        }],
        sync: {
            user: user,
            partitionValue: partition
        }
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
    debug(`runOutOfProcess : ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        try {
            execFile(process.execPath, args, { cwd: tmpDir.name }, (error, stdout, stderr) => {
                if (error) {
                    console.error("runOutOfProcess failed\n", error, stdout, stderr);
                    reject(new Error(`Running ${args[0]} failed. error: ${error}`));
                    return;
                }

                debug('runOutOfProcess success\n' + stdout);
                resolve();
            });
        }
        catch (e) {
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
        setTimeout(() => { reject('Connection state notification timed out'); }, 10000);
    });
}

function unexpectedError(e) {
    function printObject(o) {
        var out = '';
        for (var p in o) {
            out += p + ': ' + o[p] + '\n';
        }
        return out;
    }

    return `Failed with unexpected error ${e}: ${printObject(e)}`;
}

module.exports = {
    testLocalRealmHasNoSession() {
        let realm = new Realm();
        TestCase.assertNull(realm.syncSession);
    },

    testRealmOpen() {
        if (!isNodeProcess) {
            return;
        }

        const partition = Utils.genPartition();
        const expectedObjectsCount = 3;

        let user, config;
        let credentials = Realm.Credentials.anonymous();
        let app = new Realm.App(appConfig);
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, partition, REALM_MODULE_PATH)
            .then(() => { return app.logIn(credentials) })
            .then(u => {
                user = u;
                config = getSyncConfiguration(u, partition);
                return Realm.open(config)
            }).then(realm => {
                let actualObjectsCount = realm.objects('Dog').length;
                TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");

                const session = realm.syncSession;
                TestCase.assertInstanceOf(session, Realm.App.Sync.Session);
                TestCase.assertEqual(session.user.id, user.id);
                TestCase.assertEqual(session.config.url, config.sync.url);
                TestCase.assertEqual(session.config.partitionValue, config.sync.partitionValue);
                TestCase.assertEqual(session.config.user.id, config.sync.user.id);
                TestCase.assertEqual(session.state, 'active');
                return user.logOut();
            });
    },

    async testRealmOpenWithDestructiveSchemaUpdate() {
        if (!isNodeProcess) {
            return;
        }

        const partition = Utils.genPartition();

        await runOutOfProcess(__dirname + "/download-api-helper.js", appConfig.id, appConfig.url, partition, REALM_MODULE_PATH);

        const app = new Realm.App(appConfig);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const config = getSyncConfiguration(user, partition);

        const realm = await Realm.open(config)
        realm.close();

        // change the 'breed' property from 'string?' to 'string' to trigger a non-additive-only error.
        config.schema[0].properties.breed = "string";

        await TestCase.assertThrowsAsyncContaining(
            async() => await Realm.open(config), // This crashed in bug #3414.
            "The following changes cannot be made in additive-only schema mode:");
    },

    testRealmOpenWithExistingLocalRealm() {
        if (!platformSupported) {
            return;
        }

        const partition = Utils.genPartition();
        const expectedObjectsCount = 3;

        let user, config;
        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, partition, REALM_MODULE_PATH)
            .then(() => app.logIn(credentials))
            .then(u => {
                user = u;
                config = getSyncConfiguration(user, partition);
                config.schemaVersion = 1;

                // Open the Realm with a schema version of 1, then immediately close it.
                // This verifies that Realm.open doesn't hit issues when the schema version
                // of an existing, local Realm is different than the one passed in the configuration.
                let realm = new Realm(config);
                realm.close();

                config.schemaVersion = 2;
                return Realm.open(config)
            }).then(realm => {
                let actualObjectsCount = realm.objects('Dog').length;
                TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");

                const session = realm.syncSession;
                TestCase.assertInstanceOf(session, Realm.App.Sync.Session);
                TestCase.assertEqual(session.user.id, user.id);
                TestCase.assertEqual(session.config.url, config.sync.url);
                TestCase.assertEqual(session.config.user.id, config.sync.user.id);
                TestCase.assertEqual(session.state, 'active');
                realm.close()
            });
    },

    testRealmOpenLocalRealm() {
        const expectedObjectsCount = 3;

        let config = {
            schema: [{ name: 'Dog', properties: { name: 'string' } }],
        };

        return Realm.open(config).then(realm => {
            realm.write(() => {
                for (let i = 1; i <= 3; i++) {
                    realm.create('Dog', { name: `Lassy ${i}` });
                }
            });

            let actualObjectsCount = realm.objects('Dog').length;
            TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Local realm does not contain the expected objects count");
            realm.close()
        });
    },

    testErrorHandling() {
        let app = new Realm.App(appConfig);
        const partition = Utils.genPartition();
        const credentials = Realm.Credentials.anonymous();
        return app.logIn(credentials).then(user => {
            return new Promise((resolve, _reject) => {
                const config = getSyncConfiguration(user, partition);
                config.sync.error = (_, error) => {
                    try {
                        TestCase.assertEqual(error.message, 'simulated error');
                        TestCase.assertEqual(error.code, 123);
                        resolve();
                    }
                    catch (e) {
                        _reject(e);
                    }
                };
                const realm = new Realm(config);
                const session = realm.syncSession;

                TestCase.assertEqual(session.config.error, config.sync.error);
                session._simulateError(123, 'simulated error');
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
        return runOutOfProcess(__dirname + '/nested-list-helper.js', appConfig.id, appConfig.url, partition, REALM_MODULE_PATH)
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

    testProgressNotificationsUnregisterForRealmConstructor() {
        if (!platformSupported) {
            return;
        }

        const partition = Utils.genPartition();

        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, partition, REALM_MODULE_PATH)
            .then(() => app.logIn(credentials))
            .then(user => {
                let config = getSyncConfiguration(user, partition);

                let realm = new Realm(config);
                let unregisterFunc;

                let writeDataFunc = () => {
                    realm.write(() => {
                        for (let i = 1; i <= 3; i++) {
                            realm.create('Dog', { _id: new ObjectId(), name: `Lassy ${i}` });
                        }
                    });
                }

                return new Promise((resolve, reject) => {
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
                            realm.syncSession.addProgressNotification('upload', 'reportIndefinitely', (transferred, transferable) => {
                                if (transferred === transferable) {
                                    resolve();
                                }
                            });
                            writeDataFunc();
                        }
                    };

                    realm.syncSession.addProgressNotification('upload', 'reportIndefinitely', progressCallback);

                    unregisterFunc = () => {
                        realm.syncSession.removeProgressNotification(progressCallback);
                    };

                    writeDataFunc();
                });
            });
    },

    testProgressNotificationsForRealmOpen() {
        if (!platformSupported) {
            return;
        }

        const partition = Utils.genPartition();
        let progressCalled = false;

        const credentials = Realm.Credentials.anonymous();
        let app = new Realm.App(appConfig);
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, partition, REALM_MODULE_PATH)
            .then(() => { return app.logIn(credentials) })
            .then(user => {
                let config = getSyncConfiguration(user, partition);

                return Promise.race([
                    Realm.open(config).progress((transferred, total) => { progressCalled = true; }),
                    new Promise((_, reject) => setTimeout(() => reject("Progress Notifications API failed to call progress callback for Realm constructor"), 5000))
                ]);
            }).then(() => TestCase.assertTrue(progressCalled));
    },

    testClientReset() {
        // FIXME: try to enable for React Native
        if (!platformSupported) {
            return;
        }

        const partition = Utils.genPartition();
        let creds = Realm.Credentials.anonymous();
        let app = new Realm.App(appConfig);
        return app.logIn(creds).then(user => {
            return new Promise((resolve, _reject) => {
                let realm;
                const config = getSyncConfiguration(user, partition);
                config.sync.error = (sender, error) => {
                    try {
                        TestCase.assertEqual(error.name, 'ClientReset');
                        TestCase.assertDefined(error.config);
                        TestCase.assertNotEqual(error.config.path, '');
                        const path = realm.path;
                        realm.close();
                        Realm.App.Sync.initiateClientReset(app, path);
                        // open Realm with error.config, and copy required objects a Realm at `path`
                        resolve();
                    }
                    catch (e) {
                        _reject(e);
                    }
                };
                realm = new Realm(config);
                const session = realm.syncSession;

                TestCase.assertEqual(session.config.error, config.sync.error);
                session._simulateError(211, 'ClientReset'); // 211 -> divering histories
            });
        });
    },

    testAddConnectionNotification() {
        const partition = Utils.genPartition();
        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return app.logIn(credentials).then((u) => {
            let config = getSyncConfiguration(u, partition);
            return Realm.open(config);
        }).then(realm => {
            return new Promise((resolve, reject) => {
                realm.syncSession.addConnectionNotification((newState, oldState) => {
                    if (oldState === Realm.App.Sync.ConnectionState.Connected && newState === Realm.App.Sync.ConnectionState.Disconnected) {
                        resolve();
                    }
                });
                realm.close();
            });
        });
    },

    testRemoveConnectionNotification() {
        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        const partition = Utils.genPartition();
        return app.logIn(credentials).then((u) => {
            let config = getSyncConfiguration(u, partition);
            return Realm.open(config);
        }).then(realm => {
            return new Promise((resolve, reject) => {
                let callback1 = () => {
                    reject("Should not be called");
                };
                let callback2 = (newState, oldState) => {
                    if (oldState === Realm.App.Sync.ConnectionState.Connected && newState === Realm.App.Sync.ConnectionState.Disconnected) {
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
        return app.logIn(credentials).then((u) => {
            let config = getSyncConfiguration(u, partition);
            return Realm.open(config);
        }).then(realm => {
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
                setTimeout(() => { reject('timeout') }, 10000);
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
        return app.logIn(credentials)
            .then((user1) => {
                const config1 = getSyncConfiguration(user1, realmPartition);
                return Realm.open(config1);
            })
            .then((realm1) => {
                realm1.write(() => {
                    realm1.create('Dog', { _id: new ObjectId(), name: `Lassy` });
                });
                return realm1.syncSession.uploadAllLocalChanges(1000);
            })
            .then(() => {
                return app.logIn(Realm.Credentials.anonymous());
            })
            .then((user2) => {
                const config2 = getSyncConfiguration(user2, realmPartition);
                return Realm.open(config2).then(r => {
                    realm2 = r;
                    return realm2.syncSession.downloadAllServerChanges();
                });
            })
            .then(() => {
                TestCase.assertEqual(1, realm2.objects('Dog').length);
            });
    },

    testDownloadAllServerChangesTimeout() {
        if (!platformSupported) {
            return;
        }

        let app = new Realm.App(appConfig);
        const realmPartition = Utils.genPartition();
        let realm;
        return app.logIn(Realm.Credentials.anonymous())
            .then(user => {
                const config = getSyncConfiguration(user, realmPartition);
                realm = new Realm(config);
                return realm.syncSession.downloadAllServerChanges(1);
            }).then(() => { throw new Error('Download did not time out'); }, (e) => {
                TestCase.assertEqual(e, 'Downloading changes did not complete in 1 ms.');
                return realm.syncSession.downloadAllServerChanges();
            });
    },

    testUploadAllLocalChangesTimeout() {
        if (!platformSupported) {
            return;
        }

        let realm;
        let app = new Realm.App(appConfig);
        const realmPartition = Utils.genPartition();
        return app.logIn(Realm.Credentials.anonymous())
            .then(user => {
                const config = getSyncConfiguration(user, realmPartition);
                realm = new Realm(config);
                return realm.syncSession.uploadAllLocalChanges(1);
            }).then(() => { throw new Error('Upload did not time out'); }, (e) => {
                TestCase.assertEqual(e, 'Uploading changes did not complete in 1 ms.');
                return realm.syncSession.uploadAllLocalChanges();
            });
    },

    testReconnect() {
        let app = new Realm.App(appConfig);
        let credentials = Realm.Credentials.anonymous();
        const realmPartition = Utils.genPartition();
        return app.logIn(credentials).then(user => {
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
        return app.logIn(credentials).then(user => {
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

        return app.logIn(credentials)
            .then((user) => {
                // Check valid input
                let config1 = getSyncConfiguration(user, realmPartition);
                config1.sync._sessionStopPolicy = 'after-upload';

                new Realm(config1).close();

                const config2 = config1;
                config2.sync._sessionStopPolicy = 'immediately';
                new Realm(config2).close();

                const config3 = config1;
                config3.sync._sessionStopPolicy = 'never';
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
            new ObjectId(),
            null
        ];

        for (const partitionValue of testPartitionValues) {
            console.log('>partitionValue', partitionValue)
            const app = new Realm.App(appConfig);

            const user = await app.logIn(Realm.Credentials.anonymous())

            const config = getSyncConfiguration(user, partitionValue);
            TestCase.assertEqual(partitionValue, config.sync.partitionValue);

            const realm = new Realm(config);
            TestCase.assertDefined(realm);

            const spv = realm.syncSession.config.partitionValue;

            // BSON types have their own 'equals' comparer
            if (spv instanceof ObjectId) {
                TestCase.assertTrue(spv.equals(partitionValue));
            } else {
                TestCase.assertEqual(spv, partitionValue);
            }

            realm.close();
        }
    },

    async testNonAcceptedPartitionValueTypes() {
        const testPartitionValues = [
            undefined,
            "",
            Number.MAX_SAFE_INTEGER + 1,
            1.2,
            0.0000000000000001,
            -0.0000000000000001,
            -1.3,
            -Number.MAX_SAFE_INTEGER - 1
        ];

        for (const partitionValue of testPartitionValues) {
            const app = new Realm.App(appConfig);

            const user = await app.logIn(Realm.Credentials.anonymous())

            const config = getSyncConfiguration(user, partitionValue);
            TestCase.assertThrows(() => new Realm(config));
        }
    },

    testSessionStopPolicyImmediately() {
        let app = new Realm.App(appConfig);
        let credentials = Realm.Credentials.anonymous();
        const realmPartition = Utils.genPartition();

        return app.logIn(credentials)
            .then((user) => {
                // Check valid input
                var config = getSyncConfiguration(user, realmPartition);
                config.sync._sessionStopPolicy = "immediately"

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
        return app.logIn(Realm.Credentials.anonymous()).then((u) => {
            const config = getSyncConfiguration(u, realmPartition);
            return Realm.open(config);
        }).then(realm => {
            realm.write(() => {
                TestCase.assertThrows(() => { realm.deleteModel(schemas.Dog.name); });
            });
            realm.close();
        });
    },

    async testAnalyticsSubmission() {
        const context = node_require('realm/package.json');
        const analytics = node_require('realm/lib/submit-analytics');

        const payload = await analytics.fetchPlatformData(context, 'TestEvent');

        TestCase.assertDefined(payload.webHook);
        TestCase.assertType(payload.webHook.event, 'string');
        TestCase.assertDefined(payload.webHook.properties);
        TestCase.assertType(payload.webHook.properties.Binding, 'string');
        TestCase.assertDefined(payload.mixPanel);
        TestCase.assertType(payload.mixPanel.event, 'string');
        TestCase.assertDefined(payload.mixPanel.properties);
        TestCase.assertType(payload.mixPanel.properties.Binding, 'string');

        await analytics.submitStageAnalytics('TestEvent');
    }
};
