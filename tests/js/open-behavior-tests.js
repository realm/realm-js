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

"use strict";

/* global navigator, WorkerNavigator */

const Realm = require("realm");
const { ObjectId } = require("bson");
const TestCase = require("./asserts");
const schemas = require("./schemas");
const Utils = require("./test-utils");
const AppConfig = require("./support/testConfig");
const user = require("../../lib/user");

const APP_CONFIG = AppConfig.integrationAppConfig;

class TestError extends Error {
    constructor(message) {
        super(message)
    }
}

const createSyncConfig = (sync, clearLocalFile = true) => {
    const config = { schema: [schemas.DogForSync], sync };
    if (clearLocalFile) {
        // By default clean any previous test file.
        Realm.deleteFile(config);
    }
    return config;
}

module.exports = {
    testNewFile_openLocal: async function() {
        // NOTE: this test no longer runs with a logged out user.
        // Reason: Error: User is no longer valid.

        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior
        });

        console.log("testNewFile_openLocal", config);

        TestCase.assertFalse(Realm.exists(config));
        const realm = await Realm.open(config);

        TestCase.assertDefined(realm.path);

        realm.close();
        await user.logOut();
    },

    testExistingFile_openLocal: async function() {
        // NOTE: this test no longer runs with a logged out user.
        // Reason: Error: User is no longer valid.

        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        {
            const config = createSyncConfig({
                user,
                partitionValue,
                newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior
            });

            TestCase.assertFalse(Realm.exists(config));

            const realm = new Realm(config);
            realm.write(() => {
                realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Bella" });
            });
            realm.close();
        }

        {
            const config = createSyncConfig({
                user,
                partitionValue,
                existingRealmFileBehavior: { type: "openImmediately" }
            }, false);

            const realm = await Realm.open(config);

            TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 1);

            realm.close();
        }

        await user.logOut();
    },

    testNewFile_downloadBeforeOpen: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "downloadBeforeOpen" }
        });

        const realm = await Realm.open(config);

        // TODO: Not quite sure what we're testing here?
        TestCase.assertTrue(realm.empty);

        realm.close();
        await user.logOut();
    },

    testExistingFile_downloadBeforeOpen: async function() {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with `existingRealmFileBehavior = syncWhenOpen`

        const app = new Realm.App(APP_CONFIG);
        const partitionValue = Utils.genPartition();

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);

            realm.close();
            await user.logOut();
        }

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);

            realm.write(() => {
                realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Milo" });
            });

            await realm.syncSession.uploadAllLocalChanges();

            realm.close();
            await user.logOut();
        }

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately",
                existingRealmBehavior: { type: "downloadBeforeOpen" }
            });

            const realm = await Realm.open(config);

            TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 1);

            realm.close();
            await user.logOut();
        }
    },

    testNewFile_downloadBeforeOpen_throwOnTimeOut: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: {
                type: "downloadBeforeOpen",
                timeOut: 0,
                timeOutBehavior: "throwException"
            }
        });

        await TestCase.assertThrowsAsyncContaining(
            async () => {
                const realm = await Realm.open(config);
                realm.close();
            },
            "could not be downloaded in the allocated time"
        );

        await user.logOut();
        // try {
        //     const realm = await Realm.open(config)
        //     realm.close();
        //     throw new TestError("Realm did not fail to open.");
        // } catch (err) {
        //     TestCase.assertTrue(err.message.includes("could not be downloaded in the allocated time"));
        // } finally {
        // }
    },

    testExistingFile_downloadBeforeOpen_throwOnTimeOut: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        {
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);
            realm.close();
        }

        {
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately",
                existingRealmFileBehavior: {
                    type: "downloadBeforeOpen",
                    timeOut: 0,
                    timeOutBehavior: "throwException"
                }
            });

            // ERROR: This currently does NOT throw.
            // NOTE: Are "timeOut"/"timeOutBehavior" ignored?
            await TestCase.assertThrowsAsyncContaining(
                async () => {
                    const realm = await Realm.open(config);
                    realm.close();
                },
                "could not be downloaded in the allocated time"
            );

            // try {
            //     const realm = await Realm.open(config);
            //     realm.close();
            //     throw new TestError("Realm did not fail to open.");
            // } catch (err) {
            //     console.log("testExistingFile_downloadBeforeOpen_throwOnTimeOut err", err);
            //     TestCase.assertTrue(err.message.includes("could not be downloaded in the allocated time"));
            // }
        }

        await user.logOut();
    },

    testNewFile_downloadBeforeOpen_openLocalOnTimeOut: async function() {
        // 1. Add data to server Realm from User 1
        // 2. Open Realm with User 2
        // 3. Timeout and check that the returned Realm is empty.

        const app = new Realm.App(APP_CONFIG);
        const partitionValue = Utils.genPartition();

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);

            realm.write(() => {
                realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Lola" });
            });

            await realm.syncSession.uploadAllLocalChanges();

            realm.close();
            await user.logOut();
        }

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately",
                newRealmFileBehavior: {
                    type: "downloadBeforeOpen",
                    timeOut: 0,
                    timeOutBehavior: "openLocal"
                }
            });

            const realm = await Realm.open(config);

            TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 0);

            realm.close();

            // Wait for the download to complete so that we don't call
            // clearTestState() while a download is in progress
            const cleanUpRealm = await Realm.open({
                schema: [schemas.DogForSync],
                sync: {
                    user,
                    partitionValue,
                    _sessionStopPolicy: "immediately"
                }
            });
            cleanUpRealm.close();

            await user.logOut();
        }
    },

    testExistingFile_downloadBeforeOpen_openLocalOnTimeOut: async function () {
        // 1. Open empty Realm
        // 2. Close Realm
        // 3. Let other user upload changes to the Realm on the server.
        // 4. Re-open empty Realm with timeOut and localOpen, Realm should still be empty.

        const app = new Realm.App(APP_CONFIG);
        const partitionValue = Utils.genPartition();

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);

            realm.close();
            await user.logOut();
        }

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately"
            });

            const realm = await Realm.open(config);

            realm.write(() => {
                realm.create(schemas.DogForSync.name, { _id: new ObjectId(), name: "Molly" });
            });

            await realm.syncSession.uploadAllLocalChanges();

            realm.close();
            await user.logOut();
        }

        {
            const user = await app.logIn(Realm.Credentials.anonymous());
            const config = createSyncConfig({
                user,
                partitionValue,
                _sessionStopPolicy: "immediately",
                existingRealmFileBehavior: {
                    type: "downloadBeforeOpen",
                    timeOut: 0,
                    timeOutBehavior: "openLocal"
                }
            });
            const realm = await Realm.open(config);

            // ERROR: This currently fails... Error: '1' does not equal expected value '0'
            // NOTE: Are "timeOut"/"timeOutBehavior" ignored?
            TestCase.assertEqual(realm.objects(schemas.DogForSync.name).length, 0);

            realm.close();

            // Wait for the download to complete so that we don't call
            // clearTestState() while a download is in progress
            const cleanUpRealm = await Realm.open({
                schema: [schemas.DogForSync],
                sync: {
                    user,
                    partitionValue,
                    _sessionStopPolicy: "immediately"
                }
            });
            cleanUpRealm.close();

            await user.logOut();
        }
    },

    testCancel: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "downloadBeforeOpen" }
        });

        const openPromise = new Promise((resolve, reject) => {
            const promise = Realm.open(config);
            promise.cancel();
            return promise;
        });

        openPromise
            .then(() => { throw new TestError("Realm was opened after being canceled."); })
            .catch(err => { throw new TestError("An error was thrown after open was canceled: " + err.message); });

        // Wait for 1 second after canceling. The open promise should not emit any events in that period.
        const timeOutPromise = new Promise(resolve => setTimeout(resolve, 1000));

        const any = Promise.race([openPromise, timeOutPromise]);

        return any.finally(() => user.logOut());
    },

    testCancel_multipleOpenCalls: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "downloadBeforeOpen" }
        });

        const openPromise1 = Realm.open(config);
        const openPromise2 = Realm.open(config);

        openPromise1.cancel(); // Will cancel both promise 1 and 2 at the native level.

        try {
            await openPromise2;
            throw new TestError("openPromise2 should have been rejected..");
        } catch (err) {
            TestCase.assertEqual(err.message, "Operation canceled");
        }
    },

    testDownloadListener_whenCanceled: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        const config = createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "downloadBeforeOpen" }
        });

        const openPromise = new Promise((resolve, reject) => {
            const promise = Realm.open(config);
            // TODO: could this potentially trigger before canceling?
            promise.progress(() => {
                reject("Progress listener called");
            });
            promise.cancel();
            return promise;
        });

        openPromise
            .then(() => { throw new TestError("Realm was opened after being canceled."); })
            .catch(err => { throw new TestError("An error was thrown after open was canceled: " + err.message); });

        // Wait for 1 second after canceling. The open promise should not emit any events in that period.
        const timeOutPromise = new Promise(resolve => setTimeout(resolve, 1000));

        const any = Promise.race([timeOutPromise, openPromise]);

        return any.finally(() => user.logOut());
    },

    testBehavior_invalidOptions: async function() {
        const app = new Realm.App(APP_CONFIG);
        const user = await app.logIn(Realm.Credentials.anonymous());
        const partitionValue = Utils.genPartition();

        await TestCase.assertThrowsAsync(() => Realm.open(createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "foo" } // this should fail
        })));

        await TestCase.assertThrowsAsync(() => Realm.open(createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "openLocal", timeOutBehavior: "foo" } // this should fail
        })));

        await TestCase.assertThrowsAsync(() => Realm.open(createSyncConfig({
            user,
            partitionValue,
            _sessionStopPolicy: "immediately",
            newRealmFileBehavior: { type: "openLocal", timeOut: "bar" } // this should fail
        })));

        await user.logOut();
    },
};
