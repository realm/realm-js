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

const Realm = require('realm');
const TestCase = require('./asserts');

const isNodeProccess = (typeof process === 'object' && process + '' === '[object process]');

const require_method = require;
function node_require(module) {
    return require_method(module);
}

let tmp;
let fs;
let execFile;
let path;

if (isNodeProccess) {
    tmp = node_require('tmp');
    fs = node_require('fs');
    execFile = node_require('child_process').execFile;
    tmp.setGracefulCleanup();
    path = node_require("path");
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function copyFileToTempDir(filename) {
    let tmpDir = tmp.dirSync();
    let content = fs.readFileSync(filename);
    let tmpFile = tmp.fileSync({ dir: tmpDir.name });
    fs.appendFileSync(tmpFile.fd, content);
    return tmpFile.name;
}

function runOutOfProcess(nodeJsFilePath) {
    var nodeArgs = Array.prototype.slice.call(arguments);
    let tmpDir = tmp.dirSync();
    let content = fs.readFileSync(nodeJsFilePath, 'utf8');
    let tmpFile = tmp.fileSync({ dir: tmpDir.name });
    fs.appendFileSync(tmpFile.fd, content, { encoding: 'utf8' });
    nodeArgs[0] = tmpFile.name;
    return new Promise((resolve, reject) => {
        try {
            console.log('runOutOfProcess command\n node ' + nodeArgs.join(" "));
            const child = execFile('node', nodeArgs, { cwd: tmpDir.name }, (error, stdout, stderr) => {
                if (error) {
                    console.error("runOutOfProcess failed\n" + error);
                    reject(new Error(`Running ${nodeJsFilePath} failed. error: ${error}`));
                    return;
                }

                console.log('runOutOfProcess success\n' + stdout);
                resolve();
            });
            }
        catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    testLocalRealmHasNoSession() {
        let realm = new Realm();
        TestCase.assertNull(realm.syncSession);
    },

    testProperties() {
        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            return new Promise((resolve, reject) => {
                const accessTokenRefreshed = this;
                let successCounter = 0;
                function checkSuccess() {
                    successCounter++;
                    if (successCounter == 2) {
                        resolve();
                    }
                }

                function postTokenRefreshChecks(sender, error) {
                    try {
                        TestCase.assertEqual(error, accessTokenRefreshed);
                        TestCase.assertEqual(sender.url, `realm://localhost:9080/${user.identity}/myrealm`);
                        checkSuccess();
                    }
                    catch (e) {
                        reject(e)
                    }
                }

                // Let the error handler trigger our checks when the access token was refreshed.
                postTokenRefreshChecks._notifyOnAccessTokenRefreshed = accessTokenRefreshed;

                const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm', error: postTokenRefreshChecks } };
                const realm = new Realm(config);
                const session = realm.syncSession;
                TestCase.assertInstanceOf(session, Realm.Sync.Session);
                TestCase.assertEqual(session.user.identity, user.identity);
                TestCase.assertEqual(session.config.url, config.sync.url);
                TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                TestCase.assertUndefined(session.url);
                TestCase.assertEqual(session.state, 'active');
                checkSuccess();
            });
        });
    },

    testRealmOpen() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        let user, config;
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', username, 'password'))
            .then(u => {
                user = u;
                const accessTokenRefreshed = this;
                let successCounter = 0;

                config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}` },
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        let user, config;
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', username, 'password'))
            .then(u => {
                user = u;
                const accessTokenRefreshed = this;
                let successCounter = 0;

                config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}` },
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', username, 'password'))
            .then(user => {
                const accessTokenRefreshed = this;
                let successCounter = 0;

                let config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}` },
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

       return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        const accessTokenRefreshed = this;
                        let successCounter = 0;

                        let config = {
                            sync: { user, url: `realm://localhost:9080/~/${realmName}` }
                        };

                        Realm.openAsync(config, (error, realm) => {
                            try {
                                if (error) {
                                    reject(error);
                                }

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
            });
    },

    testRealmOpenLocalRealm() {
        const username = uuid();
        const expectedObjectsCount = 3;


        return new Promise((resolve, reject) => {
            const accessTokenRefreshed = this;
            let successCounter = 0;

            let config = {
                schema: [{ name: 'Dog', properties: { name: 'string' } }],
            };

            Realm.open(config).then(realm => {
                realm.write(() => {
                    for (let i = 1; i <= 3; i++) {
                        realm.create('Dog', { name: `Lassy ${i}` });
                    }
                });

                let actualObjectsCount = realm.objects('Dog').length;
                TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Local realm does not contain the expected objects count");
                resolve();
            }).catch(error => reject(error));
        });
    },

    testRealmOpenAsyncLocalRealm() {
        const username = uuid();
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
        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            return new Promise((resolve, _reject) => {
                const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' } };
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

    testIncompatibleSyncedRealmOpen() {
        let realm = "sync-v1.realm";
        if (isNodeProccess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password')
            .then(user => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://localhost:9080/~/sync-v1'
                    }
                };
                return Realm.open(config)
            })
            .then(realm => { throw new Error("Should fail with IncompatibleSyncedRealmError") })
            .catch(e => {
                if (e.name == "IncompatibleSyncedRealmError") {
                    const backupRealm = new Realm(e.configuration);
                    TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                    return;
                }

                function printObject(o) {
                    var out = '';
                    for (var p in o) {
                      out += p + ': ' + o[p] + '\n';
                    }
                    return out;
                  }

                throw new Error("Failed with unexpected error " + printObject(e));
            });
    },

    testIncompatibleSyncedRealmOpenAsync() {
        let realm = "sync-v1.realm";
        if (isNodeProccess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            return new Promise((resolve, _reject) => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://localhost:9080/~/sync-v1'
                    }
                };

                Realm.openAsync(config, (error, realm) => {
                    if (!error) {
                        _reject("Should fail with IncompatibleSyncedRealmError");
                        return;
                    }

                    if (error.name == "IncompatibleSyncedRealmError") {
                        const backupRealm = new Realm(error.configuration);
                        TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                        resolve();
                        return;
                    }

                    _reject("Failed with unexpected error" + JSON.stringify(error));
                });
            });
        });
    },

    testIncompatibleSyncedRealmConsructor() {
        let realm = "sync-v1.realm";
        if (isNodeProccess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            return new Promise((resolve, _reject) => {
                    const config = {
                        path: realm,
                        sync: {
                            user,
                            error : err => console.log(err),
                            url: 'realm://localhost:9080/~/sync-v1'
                        }
                    };

                    try {
                        const realm = new Realm(config);
                        _reject("Should fail with IncompatibleSyncedRealmError");
                    }
                    catch (e) {
                        if (e.name == "IncompatibleSyncedRealmError") {
                            const backupRealm = new Realm(e.configuration);
                            TestCase.assertEqual(backupRealm.objects('Dog').length, 3);
                            resolve();
                            return;
                        }

                        _reject("Failed with unexpected error" + JSON.stringify(e));
                    }
            });
        });
    },

    testProgressNotificationsForRealmConstructor() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', username, 'password'))
            .then(user => {
                let config = {
                    sync: {
                        user,
                        url: `realm://localhost:9080/~/${realmName}`
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
    },

    testProgressNotificationsUnregisterForRealmConstructor() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        let config = {
                            sync: {
                                user,
                                url: `realm://localhost:9080/~/${realmName}`
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
            });
    },

    testProgressNotificationsForRealmOpen() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        let config = {
                            sync: {
                                user,
                                url: `realm://localhost:9080/~/${realmName}`
                            },
                            schema: [{ name: 'Dog', properties: { name: 'string' } }],
                        };

                        let progressCalled = false;
                        Realm.open(config)
                            .progress((transferred, total) => {
                                progressCalled = true;
                            })
                            .then(() => {
                                TestCase.assertTrue(progressCalled);
                                resolve();
                            })
                            .catch((e) => reject(e));

                        setTimeout(function() {
                            reject("Progress Notifications API failed to call progress callback for Realm constructor");
                        }, 5000);
                    });
                });
            });
    },

    testProgressNotificationsForRealmOpenAsync() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        let config = {
                            sync: {
                                user,
                                url: `realm://localhost:9080/~/${realmName}`
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
            });
    },

    testPartialSync() {
        // FIXME: try to enable for React Native
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', username, 'password').then(user => {
                    let config = {
                        sync: {
                            user: user,
                            url: `realm://localhost:9080/~/${realmName}`,
                            partial: true,
                            error: (session, error) => console.log(error)
                        },
                        schema: [{ name: 'Dog', properties: { name: 'string' } }]
                    };

                    Realm.deleteFile(config);
                    const realm = new Realm(config);
                    TestCase.assertEqual(realm.objects('Dog').length, 0);
                    return realm.subscribeToObjects("Dog", "name == 'Lassy 1'").then(results => {
                        TestCase.assertEqual(results.length, 1);
                        TestCase.assertTrue(results[0].name === 'Lassy 1', "The object is not synced correctly");
                    });
                })
            })
    },

    testClientReset() {
        // FIXME: try to enable for React Native
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            return new Promise((resolve, _reject) => {
                var realm;
                const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' } };
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
    }
}
