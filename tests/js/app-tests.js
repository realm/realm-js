'use strict';

/* global navigator, WorkerNavigator */

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function node_require(module) {
    return require_method(module);
}

const ObjectId = require('bson').ObjectId;

const Realm = require('realm');
const TestCase = require('./asserts');

const tmp = require('tmp');
const fs = require('fs');
const execFile = require('child_process').execFile;
tmp.setGracefulCleanup();
const path = require("path");

function runOutOfProcess() {
    const args = Array.prototype.slice.call(arguments);
    let tmpDir = tmp.dirSync();
    console.log(`runOutOfProcess : ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        try {
            execFile(process.execPath, args, { cwd: tmpDir.name }, (error, stdout, stderr) => {
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

const config = {
    id: 'realm-sdk-integration-tests-etyyr',
    url: 'http://localhost:9090',
    timeout: 1000,
    app: {
        name: 'realm-sdk-integration-tests',
        version: '42'
    }
};

module.exports = {
    testNewApp() {
        const config = {
            id: 'realm-sdk-integration-tests-pwjzl'
        };

        let app = new Realm.App(config);
        TestCase.assertInstanceOf(app, Realm.App);
    },

    async testLogIn() {
        let app = new Realm.App(config);
        TestCase.assertTrue(app instanceof Realm.App);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        TestCase.assertInstanceOf(user, Realm.User);
    },

    async testLogoutAndAllUsers() {
        let app = new Realm.App(config);
        let credentials = Realm.Credentials.anonymous();
        let users = app.allUsers();
        const nUsers = Object.keys(users).length;

        let user = await app.logIn(credentials);
        users = app.allUsers();
        TestCase.assertEqual(Object.keys(users).length, nUsers + 1)
        user.logOut();

        users = app.allUsers();
        TestCase.assertEqual(Object.keys(users).length, nUsers);
    },

    async testCurrentUser() {
        let app = new Realm.App(config);
        let credentials = Realm.Credentials.anonymous();

        let user1 = await app.logIn(credentials);
        let user2 = app.currentUser();

        TestCase.assertEqual(user1.identity, user2.identity);
        user1.logOut();
    },

    async testMongoDBRealmSync() {
        // {
        //     "bsonType": "object",
        //     "title": "Person",
        //     "required": [
        //       "_id",
        //       "name"
        //     ],
        //     "properties": {
        //       "name": {
        //         "bsonType": "string"
        //       },
        //       "_id": { "bsonType": "objectId" }
        //     }
        //   }


        Realm.Sync.setLogLevel('all');
        Realm.Sync.setLogger((level, message) => console.log(message));
        const appId = 'default-qfdxz';
        const appConfig = {
            id: appId,
            url: 'http://localhost:9090',
            timeout: 1000,
            app: {
                name: "default",
                version: '0'
            },
        };
        let app = new Realm.App(appConfig);
        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        const realmConfig = {
            schema: [{
                name: "Person",
                primaryKey: "_id",
                properties: {
                    "_id": "object id",
                    name: "string"
                }
            }],
            sync: {
                user: user,
                url: "ws://localhost:9090",
                appId: appId,
            }
        };

        let realm = await Realm.open(realmConfig);
        realm.write(() => {
            realm.create("Person", { "_id": new ObjectId('0000002a9a7969d24bea4cf2'), name: "Ib" });
        });

        console.log(`HEST 1: ${realm.objects("Person").length}`);
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 10000);
        });
        console.log(`HEST 2: ${realm.objects("Person").length}`);
        TestCase.assertEqual(realm.objects("Person").length, 1);
        realm.close();

        Realm.deleteFile(realmConfig);
        console.log('HEST 3');
        let realm2 = await Realm.open(realmConfig);
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 10000);
        });

        console.log("HEST 4");
        TestCase.assertEqual(realm2.objects("Person").length, 1);
        realm2.close();
        user.logOut();
    }
};