/*
This script creates 3 new objects into a new realm. These are objects are validated to exists by the download api tests.
*/
'use strict';
console.log("download-api-helper started");
const username = process.argv[2];
const realmName = process.argv[3];
const realmModule = process.argv[4];

const Realm = require(realmModule);

function createObjects(user) {
    const config = {
        sync: {
            user: user,
            url: `realm://localhost:9080/~/${realmName}`,
            error: err => console.log(err)
        },
        schema: [{ name: 'Dog', properties: { name: 'string' } }]
    };

    const realm = new Realm(config);
    realm.write(() => {
        for (let i = 1; i <= 3; i++) {
            realm.create('Dog', { name: `Lassy ${i}` });
        }
    });

    console.log("Dogs count " + realm.objects('Dog').length);

    let session = realm.syncSession;
    return new Promise((resolve, reject) => {
        let callback = (transferred, total) => {
            if (transferred === total) {
                session.removeProgressNotification(callback);
                resolve(realm);
            }
        }
        session.addProgressNotification('upload', 'forCurrentlyOutstandingWork', callback);
    });
}

const credentials = Realm.Sync.Credentials.nickname(username);
Realm.Sync.User.login('http://localhost:9080', credentials)
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`download-api-helper failed:\n User login error:\n${loginError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then(() => process.exit(0));
