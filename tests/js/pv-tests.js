////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const Realm = require("realm");
const TestCase = require("./asserts");
const AppConfig = require("./support/testConfig");
const { ObjectId, UUID } = Realm.BSON;

const PvIntDog = {
    name: "Dog",
    primaryKey: "_id",
    properties: {
        _id: "objectId?", // NOTE: this needs to be changed to non-optional in the docker image.
        breed: "string?",
        name: "string",
        realm_id: "int?"
    }
};

const PvStringDog = {
    name: "Dog",
    primaryKey: "_id",
    properties: {
        _id: "objectId?", // NOTE: this needs to be changed to non-optional in the docker image.
        breed: "string?",
        name: "string",
        realm_id: "string?"
    }
};

const PvUuidDog = {
    name: "Dog",
    primaryKey: "_id",
    properties: {
        _id: "objectId?", // NOTE: this needs to be changed to non-optional in the docker image.
        breed: "string?",
        name: "string",
        realm_id: "uuid?"
    }
};

const PvObjectidDog = {
    name: "Dog",
    primaryKey: "_id",
    properties: {
        _id: "objectId?", // NOTE: this needs to be changed to non-optional in the docker image.
        breed: "string?",
        name: "string",
        realm_id: "objectId?"
    }
};

module.exports = {
    async testPvInt() {
        let app = new Realm.App(AppConfig.pvIntAppConfig);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        const realmConfig = {
            schema: [PvIntDog],
            sync: {
                user: user,
                partitionValue: 42,
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            }
        };

        Realm.deleteFile(realmConfig);
        let realm1 = await Realm.open(realmConfig);
        realm1.write(() => {
            realm1.create("Dog", { "_id": new ObjectId(), name: "King" });
        });

        await realm1.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm1.objects("Dog").length, 1);
        realm1.close();

        Realm.deleteFile(realmConfig);

        let realm2 = await Realm.open(realmConfig);
        await realm2.syncSession.downloadAllServerChanges();

        let dogs = realm2.objects("Dog");
        TestCase.assertEqual(dogs.length, 1);

        realm2.close();
        await user.logOut();
    },

    async testPvString() {
        let app = new Realm.App(AppConfig.pvStringAppConfig);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        const realmConfig = {
            schema: [PvStringDog],
            sync: {
                user: user,
                partitionValue: "42",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            }
        };

        Realm.deleteFile(realmConfig);
        let realm1 = await Realm.open(realmConfig);
        realm1.write(() => {
            realm1.create("Dog", { "_id": new ObjectId(), name: "King" });
        });

        await realm1.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm1.objects("Dog").length, 1);
        realm1.close();

        Realm.deleteFile(realmConfig);

        let realm2 = await Realm.open(realmConfig);
        await realm2.syncSession.downloadAllServerChanges();

        let dogs = realm2.objects("Dog");
        TestCase.assertEqual(dogs.length, 1);

        realm2.close();
        await user.logOut();
    },

    /*async testUuidString() {
        let app = new Realm.App(AppConfig.pvUuidAppConfig);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        const realmConfig = {
            schema: [PvUuidDog],
            sync: {
                user: user,
                partitionValue: new UUID(),
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            }
        };

        Realm.deleteFile(realmConfig);
        let realm1 = await Realm.open(realmConfig);
        realm1.write(() => {
            realm1.create("Dog", { "_id": new ObjectId(), name: "King" });
        });

        await realm1.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm1.objects("Dog").length, 1);
        realm1.close();

        Realm.deleteFile(realmConfig);

        let realm2 = await Realm.open(realmConfig);
        await realm2.syncSession.downloadAllServerChanges();

        let dogs = realm2.objects("Dog");
        TestCase.assertEqual(dogs.length, 1);

        realm2.close();
        await user.logOut();
    },*/

    async testObjectidString() {
        let app = new Realm.App(AppConfig.pvObjectidAppConfig);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        const realmConfig = {
            schema: [PvObjectidDog],
            sync: {
                user: user,
                partitionValue: new ObjectId(),
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            }
        };

        Realm.deleteFile(realmConfig);
        let realm1 = await Realm.open(realmConfig);
        realm1.write(() => {
            realm1.create("Dog", { "_id": new ObjectId(), name: "King" });
        });

        await realm1.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm1.objects("Dog").length, 1);
        realm1.close();

        Realm.deleteFile(realmConfig);

        let realm2 = await Realm.open(realmConfig);
        await realm2.syncSession.downloadAllServerChanges();

        let dogs = realm2.objects("Dog");
        TestCase.assertEqual(dogs.length, 1);

        realm2.close();
        await user.logOut();
    },
}