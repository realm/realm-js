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
const URL = require('url-parse');

const TestCase = require('./asserts');
const Utils = require('./test-utils');
let schemas = require('./schemas');

const isElectronProcess = typeof process === 'object' && process.type === 'renderer';
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]' && !isElectronProcess;

const require_method = require;
function node_require(module) {
    return require_method(module);
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

    testCustomHTTPHeaders() {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            let config = {
                sync: {
                    user,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                    fullSynchronization: true,
                    custom_http_headers: {
                        'X-Foo': 'Bar'
                    }
                },
                schema: [{ name: 'Dog', properties: { name: 'string' } }],
            };
            return Realm.open(config).then(realm => {
                  TestCase.assertDefined(realm.syncSession.config.custom_http_headers);
                  TestCase.assertEqual(realm.syncSession.config.custom_http_headers['X-Foo'], 'Bar');
            });
        });
    },

    testProperties() {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            let postTokenRefreshChecks;
            const gotToken = new Promise((resolve, reject) => {
                postTokenRefreshChecks = (sender) => {
                    try {
                        TestCase.assertEqual(sender.url, `realm://127.0.0.1:9080/${user.identity}/myrealm`);
                        resolve();
                    }
                    catch (e) {
                        reject(e)
                    }
                }
            });

            // Tell refreshAccessToken to call our error handler after successfully getting a token
            postTokenRefreshChecks._notifyOnAccessTokenRefreshed = true;

            const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm', error: postTokenRefreshChecks, fullSynchronization: true } });
            const realm = new Realm(config);
            const session = realm.syncSession;
            TestCase.assertInstanceOf(session, Realm.Sync.Session);
            TestCase.assertEqual(session.user.identity, user.identity);
            TestCase.assertEqual(session.config.url, config.sync.url);
            TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
            TestCase.assertUndefined(session.url);
            TestCase.assertEqual(session.state, 'active');
            return gotToken;
        });
    },

    testRealmOpen() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        let user, config;

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(u => {
                user = u;

                config = {
                    sync: { user, url: `realm://127.0.0.1:9080/~/${realmName}`, fullSynchronization: true },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                };

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

    testRealmOpenWithExistingLocalRealm() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        let user, config;
        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(u => {
                user = u;
                config = {
                    sync: { user, url: `realm://127.0.0.1:9080/~/${realmName}`, fullSynchronization: true },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                    schemaVersion: 1,
                };

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

    testRealmOpenAsync() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                let config = {
                    sync: { user, url: `realm://127.0.0.1:9080/~/${realmName}`, fullSynchronization: true },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                };
                return new Promise((resolve, reject) => {
                    Realm.openAsync(config, (error, realm) => {
                        try {
                            if (error) {
                                reject(error);
                            }

                            let actualObjectsCount = realm.objects('Dog').length;
                            TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");

                            setTimeout(() => {
                                try {
                                    const session = realm.syncSession;
                                    TestCase.assertInstanceOf(session, Realm.Sync.Session);
                                    TestCase.assertEqual(session.user.identity, user.identity);
                                    TestCase.assertEqual(session.config.url, config.sync.url);
                                    TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                                    TestCase.assertEqual(session.state, 'active');
                                    resolve();
                                } catch (e) {
                                    reject(e);
                                }
                            }, 50);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            });
    },

    testRealmOpenAsyncNoSchema() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        const expectedObjectsCount = 3;

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                let config = {
                    sync: { user, url: `realm://127.0.0.1:9080/~/${realmName}`, fullSynchronization: true }
                };
                return new Promise((resolve, reject) => {
                    Realm.openAsync(config, (error, realm) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        try {
                            let actualObjectsCount = realm.objects('Dog').length;
                            TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");

                            let firstDog = realm.objects('Dog')[0];
                            TestCase.assertTrue(({}).hasOwnProperty.call(firstDog, 'name'), "Synced realm does not have an inffered schema");
                            TestCase.assertTrue(firstDog.name, "Synced realm object's property should have a value");
                            TestCase.assertTrue(firstDog.name.indexOf('Lassy') !== -1, "Synced realm object's property should contain the actual written value");

                            const session = realm.syncSession;
                            TestCase.assertInstanceOf(session, Realm.Sync.Session);
                            TestCase.assertEqual(session.user.identity, user.identity);
                            TestCase.assertEqual(session.config.url, config.sync.url);
                            TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                            TestCase.assertEqual(session.state, 'active');
                            resolve();
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            });
    },

    testRealmOpenLocalRealm() {
        const username = Utils.uuid();
        const expectedObjectsCount = 3;

        const accessTokenRefreshed = this;
        let successCounter = 0;

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

    testRealmOpenAsyncLocalRealm() {
        const username = Utils.uuid();
        const expectedObjectsCount = 3;


        return new Promise((resolve, reject) => {
            const accessTokenRefreshed = this;
            let successCounter = 0;

            let config = {
                schema: [{ name: 'Dog', properties: { name: 'string' } }],
            };

            Realm.openAsync(config, (error, realm) => {
                try {
                    if (error) {
                        reject(error);
                    }

                    realm.write(() => {
                        for (let i = 1; i <= 3; i++) {
                            realm.create('Dog', { name: `Lassy ${i}` });
                        }
                    });

                    let actualObjectsCount = realm.objects('Dog').length;
                    TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Local realm does not contain the expected objects count");
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    },

    testErrorHandling() {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
                config.sync.error = (sender, error) => {
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
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/nested-list-helper.js', __dirname + '/schemas.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                let config = {
                    schema: [schemas.ParentObject, schemas.NameObject],
                    sync: { user, url: `realm://127.0.0.1:9080/~/${realmName}`, fullSynchronization: true }
                };
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

    testIncompatibleSyncedRealmOpen() {
        let realm = "sync-v1.realm";
        if (isNodeProcess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous())
            .then(user => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://127.0.0.1:9080/~/sync-v1',
                        fullSynchronization: true,
                    }
                };
                return Realm.open(config)
            })
            .then(realm => { throw new Error("Should fail with IncompatibleSyncedRealmError") })
            .catch(e => {
                if (e.name === "IncompatibleSyncedRealmError") {
                    const backupRealm = new Realm(e.configuration);
                    TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                    return;
                }
                throw new Error(unexpectedError(e));
            });
    },

    testIncompatibleSyncedRealmOpenAsync() {
        let realm = "sync-v1.realm";
        if (isNodeProcess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://127.0.0.1:9080/~/sync-v1',
                        fullSynchronization: true,
                    }
                };

                Realm.openAsync(config, (error, realm) => {
                    if (!error) {
                        _reject("Should fail with IncompatibleSyncedRealmError");
                        return;
                    }

                    if (error.name === "IncompatibleSyncedRealmError") {
                        const backupRealm = new Realm(error.configuration);
                        TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                        resolve();
                        return;
                    }

                    _reject(unexpectedError(error));
                });
            });
        });
    },

    testIncompatibleSyncedRealmConsructor() {
        let realm = "sync-v1.realm";
        if (isNodeProcess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                    const config = {
                        path: realm,
                        sync: {
                            user,
                            error : err => console.log(err),
                            url: 'realm://127.0.0.1:9080/~/sync-v1'
                        }
                    };

                    try {
                        const realm = new Realm(config);
                        _reject("Should fail with IncompatibleSyncedRealmError");
                    }
                    catch (e) {
                        if (e.name === "IncompatibleSyncedRealmError") {
                            const backupRealm = new Realm(e.configuration);
                            TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                            resolve();
                            return;
                        }

                        _reject(unexpectedError(e));
                    }
            });
        });
    },

/*    testProgressNotificationsForRealmConstructor() {
        if (!isNodeProccess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', username, 'password'))
            .then(user => {
                let config = {
                    sync: {
                        user,
                        url: `realm://127.0.0.1:9080/~/${realmName}`
                    },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                };

                return Realm.open(config).then((realm) => {
                    return new Promise((resolve, reject) => {
                        realm.syncSession.addProgressNotification('download', 'reportIndefinitely', (transferred, transferable) => {
                            if (transferred === transferable) {
                                resolve();
                            }
                        });
                        setTimeout(function() {
                            reject("Progress Notifications API failed to call progress callback for Realm constructor");
                        }, 5000);
                    });
                });
            });
    },*/

    testProgressNotificationsUnregisterForRealmConstructor() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                let config = {
                    sync: {
                        user,
                        url: `realm://127.0.0.1:9080/~/${realmName}`
                    },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                };

                let realm = new Realm(config);
                let unregisterFunc;

                let writeDataFunc = () => {
                    realm.write(() => {
                        for (let i = 1; i <= 3; i++) {
                            realm.create('Dog', { name: `Lassy ${i}` });
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
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();
        let progressCalled = false;

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                let config = {
                    sync: {
                        user,
                        url: `realm://127.0.0.1:9080/~/${realmName}`
                    },
                    schema: [{ name: 'Dog', properties: { name: 'string' } }],
                };

                return Promise.race([
                    Realm.open(config).progress((transferred, total) => { progressCalled = true; }),
                    new Promise((_, reject) => setTimeout(() => reject("Progress Notifications API failed to call progress callback for Realm constructor"), 5000))
                ]);
            }).then(() => TestCase.assertTrue(progressCalled));
    },

    testProgressNotificationsForRealmOpenAsync() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const realmName = Utils.uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://127.0.0.1:9080', credentials))
            .then(user => {
                return new Promise((resolve, reject) => {
                    let config = {
                        sync: {
                            user,
                            url: `realm://127.0.0.1:9080/~/${realmName}`
                        },
                        schema: [{ name: 'Dog', properties: { name: 'string' } }],
                    };

                    let progressCalled = false;

                    Realm.openAsync(config,
                        (error, realm) => {
                            if (error) {
                                reject(error);
                                return;
                            }

                            TestCase.assertTrue(progressCalled);
                            resolve();
                        },
                        (transferred, total) => {
                            progressCalled = true;
                        });

                    setTimeout(function() {
                        reject("Progress Notifications API failed to call progress callback for Realm constructor");
                    }, 5000);
                });
            });
    },

    testDisableUrlCheck() {
        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username);
        return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then(user => {
            let config = {
                sync: {
                    user: user,
                    url: `realm://127.0.0.1:9080/default/__partial/`,
                    _disableQueryBasedSyncUrlChecks: true,
                    fullSynchronization: false,
                    error: () => {},
                },
                schema: [ { name: 'Dog', properties: { name: 'string' } } ]
            };
            const realm = new Realm(config);
            TestCase.assertFalse(realm.isClosed);
            realm.close();
        });
    },

    testPartialUrlCheck() {
        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username);
        return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then(user => {
            let config = {
                sync: {
                    user: user,
                    url: `realm://127.0.0.1:9080/default/__partial/`,  // <--- not allowed URL
                    fullSynchronization: false,
                }
            };
            TestCase.assertThrows(() => new Realm(config));
        });
    },

    async testCustomPartialSyncIdentifier() {
        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username, true);
        const user = await Realm.Sync.User.login('http://127.0.0.1:9080', credentials);
        const customRealm = await Realm.open({
            schema: [ { name: 'Dog', properties: { name: 'string' } } ],
            sync: {
                user: user,
                url: 'realm://127.0.0.1:9080/default',
                fullSynchronization: false,
                customQueryBasedSyncIdentifier: "foo/bar",
            }
        });

        // Ensure that the custom partial sync identifier was picked up and appended to the url
        TestCase.assertTrue(customRealm.path.endsWith(encodeURIComponent("default/__partial/foo/bar")));
        customRealm.close();

        const basicRealm = await Realm.open({
            schema: [ { name: 'Dog', properties: { name: 'string' } } ],
            sync: {
                user,
                url: 'realm://127.0.0.1:9080/default',
                fullSynchronization: false,
            }
        });

        // Sanity check - when there's no custom identifier, it should not end in /foo/bar
        TestCase.assertFalse(basicRealm.path.endsWith(encodeURIComponent("default/__partial/foo/bar")));
        basicRealm.close();
    },

    testSubscribeInFullRealm() {
        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username);
        return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then(user => {
            let config = {
                sync: {
                    user: user,
                    url: 'realm://127.0.0.1:9080/~/default',
                    fullSynchronization: true, // <---- calling subscribe should fail
                    error: (session, error) => console.log(error)
                },
                schema: [{ name: 'Dog', properties: { name: 'string' } }]
            };

            Realm.deleteFile(config);
            const realm = new Realm(config);
            TestCase.assertEqual(realm.objects('Dog').length, 0);
            TestCase.assertThrows(() => realm.objects('Dog').filtered("name == 'Lassy 1'").subscribe());
            realm.close();
        });
    },

    testInvalidArugmentsToAutomaticSyncConfiguration() {
        TestCase.assertThrows(() => Realm.automaticSyncConfiguration('foo', 'bar')); // too many arguments
    },

    async testPartialSync() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const path = `/~/testPartialSync`;
        const credentials = Realm.Sync.Credentials.nickname(username, true);
        await runOutOfProcess(__dirname + '/partial-sync-api-helper.js', username, REALM_MODULE_PATH, path)
        const user = await Realm.Sync.User.login('http://127.0.0.1:9080', credentials);

        let config = Realm.Sync.User.current.createConfiguration({sync: {url: `realm://127.0.0.1:9080${path}`}});
        config.schema = [{ name: 'Dog', properties: { name: 'string' } }];
        const realm = await Realm.open(config);

        const session = realm.syncSession;
        TestCase.assertInstanceOf(session, Realm.Sync.Session);
        TestCase.assertEqual(session.user.identity, user.identity);
        TestCase.assertEqual(session.state, 'active');

        TestCase.assertEqual(realm.objects('Dog').length, 0);
        const results1 = realm.objects('Dog').filtered("name == 'Lassy 1'");
        const results2 = realm.objects('Dog').filtered("name == 'Lassy 2'");

        const subscription1 = results1.subscribe();
        TestCase.assertEqual(subscription1.state, Realm.Sync.SubscriptionState.Creating);

        const subscription2 = results2.subscribe('foobar');
        TestCase.assertEqual(subscription2.state, Realm.Sync.SubscriptionState.Creating);

        const waitForSubscription = (results, subscription, subName, dogName) => {
            return new Promise((resolve, reject) => {
                subscription.addListener((subscription, state) => {
                    if (state !== Realm.Sync.SubscriptionState.Complete) {
                        return;
                    }
                    try {
                        subscription.removeAllListeners();
                        results.addListener((collection, changeset) => {
                            TestCase.assertEqual(collection.length, 1);
                            TestCase.assertEqual(collection[0].name, dogName);
                            results.removeAllListeners();
                            TestCase.assertEqual(subscription.name, subName);
                            resolve();
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        };
        await waitForSubscription(results1, subscription1, undefined, 'Lassy 1');
        await waitForSubscription(results2, subscription2, 'foobar', 'Lassy 2');

        let listOfSubscriptions = realm.subscriptions();
        TestCase.assertEqual(listOfSubscriptions.length, 2 + 5); // 2 = the two subscriptions, 5 = the permissions classes
        TestCase.assertEqual(listOfSubscriptions[0]['name'], '[Dog] name == "Lassy 1"'); // the query is the default name; notice the trailing whitespace!
        TestCase.assertEqual(listOfSubscriptions[0]['query'], 'name == "Lassy 1"'); // notice the trailing whitespace!
        TestCase.assertEqual(listOfSubscriptions[0]['objectType'], 'Dog');
        TestCase.assertEqual(listOfSubscriptions[1]['name'], 'foobar');
        TestCase.assertEqual(listOfSubscriptions[1]['query'], 'name == "Lassy 2"'); // notice the trailing whitespace!
        TestCase.assertEqual(listOfSubscriptions[1]['objectType'], 'Dog');

        listOfSubscriptions = realm.subscriptions('*bar');
        TestCase.assertEqual(listOfSubscriptions.length, 1);

        listOfSubscriptions = realm.subscriptions('RABOOF');
        TestCase.assertEqual(listOfSubscriptions.length, 0);

        subscription1.unsubscribe();
        realm.unsubscribe('foobar');

        await new Promise(resolve => {
            realm.objects('__ResultSets').addListener((subscriptions) => {
                if (subscriptions.length === 5) {
                    resolve();
                }
            });
        });

        TestCase.assertEqual(realm.subscriptions().length, 5); // the 5 permissions classes
    },

    testPartialSyncWithDynamicSchema() {
        if (!isNodeProcess) {
            return;
        }
        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username);
        let user;
        return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then(u => {
            user = u;
            let config = {
                sync: {
                    user: user,
                    url: 'realm://127.0.0.1:9080/~/dynamicSchema',
                    fullSynchronization: false,
                    error: (session, error) => console.log(error)
                }
            };
            return Realm.open(config);
        }).then(realm => {
            // Dog type shouldn't exist in the schema yet
            TestCase.assertThrows(() => realm.objects('Dog'));
            return new Promise(resolve => {
                realm.addListener('schema', () => {
                    if (realm.schema.find(s => s.name === 'Dog')) {
                        setTimeout(() => resolve(realm), 0);
                        realm.removeAllListeners();
                    }
                });
                runOutOfProcess(__dirname + '/partial-sync-api-helper.js', username, REALM_MODULE_PATH, '/~/dynamicSchema');
            });
        }).then(realm => {
            // Should now have Dog type in the schema, but no objects
            TestCase.assertEqual(0, realm.objects('Dog').length);
            return new Promise(resolve => {
                realm.objects('Dog').subscribe().addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        subscription.removeAllListeners();
                        resolve(realm);
                    }
                });
            });
        }).then(realm => {
            // Should now have objects
            TestCase.assertEqual(3, realm.objects('Dog').length);
        });
    },

    testRoleClassWithPartialSyncCanCoexistWithPermissionsClass() {
        if (!isNodeProcess) {
            return;
        }

        const username = Utils.uuid();
        const credentials = Realm.Sync.Credentials.nickname(username);
        return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then(user => {
            let config = {
                schema: [{name: 'Role', properties: {name: 'string'}}],
                sync: {
                    user: user,
                    url: 'realm://127.0.0.1:9080/~/roleClass',
                    fullSynchronization: false,
                    error: (session, error) => console.log(error)
                }
            };
            return Realm.open(config);
        }).then(realm => {
            // verify that these don't throw
            realm.objects('Role');
            realm.objects('__Role');
        });
    },

    testClientReset() {
        // FIXME: try to enable for React Native
        if (!isNodeProcess) {
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

    async testClientResetAtOpen() {
        // FIXME: try to enable for React Native
        if (!isNodeProcess) {
            return;
        }
        const fetch = require('node-fetch');

        let called = false;
        let user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname('admin', true));
        var realm;
        const config = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
        config.schema = [schemas.IntOnly];
        config.sync.clientResyncMode = 'manual';
        config.sync.fullSynchronization = true;
        config.sync.error = (sender, error) => {
            called = true;
            try {
                TestCase.assertEqual(error.name, 'ClientReset');
                TestCase.assertDefined(error.config);
                TestCase.assertNotEqual(error.config.path, '');
                const path = realm.path;
                realm.close();
                //Realm.Sync.initiateClientReset(path);
                // open Realm with error.config, and copy required objects a Realm at `path`
            }
            catch (e) {
            }
        };

        // open, download, create an object, upload and close
        realm = await Realm.open(config);
        await realm.syncSession.downloadAllServerChanges();
        realm.write(() => {
            realm.create(schemas.IntOnly.name, { intCol: 1 });
        });
        await realm.syncSession.uploadAllLocalChanges();
        realm.close();

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
        await fetch(url, options);

        // open the Realm again and see it fail
        return Realm.open(config).then(realm => {
            Promise.reject();
        }).catch(error => {
            TestCase.assertTrue(called); // the error handler was called
            TestCase.assertDefined(error.name);
            TestCase.assertEqual(error.name, "IncompatibleSyncedRealmError");
            Promise.resolve();
        })
    },

    async testClientResyncDiscard() {
        // FIXME: try to enable for React Native
        if (!isNodeProcess) {
            return;
        }
        const fetch = require('node-fetch');

        let user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname('admin', true));
        const config1 = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
        config1.schema = [schemas.IntOnly];
        config1.sync.clientResyncMode = 'discard';
        config1.sync.fullSynchronization = true;
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
        await fetch(url, options);

        // open the Realm again without schema and download
        const config2 = user.createConfiguration({ sync: { url: 'realm://127.0.0.1:9080/~/myrealm' } });
        config2.sync.clientResyncMode = 'discard';
        config2.sync.fullSynchronization = true;
        config2._cache = false;
        let realm2 = await Realm.open(config2);
        await realm2.syncSession.downloadAllServerChanges();
        TestCase.assertEqual(realm2.schema.length, 0);
        realm2.close();
    },


    testClientResyncMode() {
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Discard, 'discard');
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Manual, 'manual');
        TestCase.assertEqual(Realm.Sync.ClientResyncMode.Recover, 'recover');
    },

    testClientResyncIncorrectMode() {
        // FIXME: try to enable for React Native
        if (!isNodeProcess) {
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

    testClientResyncIncorrectModeForQueryBasedSync() {
        // FIXME: try to enable for React Native
        if (!isNodeProcess) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, reject) => {
                var realm;
                let config = {
                    sync: {
                        user: user,
                        url: 'realm://127.0.0.1:9080/~/dynamicSchema',
                        fullSynchronization: false,
                        clientResyncMode: 'recover'
                    }
                };
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
        if (!isNodeProcess) {
            return;
        }
        const fetch = require('node-fetch');

        const realmUrl = 'realm://127.0.0.1:9080/~/myrealm';
        let user = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname('admin', true));
        const config1 = user.createConfiguration({ sync: { url: realmUrl } });
        config1.schema = [schemas.IntOnly];
        config1.sync.clientResyncMode = 'discard';
        config1.sync.fullSynchronization = true;
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
        var URL = require('url').URL;
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
        config2.sync.fullSynchronization = true;
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
                    fullSynchronization: true,
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
                    fullSynchronization: true,
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
        if (!isNodeProcess) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                    fullSynchronization: true,
                }
            };
            return Realm.open(config);
        }).then(realm => {
            let session = realm.syncSession;
            session.pause();
            TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Disconnected);
            TestCase.assertFalse(session.isConnected());

            return new Promise((resolve, reject) => {
                session.addConnectionNotification((newState, oldState) => {
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
        const user = await Realm.Sync.User.register('http://127.0.0.1:9080', Utils.uuid(), 'password');
        const config = {
            sync: {
                user: user,
                url: 'realm://127.0.0.1:9080/~/testResumePause',
                fullSynchronization: true,
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
        const user = await Realm.Sync.User.register('http://127.0.0.1:9080', Utils.uuid(), 'password');
        const config = {
            sync: {
                user: user,
                url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                fullSynchronization: true,
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
        const user = await Realm.Sync.User.register('http://127.0.0.1:9080', Utils.uuid(), 'password');
        const config = {
            sync: {
                user: user,
                url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                fullSynchronization: true,
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
                        fullSynchronization: true
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
                        fullSynchronization: true
                    }
                });
                admin2Realm = new Realm(admin2Config);
                return admin2Realm.syncSession.downloadAllServerChanges();
            })
            .then(() => {
                TestCase.assertEqual(1,  admin2Realm.objects('CompletionHandlerObject').length);
            });
    },

    testDownloadAllServerChangesTimeout() {
        if (!isNodeProcess) {
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
        if (!isNodeProcess) {
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
                        fullSynchronization: true
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
                        fullSynchronization: true
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
                        fullSynchronization: true
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
                        fullSynchronization: true,
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
                        fullSynchronization: true,
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
        if (!isNodeProcess) {
            return;
        }

        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            let config = {
                schema: [schemas.TestObject],
                sync: {
                    user: u,
                    url: `realm://127.0.0.1:9080/~/${Utils.uuid()}`,
                    fullSynchronization: true,
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
