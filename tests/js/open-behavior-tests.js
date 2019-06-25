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

'use strict';

/* global navigator, WorkerNavigator */

const Realm = require('realm');
const TestCase = require('./asserts');
const schemas = require('./schemas');
const Utils = require('./test-utils');

Realm.Sync.setLogLevel('debug');

// Returns a user that looks valid but isn't able to establish a connection to the server
function getLoggedOutUser() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname("admin", true))
        .then(user => {
            const serializedUser = user.serialize();
            return user.logout().then(() => {
                return Realm.Sync.User.deserialize(serializedUser);
            });
        });
}

function getLoggedInUser(userName) {
    const userId = userName || 'admin';
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname(userId, true))
}

module.exports = {
    testNewFile_openLocal: function() {
        // When opening a local Realm, the user doesn't have to be valid.
        // If we attempted to sync this Realm with the server this test
        // would time out.
        return getLoggedOutUser()
            .then(user => {
                let config = user.createConfiguration({
                    sync: {
                        url: 'http://127.0.0.1/new_file_local_' + Utils.uuid(),
                        newRealmFileBehavior: Realm.Sync.openLocalRealmBehavior,
                        error: () => {},
                    }
                });
                TestCase.assertFalse(Realm.exists(config));
                return Realm.open(config);
            })
            .then(realm => {
                TestCase.assertDefined(realm.path);
                realm.close();
            })
    },

    testExistingFile_openLocal: function() {
        return getLoggedOutUser()
            .then(user => {
                const url = 'http://127.0.0.1/existing_file_local_' + Utils.uuid();
                let config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: {
                        url,
                        newRealmFileBehavior: Realm.Sync.openLocalRealmBehavior,
                        error: () => {},
                    }
                });
                TestCase.assertFalse(Realm.exists(config));
                const realm = new Realm(config);
                realm.write(() => {
                    realm.create(schemas.TestObject.name, {'doubleCol': 42.123});
                });
                realm.close();

                // Re-open the Realm
                config = user.createConfiguration({
                    sync: {
                        url,
                        existingRealmFileBehavior: {
                            type: 'openImmediately'
                        }
                    }
                });

                return Realm.open(config);
            })
            .then(realm => {
                TestCase.assertTrue(realm.objects(schemas.TestObject.name).length == 1);
                realm.close();
            });
    },

    testNewFile_downloadBeforeOpen: function() {
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'downloadBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/new_realm_' + Utils.uuid()
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                TestCase.assertTrue(realm.empty)
                realm.close();
            });
    },

    testExistingFile_downloadBeforeOpen: function() {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with `existingRealmFileBehavior = syncWhenOpen`
        const realmName = 'existing_realm_' + Utils.uuid();
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
                            type: 'downloadBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/' + realmName
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                TestCase.assertTrue(userRealm.objects(schemas.TestObject.name).length === 1);
            })
    },

    testNewFile_downloadBeforeOpen_throwOnTimeOut: function() {
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    sync: {
                        fullSynchronization: true,
                        _sessionStopPolicy: 'immediately',
                        newRealmFileBehavior: {
                            type: 'downloadBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'throwException'
                        },
                        url: 'realm://127.0.0.1:9080/sync_before_open_' + Utils.uuid()
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

    testExistingFile_downloadBeforeOpen_throwOnTimeOut: function() {
        const realmName = 'sync_timeout_throw_' + Utils.uuid();
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
                            type: 'downloadBeforeOpen',
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

    testNewFile_downloadBeforeOpen_openLocalOnTimeOut: function() {
        // 1. Add data to server Realm from User 1
        // 2. Open Realm with User 2
        // 3. Timeout and check that the returned Realm is empty.
        const realmName = 'sync_timeout_open_' + Utils.uuid();
        const syncConfig = {
            fullSynchronization: true,
            _sessionStopPolicy: 'immediately',
            url: 'realm://127.0.0.1:9080/' + realmName,
        };
        return getLoggedInUser("User1")
            .then(user1 => {
                const config = user1.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: syncConfig,
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
                        ...syncConfig,
                        newRealmFileBehavior: {
                            type: 'downloadBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'openLocal'
                        },
                    }
                });
                return Realm.open(config);
            })
            .then(realm => {
                const user = realm.syncSession.user;
                TestCase.assertEqual(0, realm.objects(schemas.TestObject.name).length);
                realm.close();
                // Wait for the download to complete so that we don't call
                // clearTestState() while a download is in progress
                return Realm.open(user.createConfiguration({sync: syncConfig}));
            })
            .then(r => r.close());
    },

    testExistingFile_downloadBeforeOpen_openLocalOnTimeOut: function () {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with timeOut and localOpen, Realm should still be empty.
        const realmName = 'existing_realm_' + Utils.uuid();
        const syncConfig = {
            fullSynchronization: true,
            _sessionStopPolicy: 'immediately',
            url: 'realm://127.0.0.1:9080/' + realmName,
        };
        return getLoggedInUser()
            .then(user => {
                const config = user.createConfiguration({
                    schema: [schemas.TestObject],
                    sync: syncConfig,
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
                    sync: syncConfig,
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
                        ...syncConfig,
                        existingRealmFileBehavior: {
                            type: 'downloadBeforeOpen',
                            timeOut: 0,
                            timeOutBehavior: 'openLocal'
                        },
                    }
                });
                return Realm.open(config);
            })
            .then(userRealm => {
                const user = userRealm.syncSession.user;
                TestCase.assertTrue(userRealm.objects(schemas.TestObject.name).length === 0);
                // Wait for the download to complete so that we don't call
                // clearTestState() while a download is in progress
                return Realm.open(user.createConfiguration({sync: syncConfig}));
            })
            .then(r => r.close());
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
                            type: 'downloadBeforeOpen'
                        },
                        url: 'realm://127.0.0.1:9080/new_realm_' + Utils.uuid()
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
                reject("An error was thrown after open was canceled: " + e.message);
            });
        });

        // Wait for 1 second after canceling. The open promise should not emit any events in that period.
        let timeOutPromise = new Promise(resolve => setTimeout(resolve, 1000));
        return Promise.race([openPromise, timeOutPromise]);
    },

    testCancel_multipleOpenCalls: function() {
        // Due to us sharing the same session for each URL, canceling a download will cancel all current
        // calls to the same URL. This is probably acceptable for this use case.
        return getLoggedInUser()
        .then(user => {
            const config = user.createConfiguration({
                sync: {
                    fullSynchronization: true,
                    _sessionStopPolicy: 'immediately',
                    newRealmFileBehavior: {
                        type: 'downloadBeforeOpen'
                    },
                    url: 'realm://127.0.0.1:9080/new_realm_' + Utils.uuid()
                }
            });

            let openPromise1 = Realm.open(config);
            let openPromise2 = Realm.open(config);
            openPromise1.cancel(); // Will cancel both promise 1 and 2 at the native level.

            return openPromise2.catch(e => {
                TestCase.assertEqual(e.message, "Operation canceled");
            })
        })
    },

    // testDownloadListener: function() {
    //     return new Promise(resolve => {
    //         return getLoggedInUser().then(user => {
    //             const config = user.createConfiguration({
    //                 sync: {
    //                     fullSynchronization: true,
    //                     _sessionStopPolicy: 'immediately',
    //                     newRealmFileBehavior: {
    //                         type: 'downloadBeforeOpen'
    //                     },
    //                     url: 'realm://127.0.0.1:9080/downloadlistener_' + Utils.uuid()
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
                            type: 'downloadBeforeOpen',
                        },
                        url: 'realm://127.0.0.1:9080/downloadlistener_cancel_' + Utils.uuid()
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
        let timeOutPromise = new Promise(resolve => setTimeout(resolve, 1000));
        return Promise.race([timeOutPromise, openPromise]);
    },

    testBehavior_invalidOptions: function() {
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
        });
    },
};
