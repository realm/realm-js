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
let schemas = require('./schemas');

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

function runOutOfProcess() {
    const args = Array.prototype.slice.call(arguments);
    let tmpDir = tmp.dirSync();
    console.log(`runOutOfProcess : ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        try {
            execFile(process.execPath, args, {cwd: tmpDir.name}, (error, stdout, stderr) => {
                if (error) {
                    console.error("runOutOfProcess failed\n", error, stdout, stderr);
                    reject(new Error(`Running ${args[0]} failed. error: ${error}`));
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

function waitForSessionConnected(session) {
    return new Promise(res => {
        session.addConnectionNotification((newState, oldState) => {
            if (newState === Realm.Sync.ConnectionState.Connected) {
                res();
            }
        })
    });
}

module.exports = {
    testLocalRealmHasNoSession() {
        let realm = new Realm();
        TestCase.assertNull(realm.syncSession);
    },

    testCustomHTTPHeaders() {
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            let config = {
                sync: {
                    user,
                    url: `realm://localhost:9080/~/${uuid()}`,
                    fullSynchronization: true,
                    custom_http_headers: {
                        'X-Foo': 'Bar'
                    }
                },
                schema: [{ name: 'Dog', properties: { name: 'string' } }],
            };
            return Realm.open(config).then(realm => {
                return new Promise((resolve, reject) => {
                    TestCase.assertDefined(realm.syncSession.config.custom_http_headers);
                    TestCase.assertEqual(realm.syncSession.config.custom_http_headers['X-Foo'], 'Bar');
                    resolve();
                });
            });
        });
    },

    testProperties() {
        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
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

                const config = user.createConfiguration({ sync: { url: 'realm://localhost:9080/~/myrealm', error: postTokenRefreshChecks, fullSynchronization: true } });
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

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(u => {
                user = u;

                config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}`, fullSynchronization: true },
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
        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(u => {
                user = u;
                config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}`, fullSynchronization: true },
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

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
                let config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}`, fullSynchronization: true },
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

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
                let config = {
                    sync: { user, url: `realm://localhost:9080/~/${realmName}`, fullSynchronization: true }
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
        const username = uuid();
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
        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                const config = user.createConfiguration({ sync: { url: 'realm://localhost:9080/~/myrealm' } });
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/nested-list-helper.js', __dirname + '/schemas.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
                let config = {
                    schema: [schemas.ParentObject, schemas.NameObject],
                    sync: { user, url: `realm://localhost:9080/~/${realmName}`, fullSynchronization: true }
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
        if (isNodeProccess) {
            realm = copyFileToTempDir(path.join(process.cwd(), "data", realm));
        }
        else {
            //copy the bundled RN realm files for the test
            Realm.copyBundledRealmFiles();
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous())
            .then(user => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://localhost:9080/~/sync-v1',
                        fullSynchronization: true,
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

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                const config = {
                    path: realm,
                    sync: {
                        user,
                        error : err => console.log(err),
                        url: 'realm://localhost:9080/~/sync-v1',
                        fullSynchronization: true,
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

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
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

/*    testProgressNotificationsForRealmConstructor() {
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
    },*/

    testProgressNotificationsUnregisterForRealmConstructor() {
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();
        let progressCalled = false;

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
                let config = {
                    sync: {
                        user,
                        url: `realm://localhost:9080/~/${realmName}`
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
        if (!isNodeProccess) {
            return;
        }

        const username = uuid();
        const realmName = uuid();

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => Realm.Sync.User.login('http://localhost:9080', credentials))
            .then(user => {
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
    },


    // All tests releated to partial sync is assemble in one big test.
    // Since it is the same instance of ROS running, it is virtually impossible
    // to reset the state between the tests.
    // In the future we should away from this style of testing.
    testPartialSync() {
        if (!isNodeProccess) {
            return;
        }

        var user;
        var realm;

        const username = uuid();
        const expectedObjectsCount = 3;

        function __partialIsAllowed() {
                // test: __partial is allowed
                let config1 = {
                    sync: {
                        user: user,
                        url: `realm://localhost:9080/default/__partial/`,
                        _disableQueryBasedSyncUrlChecks: true,
                        fullSynchronization: false,
                    },
                    schema: [ { name: 'Dog', properties: { name: 'string' } } ]
                };
                const realm = new Realm(config1);
                TestCase.assertFalse(realm.isClosed);
                realm.close();
        }

        function __partialIsNotAllowed() {
            let config2 = {
                sync: {
                    user: user,
                    url: `realm://localhost:9080/default/__partial/`,  // <--- not allowed URL
                    fullSynchronization: false,
                }
            };
            TestCase.assertThrows(() => new Realm(config2));
        }

        function shouldFail() {
            let config = {
                sync: {
                    user: user,
                    url: 'realm://localhost:9080/~/default',
                    fullSynchronization: true, // <---- calling subscribe should fail
                    error: (session, error) => console.log(error)
                },
                schema: [{ name: 'Dog', properties: { name: 'string' } }]
            };

            Realm.deleteFile(config);
            const realm = new Realm(config);
            TestCase.assertEqual(realm.objects('Dog').length, 0);
            TestCase.assertThrows(function () { var subscription = realm.objects('Dog').filtered("name == 'Lassy 1'").subscribe(); } );
            realm.close();
        }

        function defaultRealmInvalidArguments() {
            TestCase.assertThrows(() => Realm.automaticSyncConfiguration('foo', 'bar')); // too many arguments
        }

        const credentials = Realm.Sync.Credentials.nickname(username);
        return runOutOfProcess(__dirname + '/partial-sync-api-helper.js', username, REALM_MODULE_PATH)
            .then(() => {
                return Realm.Sync.User.login('http://localhost:9080', credentials).then((u) => {
                    user = u;

                    __partialIsAllowed();
                    __partialIsNotAllowed();
                    shouldFail();
                    defaultRealmInvalidArguments();

                    return new Promise((resolve, reject) => {
                        let config = Realm.Sync.User.current.createConfiguration();
                        config.schema = [{ name: 'Dog', properties: { name: 'string' } }];
                        Realm.deleteFile(config);

                        realm = new Realm(config);
                        const session = realm.syncSession;
                        TestCase.assertInstanceOf(session, Realm.Sync.Session);
                        TestCase.assertEqual(session.user.identity, user.identity);
                        TestCase.assertEqual(session.state, 'active');

                        var results1 = realm.objects('Dog').filtered("name == 'Lassy 1'");
                        var results2 = realm.objects('Dog').filtered("name == 'Lassy 2'");

                        var subscription1 = results1.subscribe();
                        TestCase.assertEqual(subscription1.state, Realm.Sync.SubscriptionState.Creating);

                        var subscription2 = results2.subscribe();
                        TestCase.assertEqual(subscription2.state, Realm.Sync.SubscriptionState.Creating);

                        let called1 = false;
                        let called2 = false;

                        subscription1.addListener((subscription, state) => {
                            if (state === Realm.Sync.SubscriptionState.Complete) {
                                results1.addListener((collection, changeset) => {
                                    TestCase.assertEqual(collection.length, 1);
                                    TestCase.assertTrue(collection[0].name === 'Lassy 1', "The object is not synced correctly");
                                    results1.removeAllListeners();
                                    subscription1.unsubscribe();
                                    called1 = true;
                                });
                            } else if (state === Realm.Sync.SubscriptionState.Invalidated) {
                                subscription1.removeAllListeners();
                                if (called1 && called2) {
                                    realm.close();
                                    resolve('Done');
                                }
                            }
                        });

                        subscription2.addListener((subscription, state) => {
                            if (state === Realm.Sync.SubscriptionState.Complete) {
                                results2.addListener((collection, changeset) => {
                                    TestCase.assertEqual(collection.length, 1);
                                    TestCase.assertTrue(collection[0].name === 'Lassy 2', "The object is not synced correctly");
                                    results2.removeAllListeners();
                                    subscription2.unsubscribe();
                                    called2 = true;
                                });
                            } else if (state === Realm.Sync.SubscriptionState.Invalidated) {
                                subscription2.removeAllListeners();
                                if (called1 && called2) {
                                    realm.close();
                                    resolve('Done');
                                }
                            }
                        });

                        setTimeout(() => {
                            reject("listeners never called");
                        }, 15000);
                    });
                });
            });
    },


    testClientReset() {
        // FIXME: try to enable for React Native
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then(user => {
            return new Promise((resolve, _reject) => {
                var realm;
                const config = user.createConfiguration({ sync: { url: 'realm://localhost:9080/~/myrealm' } });
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

    testAddConnectionNotification() {
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            return new Promise((resolve, reject) => {
                let config = {
                    sync: {
                        user: u,
                        url: `realm://localhost:9080/~/${uuid()}`,
                        fullSynchronization: true,
                    }
                };

                Realm.open(config).then(realm => {
                    realm.syncSession.addConnectionNotification((newState, oldState) => {
                        if (oldState === Realm.Sync.ConnectionState.Connected && newState === Realm.Sync.ConnectionState.Disconnected) {
                            resolve('Done');
                        }
                    });
                    realm.close()
                }).catch(error => reject(error));
            });
        });
    },

    testRemoveConnectionNotification() {
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            return new Promise((resolve, reject) => {
                let config = {
                    sync: {
                        user: u,
                        url: `realm://localhost:9080/~/${uuid()}`,
                        fullSynchronization: true,
                    }
                };

                Realm.open(config).then(realm => {
                    let callback1 = () => {
                        reject("Should not be called");
                    };
                    let callback2 = (newState, oldState) => {
                        if (oldState === Realm.Sync.ConnectionState.Connected && newState === Realm.Sync.ConnectionState.Disconnected) {
                            resolve('Done');
                        }
                    };
                    let session = realm.syncSession;
                    session.addConnectionNotification(callback1);
                    session.addConnectionNotification(callback2);
                    session.removeConnectionNotification(callback1);
                    realm.close()
                }).catch(error => reject(error));
            });
        });
    },

    testConnectionState() {
        if (!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.anonymous()).then((u) => {
            return new Promise((resolve, reject) => {
                let config = {
                    sync: {
                        user: u,
                        url: `realm://localhost:9080/~/${uuid()}`,
                        fullSynchronization: true,
                    }
                };

                Realm.open(config).then(realm => {
                    let session = realm.syncSession;
                    TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Disconnected);
                    TestCase.assertFalse(session.isConnected());
                    session.addConnectionNotification((newState, oldState) => {
                        switch (newState) {
                            case Realm.Sync.ConnectionState.Disconnected:
                                TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Disconnected);
                                TestCase.assertFalse(session.isConnected());
                                break;
                            case Realm.Sync.ConnectionState.Connecting:
                                TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Connecting);
                                TestCase.assertFalse(session.isConnected());
                                break;
                            case Realm.Sync.ConnectionState.Connected:
                                TestCase.assertEqual(session.connectionState, Realm.Sync.ConnectionState.Connected);
                                TestCase.assertTrue(session.isConnected());
                                break;
                            default:
                                reject(`unknown connection value: ${newState}`);
                        }

                        if (oldState === Realm.Sync.ConnectionState.Connecting && newState === Realm.Sync.ConnectionState.Connected) {
                            resolve('Done');
                        }
                    });
                    setTimeout(() => { reject() }, 10000);
                }).catch(error => reject(error));
            });
        });
    },

    testResumePause() {
        if(!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password')
        .then((user) => {
            const config = {
                sync: {
                    user: user,
                    url: `realm://localhost:9080/~/${uuid()}`,
                    fullSynchronization: true,
                }
            };

            return Realm.open(config);
        }).then((realm) => {
            return new Promise((resolve, reject) => {
                const session = realm.syncSession;

                const checks = {
                    started: false,
                    stopped: false,
                    restarted: false
                }

                session.addConnectionNotification((newState, oldState) => {
                    if (newState === Realm.Sync.ConnectionState.Connected && checks.started === false) { checks.started = true; session.pause(); }
                    if (newState === Realm.Sync.ConnectionState.Connected && checks.started === true) { checks.restarted = true; resolve(); }
                    if (newState === Realm.Sync.ConnectionState.Disconnected) { checks.stopped = true; session.resume();}
                });

                setTimeout(() => { reject("Timeout") }, 10000);
            })
        })
    },

    testMultipleResumes() {
        if(!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password')
        .then((user) => {
            const config = {
                sync: {
                    user: user,
                    url: `realm://localhost:9080/~/${uuid()}`,
                    fullSynchronization: true,
                }
            };

            return Realm.open(config)
        }).then(realm => {
            return new Promise((resolve, reject) => {
                const session = realm.syncSession;

                waitForSessionConnected(session).then(() => {
                    session.resume();
                    session.resume();
                    session.resume();
                    setTimeout(() => {
                        if (session.isConnected()) {
                            resolve();
                        } else {
                            reject();
                        }
                    }, 1000);
                })
            })
        })
    },

    testMultiplePauses() {
        if(!isNodeProccess) {
            return;
        }

        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password')
        .then((user) => {
            const config = {
                sync: {
                    user: user,
                    url: `realm://localhost:9080/~/${uuid()}`,
                    fullSynchronization: true,
                }
            };

            return Realm.open(config)
        }).then(realm => {
            return new Promise((resolve, reject) => {
                const session = realm.syncSession;

                waitForSessionConnected(session).then(() => {
                    session.pause();
                    session.pause();
                    session.pause();
                    setTimeout(() => {
                        if (session.isConnected()) {
                            reject();
                        } else {
                            resolve();
                        }
                    }, 1000);
                })
            })
        })
    },
}
