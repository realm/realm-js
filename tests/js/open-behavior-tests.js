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

function getLoggedInUser() {
    return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname("admin", true))
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
    },

    testNewFile_syncBeforeOpen_throwOnTimeOut: function() {

    },

    testExistingFile_syncBeforeOpen_throwOnTimeOut: function() {

    },

    testNewFile_syncBeforeOpen_openLocalOnTimeOut: function() {

    },

    testExistingFile_syncBeforeOpen_openLocalOnTimeOut: function () {

    },

    testCancel: function() {

    },

    testCancel_localOpen: function() {

    },

    testCancel_multipleOpenCalls: function() {

    },

    testDownloadListener: function() {

    },

    testDownloadListener_whenCanceled: function() {

    },

    testNewFileBehavior_invalidOptions: function() {

    },

    testExistingFileBehavior_invalidOptions: function() {

    },

    // testSchemaUpdatesPartialRealm: function() {
    
    //     const realmId = uuid();
    //     let realm2 = null, called = false;
    //     const config = {
    //         schema: [schemas.TestObject],
    //         sync: {
    //             url: `realm://127.0.0.1:9080/${realmId}`,
    //             fullSynchronization: false,
    //         },
    //     };
    
    //     // We need an admin user to create the reference Realm
    //     return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname("admin", true))
    //         .then(user1 => {
    //             config.sync.user = user1;
    //             const realm = new Realm(config);
    //             if (isChromeWorker) {
    //                 TestCase.assertEqual(realm.schema.length, 1); // 1 test object
    //             }
    //             else {
    //                 TestCase.assertEqual(realm.schema.length, 7); // 5 permissions, 1 results set, 1 test object
    //             }
    //             return closeAfterUpload(realm);
    //         })
    //         .then(() => {
    //             return Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous());
    //         }).then((user2) => {
    //             const dynamicConfig = {
    //                 sync: { user: user2, url: `realm://127.0.0.1:9080/${realmId}`, fullSynchronization: false },
    //             };
    //             return Realm.open(dynamicConfig);
    //         }).then((realm) => {
    //             realm2 = realm;
    //             TestCase.assertEqual(realm2.schema.length, 7); // 5 permissions, 1 results set, 1 test object
    //             realm2.addListener('schema', (realm, event, schema) => {
    //                 TestCase.assertEqual(realm2.schema.length, 8); // 5 permissions, 1 results set, 1 test object, 1 foo object
    //                 called = true;
    //             });
    
    //             config.schema.push({
    //                 name: 'Foo',
    //                 properties: {
    //                     doubleCol: 'double',
    //                 }
    //             });
    //             return Realm.open(config);
    //         }).then((realm) => {
    //             return closeAfterUpload(realm);
    //         }).then(() => {
    //             return new Promise((resolve, reject) => {
    //                 setTimeout(() => {
    //                     realm2.close();
    //                     if (called) {
    //                         resolve();
    //                     } else {
    //                         reject();
    //                     }
    //                 }, 1000);
    //             });
    //         });
    // },
};
