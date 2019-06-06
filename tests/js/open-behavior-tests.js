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

'use strict';

/* global navigator, WorkerNavigator */

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function nodeRequire(module) {
    return require_method(module);
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function closeAfterUpload(realm) {
    return realm.syncSession.uploadAllLocalChanges().then(() => realm.close());
}

// Returns a user that looks valid but isn't able to establish a connection to the server
function getLoggedOutUser() {
    return new Promise((resolve, reject) => {
        return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname("admin", true))
            .then(user => {
                const serializedUser = user.serialize();
                return user.logout().then(() => {
                    resolve(Realm.Sync.User.deserialize(serializedUser));
                });
            });
    });
}

function getLoggedInUser(userName) {
    const userId = (userName === undefined) ? 'admin' : userName;
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname(userId, true))
}

const Realm = require('realm');
const TestCase = require('./asserts');
const schemas = require('./schemas');

let pathSeparator = '/';
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isChromeWorker = !isNodeProcess && typeof WorkerGlobalScope !== 'undefined' && navigator instanceof WorkerNavigator;
if (isNodeProcess && process.platform === 'win32') {
    pathSeparator = '\\';
}

const fs = isNodeProcess ? nodeRequire('fs-extra') : require('react-native-fs');

Realm.Sync.setLogLevel('debug');

