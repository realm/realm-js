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
console.log("isnode " + isNodeProccess + " typeof " + typeof process === 'object');
function node_require(module) {
    return require(module);
}  

let tmp;
let fs;
let execFile;

if (isNodeProccess) {
    tmp = node_require('tmp');
    fs = node_require('fs');
    execFile = node_require('child_process').execFile;
    tmp.setGracefulCleanup();
}


function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function promisifiedRegister(server, username, password) {
    return new Promise((resolve, reject) => {
        Realm.Sync.User.register(server, username, password, (error, user) => {
            if (error) {
                console.log(`promisifiedRegister ${error}`);
                reject(error);
            } else {
                resolve(user);
            }
        });
    });
}

function promisifiedLogin(server, username, password) {
    return new Promise((resolve, reject) => {
        Realm.Sync.User.login(server, username, password, (error, user) => {
            if (error) {
                console.log(`promisifiedLogin ${error}`);
                reject(error);
            } else {
                resolve(user);
            }
        });
    });
}

function runOutOfProcess(nodeJsFilePath) {
    var nodeArgs = Array.prototype.slice.call(arguments);
    let tmpDir = tmp.dirSync();
    let content = fs.readFileSync(nodeJsFilePath, 'utf8');
    let tmpFile = tmp.fileSync({ dir: tmpDir.name });
    fs.appendFileSync(tmpFile.fd, content, { encoding: 'utf8' });
    nodeArgs[0] = tmpFile.name;
    return new Promise((resolve, reject) => {
        const child = execFile('node', nodeArgs, { cwd: tmpDir.name }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Error executing ${nodeJsFilePath} Error: ${error}`));
            }
            resolve();
        });
    })
}

module.exports = {

    testLocalRealmHasNoSession() {
        let realm = new Realm();
        TestCase.assertNull(realm.syncSession);
    },

    testProperties() {
        return promisifiedRegister('http://localhost:9080', uuid(), 'password').then(user => {
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
            return Promise.resolve();
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return promisifiedLogin('http://localhost:9080', username, 'password').then(user => {
                    const accessTokenRefreshed = this;
                    let successCounter = 0;

                    let config = {
                        sync: { user, url: `realm://localhost:9080/~/${realmName}` },
                        schema: [{ name: 'Dog', properties: { name: 'string' } }],
                    };

                    return Realm.open(config)
                        .then(realm => {
                            let actualObjectsCount = realm.objects('Dog').length;
                            TestCase.assertEqual(actualObjectsCount, expectedObjectsCount, "Synced realm does not contain the expected objects count");
                            return realm.syncSession;
                        }).then(session => {
                            TestCase.assertInstanceOf(session, Realm.Sync.Session);
                            TestCase.assertEqual(session.user.identity, user.identity);
                            TestCase.assertEqual(session.config.url, config.sync.url);
                            TestCase.assertEqual(session.config.user.identity, config.sync.user.identity);
                            TestCase.assertEqual(session.state, 'active');
                        });
                });
            });
    },

    testRealmOpenAsync() {
        if (!isNodeProccess) {
            return Promise.resolve();
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return promisifiedLogin('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        const accessTokenRefreshed = this;
                        let successCounter = 0;

                        let config = {
                            sync: { user, url: `realm://localhost:9080/~/${realmName}` },
                            schema: [{ name: 'Dog', properties: { name: 'string' } }],
                        };

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
            });
    },

    testProgressNotificationsForRealmOpen() {
        if (!isNodeProccess) {
            return Promise.resolve();
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return promisifiedLogin('http://localhost:9080', username, 'password').then(user => {
                    const accessTokenRefreshed = this;
                    let successCounter = 0;
                    let progressNotificationCalled = false;
                    let config = {
                        sync: {
                            user,
                            url: `realm://localhost:9080/~/${realmName}`,
                            _onDownloadProgress: (transferred, total) => {
                                progressNotificationCalled = true
                            },
                        },
                        schema: [{ name: 'Dog', properties: { name: 'string' } }],
                    };

                    return Realm.open(config)
                        .then(realm => {
                        }).then(session => {
                            TestCase.assertTrue(progressNotificationCalled, "Progress notification not called for Realm.open");
                        });
                });
            });
    },
    
    testProgressNotificationsForRealmOpenAsync() {
        if (!isNodeProccess) {
            return Promise.resolve();
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

        runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return promisifiedLogin('http://localhost:9080', username, 'password').then(user => {
                    return new Promise((resolve, reject) => {
                        let progressNotificationCalled = false;
                        let config = {
                            sync: { user, url: `realm://localhost:9080/~/${realmName}`,
                                _onDownloadProgress: (transferred, total) => { 
                                    progressNotificationCalled = true
                                },
                            },
                            schema: [{ name: 'Dog', properties: { name: 'string' } }],
                        };

                        Realm.openAsync(config, (error, realm) => {
                            try {
                                if (error) {
                                    reject(error);
                                }

                                setTimeout(() => {
                                    try {
                                        TestCase.assertTrue(progressNotificationCalled, "Progress notification not called for Realm.openAsync");
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
            });
    },

    testRealmOpenAsyncNoSchema() {
        if (!isNodeProccess) {
            return Promise.resolve();
        }

        const username = uuid();
        const realmName = uuid();
        const expectedObjectsCount = 3;

       runOutOfProcess(__dirname + '/download-api-helper.js', username, realmName, REALM_MODULE_PATH)
            .then(() => {
                return promisifiedLogin('http://localhost:9080', username, 'password').then(user => {
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
        return promisifiedRegister('http://localhost:9080', uuid(), 'password').then(user => {
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
    }
}