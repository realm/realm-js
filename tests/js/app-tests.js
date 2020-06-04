'use strict';

/* global navigator, WorkerNavigator */

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function node_require(module) {
    return require_method(module);
}

const { ObjectId, serialize } = require("bson");

const Realm = require('realm');
const TestCase = require('./asserts');
const AppConfig = require('./support/testConfig')

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

const config = AppConfig.integrationAppConfig;

module.exports = {
    testNewApp() {
        let app = new Realm.App(config);
        TestCase.assertInstanceOf(app, Realm.App);
    },

    async testInvalidServer() {
        const conf = {
            id: 'smurf',
            url: 'http://localhost:9999',
            timeout: 1000,
            app: {
                name: 'realm-sdk-integration-tests',
                version: '42'
            }
        };

        let app = new Realm.App(conf);
        let credentials = Realm.Credentials.anonymous();
        let failed = false;
        let user = await app.logIn(credentials).catch(err => {
            failed = true;
            TestCase.assertEqual(err.message, "request to http://localhost:9999/api/client/v2.0/app/smurf/location failed, reason: connect ECONNREFUSED 127.0.0.1:9999");
        });
        TestCase.assertEqual(failed, true);
    },

    async testNonexistingApp() {
        const conf = {
            id: 'smurf',
            url: config.url,
            timeout: 1000,
            app: {
                name: 'realm-sdk-integration-tests',
                version: '42'
            }
        };

        let app = new Realm.App(conf);
        let credentials = Realm.Credentials.anonymous();
        let failed = false;
        let user = await app.logIn(credentials).catch(err => {
            failed = true;
            TestCase.assertEqual(err.message, "cannot find app using Client App ID 'smurf'");
        });
        TestCase.assertEqual(failed, true);
    },

    async testLogIn() {
        let app = new Realm.App(config);
        TestCase.assertTrue(app instanceof Realm.App);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);
        TestCase.assertInstanceOf(user, Realm.User);
    },

    async testLogInNonexistingUser() {
        let app = new Realm.App(config);
        TestCase.assertTrue(app instanceof Realm.App);

        let credentials = Realm.Credentials.emailPassword('me', 'secret');
        var didFail = false;
        let user = await app.logIn(credentials).catch(err => {
            TestCase.assertEqual(err.message, "invalid username/password");
            TestCase.assertEqual(err.code, -1);
            didFail = true;
        });
        TestCase.assertUndefined(user);
        TestCase.assertEqual(didFail, true);
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
        TestCase.assertNull(app.currentUser());

        let credentials = Realm.Credentials.anonymous();

        let user1 = await app.logIn(credentials);
        let user2 = app.currentUser();
        TestCase.assertEqual(user1.identity, user2.identity);

        user1.logOut();
        TestCase.assertNull(app.currentUser());
    },

    async testMongoDBRealmSync() {
        let app = new Realm.App(config);

        let credentials = Realm.Credentials.anonymous();
        let user = await app.logIn(credentials);

        const realmConfig = {
            schema: [{
                name: 'Dog',
                primaryKey: '_id',
                properties: {
                  _id: 'objectId?',
                  breed: 'string?',
                  name: 'string',
                  realm_id: 'string?',
                }
              }],
            sync: {
                user: user,
                partitionValue: serialize("LoLo"),
            }
        };
        Realm.deleteFile(realmConfig);
        let realm = await Realm.open(realmConfig);
        realm.write(() => {
            realm.deleteAll();
        });
        realm.write(() => {
            realm.create("Dog", { "_id": new ObjectId("0000002a9a7969d24bea4cf5"), name: "King" });
            realm.create("Dog", { "_id": new ObjectId("0000002a9a7969d24bea4cf4"), name: "King" });
        });

        await realm.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm.objects("Dog").length, 2);
        realm.close();

        Realm.deleteFile(realmConfig);

        let realm2 = await Realm.open(realmConfig);
        await realm2.syncSession.downloadAllServerChanges();

        TestCase.assertEqual(realm2.objects("Dog").length, 2);
        realm2.close();
        user.logOut();
    }
};