module.exports = {

    testNewFile_openLocal: function() {
        // When opening a local Realm, the user doesn't have to be valid.
        // If we attempted to sync this Realm with the server this test 
        // would time out.
        return getLoggedOutUser()
            .then(user => {
                let config = user.createConfiguration({
                    sync: {
                        url: 'http://127.0.0.1/new_file_local_' + uuid(),
                        newRealmFileBehavior: Realm.Sync.openLocalRealmBehavior
                    }
                });
                TestCase.assertFalse(Realm.exists(config));
                return Realm.open(config);
            })
            .then(realm => {
                TestCase.assertTrue(realm.path !== undefined);
                realm.close();
                return new Promise((resolve) => {
                    resolve();
                });
            })
    },

    testExistingFile_openLocal: function() {
        return getLoggedOutUser()
            .then(user => {
                let config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        newRealmFileBehavior: Realm.Sync.openLocalRealmBehavior,
                    }
                });
                TestCase.assertFalse(Realm.exists(config));
                const realm = new Realm(config);
                realm.write(() => {
                    realm.create(schemas.TestObject.name, {'doubleCol': 42.123});
                });
                realm.close();

                // Re-open the Realm
                config = Realm.Sync.User.current.createConfiguration({
                    sync: {
                        existingRealmFileBehavior: {
                            type: 'openImmediately'
                        } 
                    }
                });

                return Realm.open(config);
            })
            .then(realm => {
                return new Promise((resolve) => { 
                    TestCase.assertTrue(realm.objects(schemas.TestObject.name).length == 1);
                    realm.close();
                    resolve();
                });
            });
    },

    testNewFile_syncBeforeOpen: function() {
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/new_realm_' + uuid()
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                return new Promise((resolve) => {
                    TestCase.assertTrue(realm.empty)
                    realm.close();
                    resolve();
                });
            });
    },

    testExistingFile_syncBeforeOpen: function() {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with `existingRealmFileBehavior = syncWhenOpen`
        const realmName = 'existing_realm_' + uuid();
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                userRealm.close();
                return getLoggedInUser('other_admin');
            })
            .then(otherUser => {
                const config = otherUser.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(otherUserRealm => {
                otherUserRealm.write(() => {
                    otherUserRealm.create(schemas.TestObject.name, { doubleCol: 42.133 });
                });
                return otherUserRealm.syncSession.uploadAllLocalChanges().then(() => {
                    otherUserRealm.close();
                });
            })
            .then(() => {
                return getLoggedInUser();
            })
            .then(user => {
                const config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        existingRealmBehavior: {
                            type: 'syncBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                return new Promise(resolve => {
                    TestCase.assertTrue(userRealm.objects(schemas.TestObject.name).length === 1);
                    resolve();
                })
            })
    },

    testNewFile_syncBeforeOpen_throwOnTimeOut: function() {
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'throwException'
                        },
                        url: 'realm://127.0.0.1:9080/sync_before_open_' + uuid()
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                realm.close();
                throw new Error("It shouldn't be posssible to open the Realm");
            })
            .catch(e => {
                TestCase.assertTrue(e.message.includes('could not be downloaded in the allocated time'));
            });
    },

    testExistingFile_syncBeforeOpen_throwOnTimeOut: function() {
        const realmName = 'sync_timeout_throw_' + uuid();
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                realm.close();
                const config = Realm.Sync.User.current.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        existingRealmFileBehavior: {
                            type: 'syncBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'throwException'
                        },
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                throw Error("Realm should fail to open.");
            })
            .catch(e => {
                TestCase.assertTrue(e.message.includes('could not be downloaded in the allocated time'));
            });
    },

    testNewFile_syncBeforeOpen_openLocalOnTimeOut: function() {
        // 1. Add data to server Realm from User 1
        // 2. Open Realm with User 2
        // 3. Timeout and check that the returned Realm is empty.
        const realmName = 'sync_timeout_open_' + uuid();
        return getLoggedInUser("User1")
            .then(user1 => {
                const config = user1.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                realm.write(() => {
                    realm.create(schemas.TestObject.name, { doubleCol: 42.123 });
                });
                return realm.syncSession.uploadAllLocalChanges().then(() => {
                    realm.close();
                });
            })
            .then(() => {
                return getLoggedInUser("User2");
            })
            .then(user2 => {
                const config = user2.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'openLocal'
                        },
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                return new Promise(resolve => {
                    TestCase.assertEqual(0, realm.objects(schemas.TestObject.name).length);
                    realm.close();
                    resolve();
                })
            });
    },

    testExistingFile_syncBeforeOpen_openLocalOnTimeOut: function () {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with timeOut and localOpen, Realm should still be empty.
        const realmName = 'existing_realm_' + uuid();
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                userRealm.close();
                return getLoggedInUser('other_admin');
            })
            .then(otherUser => {
                const config = otherUser.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(otherUserRealm => {
                otherUserRealm.write(() => {
                    otherUserRealm.create(schemas.TestObject.name, { doubleCol: 42.133 });
                });
                return otherUserRealm.syncSession.uploadAllLocalChanges().then(() => {
                    otherUserRealm.close();
                });
            })
            .then(() => {
                return getLoggedInUser();
            })
            .then(user => {
                const config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        existingRealmFileBehavior: {
                            type: 'syncBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'openLocal'
                        },
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                return new Promise(resolve => {
                    TestCase.assertTrue(userRealm.objects(schemas.TestObject.name).length === 0);
                    resolve();
                })
            })
    },

    testCancel: function() {
        let openPromise = new Promise((resolve, reject) => {
            return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/new_realm_' + uuid()
                    }
                });
                
                let promise = Realm.open(config);
                promise.cancel();
                return promise;
            })
            .then(realm => {
                reject("Realm was opened after being canceled");
            })
            .catch(e => {
                reject("An erro was thrown after open was canceled: " + e.message);
            });
        });

        // Wait for 1 second after canceling. The open promise should not emit any events in that period.
        let timeOutPromise = new Promise((resolve, reject) => {
            let wait = setTimeout(() => {
                clearTimeout(wait);
                resolve();
            }, 1000);
        });
        return Promise.race([openPromise, timeOutPromise]);
    },

    testCancel_multipleOpenCalls: function() {
        // Due to us sharing the same session for each URL, canceling a download will cancel all current
        // calls to the same URL. This is probably acceptable for this use case.
        let openPromise = new Promise((resolve, reject) => {
            return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/new_realm_' + uuid()
                    }
                });
                
                let openPromise1 = Realm.open(config);
                let openPromise2 = Realm.open(config);
                openPromise1.cancel(); // Will cancel both promise 1 and 2 at the native level.

                // Waiting 1 second should be enough for two other promises to finish.
                let timeOutPromise = new Promise((resolve, reject) => {
                    let wait = setTimeout(() => {
                        clearTimeout(wait);
                        resolve("Success");
                    }, 1000);
                });

                return Promise.race([openPromise1, openPromise2, timeOutPromise]);
            })
            .then(result => {
                TestCase.assertEqual("Success", result);
                resolve();
            })
        });
    },

    // testDownloadListener: function() {
    //     return new Promise(resolve => {
    //         return getLoggedInUser().then(user => {
    //             const config = user.createConfiguration({
    //                 sync: {
    //                     fullSynchronization: true,
    //                     _sessionStopPolicy: 'immediately',
    //                     newRealmFileBehavior: {
    //                         type: 'syncBeforeOpen'
    //                     },
    //                     url: 'realm://127.0.0.1:9080/downloadlistener_' + uuid()
    //                 }
    //             });
    //             return Realm.open(config).progress((transferred, transferable) => {
    //                 console.log(transferred + ", " + transferable);
    //                 if (transferred > 0 && transferred === transferable) {
    //                     resolve();
    //                 }
    //             });
    //         })
    //     });
    // },

    testDownloadListener_whenCanceled: function() {
        let openPromise = new Promise((resolve, reject) => {
            return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'syncBeforeOpen',
                        },
                        url: 'realm://127.0.0.1:9080/downloadlistener_cancel_' + uuid()
                    }
                });
                let promise = Realm.open(config);
                promise.progress((transferred, transferable) => {
                    reject("Progress listener called"); 
                });
                promise.cancel();
                return promise;
            })
            .then(() => {
                reject("Realm was opened after being canceled");
            })
            .catch(e => {
                reject("An error was thrown after open was canceled: " + e.message);
            });
        });

        // Wait for 1 second after canceling. The open promise should not emit any events in that period.
        let timeOutPromise = new Promise((resolve, reject) => {
            let wait = setTimeout(() => {
                clearTimeout(wait);
                resolve();
            }, 1000);
        });

        return Promise.race[timeOutPromise, openPromise];
    },

    testBehavior_invalidOptions: function() {
        return new Promise((resolve, reject) => {
            return getLoggedInUser().then(user => {

                // New file behavior tests
                let config = user.createConfiguration({ sync: { newRealmFileBehavior: { type: 'foo' } } });
                TestCase.assertThrows(() => Realm.open(config));

                config = user.createConfiguration({ 
                    sync: { 
                        newRealmFileBehavior: { 
                            type: 'openLocal',
                            timeOutBehavior: 'foo' 
                        } 
                    } 
                });
                TestCase.assertThrows(() => Realm.open(config));

                config = user.createConfiguration({ 
                    sync: { 
                        newRealmFileBehavior: { 
                            type: 'openLocal',
                            timeOut: 'bar'
                        } 
                    } 
                });
                TestCase.assertThrows(() => Realm.open(config));
                resolve();
            });
        });
    },
};
