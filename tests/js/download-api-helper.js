/*
This script creates 3 new objects into a new realm. These are objects are validated to exists by the download api tests.
*/
'use strict';
console.log("download-api-helper started");
const appId = process.argv[2];
const appUrl = process.argv[3];
const partition = process.argv[4];
const realmModule = process.argv[5];

function trySetElectronVersion() {
    if (!process.versions || !process.env.REALM_ELECTRON_VERSION) {
        return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(process.versions, "electron");
    if (descriptor.writable) {
            process.versions.electron = process.env.REALM_ELECTRON_VERSION;
    }


    if (descriptor.set) {
            descriptor.set(process.env.REALM_ELECTRON_VERSION);
    }
}

// Ensure node-pre-gyp uses the correct binary
trySetElectronVersion();

const Realm = require(realmModule);
const { ObjectId } = Realm.BSON;

function createObjects(user) {
    const config = {
        sync: {
            user: user,
            partitionValue: partition,
            error: err => console.log(err)
        },
        schema: [{
            name: "Dog",
            primaryKey: "_id",
            properties: {
              _id: "objectId?",
              breed: "string?",
              name: "string",
              realm_id: "string?",
            }
        }]
    };

    const realm = new Realm(config);
    realm.write(() => {
        for (let i = 1; i <= 3; i++) {
            realm.create("Dog", { "_id": new ObjectId(), name: `Lassy ${i}` });
        }
    });

    let session = realm.syncSession;
    return new Promise((resolve, reject) => {
        let callback = (transferred, total) => {
            if (transferred === total) {
                session.removeProgressNotification(callback);
                resolve(realm);
            }
        }
        session.addProgressNotification("upload", "forCurrentlyOutstandingWork", callback);
    });
}

const credentials = Realm.Credentials.anonymous();
const appConfig = {
    id: appId,
    url: appUrl,
    timeout: 1000,
    app: {
        name: "default",
        version: "0"
    },
};

let app = new Realm.App(appConfig);
app.logIn(credentials)
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`download-api-helper failed:\n User login error:\n${loginError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then((realm) => { realm.close(); process.exit(0); });
