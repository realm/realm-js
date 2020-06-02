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

const TestCase = require('./asserts');
const Utils = require('./test-utils');
let schemas = require('./schemas');
const ObjectId = require('bson').ObjectID;
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

function getSyncConfiguration(user) {
    const realmConfig = {
        schema: [{
            name: 'Dog',
            primaryKey: '_id',
            properties: {
              _id: 'object id?',
              breed: 'string?',
              name: 'string',
              realm_id: 'string?',
            }
          }],
        sync: {
            user: user,
            partitionValue: '"LoLo"'
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
        return TestCase.assertNull(realm.syncSession);
    },

    testRealmOpen() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        let user, config;

        let app = new Realm.App(appConfig);
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, realmName, REALM_MODULE_PATH)
            .then(() => { return app.logIn(Realm.Credentials.anonymous()) })
            .then(u => {
                user = u;
                config = getSyncConfiguration(u);
                return Realm.open(config)
            }).then(realm => {
                let actualObjectsCount = realm.objects('Dog').length;
                TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");

                const session = realm.syncSession;
                TestCase.assertInstanceOf(session, Realm.Sync.Session);
                TestCase.assertEqual(session.user.identity, user.identity);
                TestCase.assertEqual(session.config.url, config.sync.url);
                TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                TestCase.assertEqual(session.state, 'active');
                user.logOut();
            });
    },

    testRealmOpenWithExistingLocalRealm() {
        if (!platformSupported) {
            return;
        }

        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        let user, config;
        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, realmName, REALM_MODULE_PATH)
            .then(() => app.logIn(credentials))
            .then(u => {
                user = u;
                config = getSyncConfiguration(user);
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
                TestCase.assertInstanceOf(session, Realm.Sync.Session);
                TestCase.assertEqual(session.user.identity, user.identity);
                TestCase.assertEqual(session.config.url, config.sync.url);
                TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                TestCase.assertEqual(session.state, 'active');
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
        });
    },

    testErrorHandling() {
        let app = new Realm.App(appConfig);
        return app.logIn(Realm.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                const config = getSyncConfiguration(user);
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

    testListNestedSync() {
        if (!platformSupported) {
            return;
        }

        const realmName = Utils.uuid();
        return runOutOfProcess(__dirname + '/nested-list-helper.js', appConfig.id, appConfig.url, realmName, REALM_MODULE_PATH)
            .then(() => {
                let app = new Realm.App(appConfig);
                const credentials = Realm.Credentials.anonymous();
                return app.logIn(credentials)
            })
            .then(user => {
                let config = {
                    // FIXME: schema not working yet
                    schema: [schemas.ParentObject, schemas.NameObject],
                    sync: { user, partitionValue: '"LoLo"' }
                };
                Realm.deleteFile(config);
                return Realm.open(config)
            }).then(realm => {
                let objects = realm.objects('ParentObject');

                let json = JSON.stringify(objects);
                TestCase.assertEqual(json, '{"0":{"id":1,"name":{"0":{"family":"Larsen","given":{"0":"Hans","1":"Jørgen"},"prefix":{}},"1":{"family":"Hansen","given":{"0":"Ib"},"prefix":{}}}},"1":{"id":2,"name":{"0":{"family":"Petersen","given":{"0":"Gurli","1":"Margrete"},"prefix":{}}}}}');
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
    },

    testProgressNotificationsUnregisterForRealmConstructor() {
        if (!platformSupported) {
            return;
        }

        const realmName = Utils.uuid();

        let app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, realmName, REALM_MODULE_PATH)
            .then(() => app.logIn(credentials))
            .then(user => {
                let config = getSyncConfiguration(user);

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

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        let progressCalled = false;

        const credentials = Realm.Credentials.anonymous();
        let app = new Realm.App(appConfig);
        return runOutOfProcess(__dirname + '/download-api-helper.js', appConfig.id, appConfig.url, REALM_MODULE_PATH)
            .then(() => { return app.logIn(credentials)})
            .then(user => {
                let config = getSyncConfiguration(user);

                return Promise.race([
                    Realm.open(config).progress((transferred, total) => { progressCalled = true; }),
                    new Promise((_, reject) => setTimeout(() => reject("Progress Notifications API failed to call progress callback for Realm constructor"), 5000))
                ]);
            }).then(() => TestCase.assertTrue(progressCalled));
    },

    testInvalidArugmentsToAutomaticSyncConfiguration() {
        TestCase.assertThrows(() => Realm.automaticSyncConfiguration('foo', 'bar')); // too many arguments
    },

    testClientReset() {
        // FIXME: try to enable for React Native
        if (!platformSupported) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                var realm;
                const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
                config.sync.clientResyncMode = 'manual';
                config.sync.error = (sender, error) => {
                    try {
                        TestCase.assertEqual(error.name, 'ClientReset');
                        TestCase.assertDefined(error.config);
                        TestCase.assertNotEqual(error.config.path, '');
                        const path = realm.path;
                        realm.close();
                        Realm.Sync.initiateClientReset(path);
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

    testClientResyncMode() {
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Discard, 'discard');
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Manual, 'manual');
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Recover, 'recover');
    },

    testClientResyncIncorrectMode() {
        // FIXME: try to enable for React Native
        if (!platformSupported) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, reject) => {
                var realm;
                const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
                config.sync.clientResyncMode = 'foobar'; // incorrect mode
                try {
                    new Realm(config);
                    reject('Should have failed if incorrect resync mode.');
                }
                catch (e) {
                    resolve();
                }
            });
        });
    },

    async testClientResyncDiscard() {
        // FIXME: try to enable for React Native
        if (!platformSupported) {
            return;
        }
        const fetch = require('node-fetch');

        const realmUrl = 'realm://127.0.0.1:9080/~/myrealm';
        let user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname('admin', true));
        const config1 = user.createConfiguration({ sync: { url: realmUrl } });
        config1.schema = [schemas.IntOnly];
        config1.sync.clientResyncMode = 'discard';
        config1._cache = false;

        // open, download, create an object, upload and close
        let realm1 = await Realm.open(config1);
        await realm1.syncSession.downloadAllServerChanges();
        realm1.write(() => {
            realm1.create(schemas.IntOnly.name, { intCol: 1 });
        });
        await realm1.syncSession.uploadAllLocalChanges();
        realm1.close();

        // delete Realm on server
        let encodedPath = encodeURIComponent(`${user.identity}/myrealm`);
        let url = new URL(`/realms/files/${encodedPath}`, user.server);
        let options = {
            headers: {
                Authorization: `${user.token}`,
                'Content-Type': 'application/json',
            },
            method: 'DELETE',
        };
        await fetch(url.toString(), options);

        // open the Realm again without schema and download
        const config2 = user.createConfiguration({ sync: { url: realmUrl } });
        config2.sync.clientResyncMode = 'discard';
        config2._cache = false;
        let realm2 = await Realm.open(config2);
        await realm2.syncSession.downloadAllServerChanges();
        TestCase.assertEqual(realm2.schema.length, 0);
        realm2.close();
    },

    testAddConnectionNotification() {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                }
            };
            return Realm.open(config);
        }).then(realm => {
            return new Promise((resolve, reject) => {
                realm.syncSession.addConnectionNotification((newState, oldState) => {
                    if (oldState === Realm.Sync.ConnectionState.Connected && newState === Realm.Sync.ConnectionState.Disconnected) {
                        resolve();
                    }
                });
                realm.close();
            });
        });
    },

    testRemoveConnectionNotification() {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                }
            };
            return Realm.open(config);
        }).then(realm => {
            return new Promise((resolve, reject) => {
                let callback1 = () => {
                    reject("Should not be called");
                };
                let callback2 = (newState, oldState) => {
                    if (oldState === Realm.Sync.ConnectionState.Connected && newState === Realm.Sync.ConnectionState.Disconnected) {
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

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                }
            };
            return Realm.open(config);
        }).then(realm => {
            let session = realm.syncSession;
            session.pause();
            TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Disconnected);
            TestCase.assertFalse(session.isConnected());

            return new Promise((resolve, reject) => {
                session.addConnectionNotification((newState, _) => {
                    let state = session.connectionState;
                    let isConnected = session.isConnected();
                    switch (newState) {
                        case Realm.Sync.ConnectionState.Disconnected:
                            TestCase.assertEqual(state, Realm.Sync.ConnectionState.Disconnected);
                            TestCase.assertFalse(isConnected);
                            break;
                        case Realm.Sync.ConnectionState.Connecting:
                            TestCase.assertEqual(state, Realm.Sync.ConnectionState.Connecting);
                            TestCase.assertFalse(isConnected);
                            break;
                        case Realm.Sync.ConnectionState.Connected:
                            TestCase.assertEqual(state, Realm.Sync.ConnectionState.Connected);
                            TestCase.assertTrue(isConnected);
                            break;
                        default:
                            reject(`unknown connection value: ${newState}`);
                    }

                    if (newState === Realm.Sync.ConnectionState.Connected) {
                        resolve();
                    }
                });
                session.resume();
                setTimeout(() => { reject('timeout') }, 10000);
            });
        });
    },

    async testResumePause() {
        const user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
        const config = {
            sync: {
                user: user,
                url: 'realm://127.0.0.1:9080/~/testResumePause',
            }
        };

        const realm = await Realm.open(config);
        const session = realm.syncSession;
        await waitForConnectionState(session, Realm.Sync.ConnectionState.Connected);

        session.pause();
        await waitForConnectionState(session, Realm.Sync.ConnectionState.Disconnected);

        session.resume();
        await waitForConnectionState(session, Realm.Sync.ConnectionState.Connected);
    },

    async testMultipleResumes() {
        const user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
        const config = {
            sync: {
                user: user,
                url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
            }
        };

        const realm = await Realm.open(config);
        const session = realm.syncSession;
        await waitForConnectionState(session, Realm.Sync.ConnectionState.Connected);

        session.resume();
        session.resume();
        session.resume();

        await waitForConnectionState(session, Realm.Sync.ConnectionState.Connected);
        TestCase.assertTrue(session.isConnected());
    },

    async testMultiplePauses() {
        const user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
        const config = {
            sync: {
                user: user,
                url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
            }
        };

        const realm = await Realm.open(config);
        const session = realm.syncSession;
        await waitForConnectionState(session, Realm.Sync.ConnectionState.Connected);

        session.pause();
        session.pause();
        session.pause();

        await waitForConnectionState(session, Realm.Sync.ConnectionState.Disconnected);
        TestCase.assertFalse(session.isConnected());
    },

    testUploadDownloadAllChanges() {
        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = `realm://127.0.0.1:9080/completion_realm/${Utils.uuid()}`;
        const schema = {
            'name': 'CompletionHandlerObject',
            properties: {
                'name': { type: 'string'}
            }
        };

        let admin2Realm;
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin1", true))
            .then((admin1) => {
                const admin1Config = admin1.createConfiguration({
                    schema: [schema],
                    sync:  {
                        url: REALM_URL,
                    }
                });
                return Realm.open(admin1Config);
            })
            .then((admin1Realm) => {
                admin1Realm.write(() => { admin1Realm.create('CompletionHandlerObject', { 'name': 'foo'}); });
                return admin1Realm.syncSession.uploadAllLocalChanges();
            })
            .then(() => {
                return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin2", true));
            })
            .then((admin2) => {
                const admin2Config = admin2.createConfiguration({
                    schema: [schema],
                    sync:  {
                        url: REALM_URL,
                    }
                });
                return Realm.open(admin2Config).then(r => {
                    admin2Realm = r;
                    return admin2Realm.syncSession.downloadAllServerChanges();
                });
            })
            .then(() => {
                TestCase.assertEqual(1,  admin2Realm.objects('CompletionHandlerObject').length);
            });
    },

    testDownloadAllServerChangesTimeout() {
        if (!platformSupported) {
            return;
        }

        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/timeout_download_realm';
        const schema = {
            name: 'CompletionHandlerObject',
            properties: {
                'name': { type: 'string'}
            }
        };

        let realm;
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                const admin1Config = admin1.createConfiguration({
                    schema: [schema],
                    sync: {
                        url: REALM_URL,
                        fullSynchronization: true
                    }
                });
                realm = new Realm(admin1Config);
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

        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/timeout_upload_realm';
        let realm;
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                const admin1Config = admin1.createConfiguration({
                    sync: {
                        url: REALM_URL,
                    }
                });
                realm = new Realm(admin1Config);
                return realm.syncSession.uploadAllLocalChanges(1);
            }).then(() => { throw new Error('Upload did not time out'); }, (e) => {
                TestCase.assertEqual(e, 'Uploading changes did not complete in 1 ms.');
                return realm.syncSession.uploadAllLocalChanges();
            });
    },

    testReconnect() {
        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/~/reconnect';
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                const admin1Config = admin1.createConfiguration({
                    sync: {
                        url: REALM_URL,
                    }
                });
                let realm = new Realm(admin1Config);

                // No real way to check if this works automatically.
                // This is just a smoke test, making sure the method doesn't crash outright.
                Realm.Sync.reconnect();
            });
    },

    test_hasExistingSessions() {
        TestCase.assertFalse(Realm.Sync._hasExistingSessions());

        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/~/active_sessions';
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                const admin1Config = admin1.createConfiguration({
                    sync: {
                        url: REALM_URL,
                    }
                });
                let realm = new Realm(admin1Config);
                realm.close();

                // Wait for the session to finish
                return new Promise((resolve, reject) => {
                    let intervalId;
                    let it = 50;
                    intervalId = setInterval(function() {
                        if (!Realm.Sync._hasExistingSessions()) {
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

    testSessionStopPolicy() {
        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/~/stop_policy';
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                // Check valid input
                const config1 = admin1.createConfiguration({
                    sync: {
                        url: REALM_URL,
                        _sessionStopPolicy: 'after-upload'
                    }
                });
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

    testSessionStopPolicyImmediately() {
        const AUTH_URL = 'http://127.0.0.1:9080';
        const REALM_URL = 'realm://127.0.0.1:9080/~/stop_policy_immediately';
        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
            .then((admin1) => {
                // Check valid input
                const config1 = admin1.createConfiguration({
                    sync: {
                        url: REALM_URL,
                        _sessionStopPolicy: 'immediately'
                    }
                });

                {
                    TestCase.assertFalse(Realm.Sync._hasExistingSessions());
                    const realm = new Realm(config1);
                    const session = realm.syncSession;
                    TestCase.assertTrue(Realm.Sync._hasExistingSessions());
                    realm.close();
                }
                TestCase.assertFalse(Realm.Sync._hasExistingSessions());
            });
    },

    testDeleteModelThrowsWhenSync() {
        if (!platformSupported) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                schema: [schemas.TestObject],
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                }
            };
            return Realm.open(config);
        }).then(realm => {
            realm.write(() => {
                TestCase.assertThrows(() => { realm.deleteModel(schemas.TestObject.name); });
            });
            realm.close();
        });
    }
};
