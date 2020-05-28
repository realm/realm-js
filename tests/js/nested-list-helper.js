/*
This script creates new nested objects into a new Realm.
*/

'use strict';
console.log("nested-list-helper started");
const username = process.argv[3];
const realmName = process.argv[4];
const realmModule = process.argv[5];

const Realm = require(realmModule);

let schemas = {};
schemas.ParentObject = {
    name: 'ParentObject',
    properties: {
        id:            'int',
        name:          'NameObject[]'
    }
};

schemas.NameObject = {
    name: 'NameObject',
    properties: {
        family:       'string',
        given:        'string[]',
        prefix:       'string[]'
    }
};

function createObjects(user) {
    const config = {
        sync: {
            user,
            partitionValue: '"LoLo"',
            error: err => console.log(err)
        },
        schema: [schemas.ParentObject, schemas.NameObject],
    };

    return Realm.open(config).then(realm => {
        realm.write(() => {
            realm.create('ParentObject', {
                id: 1,
                name: [
                    { family: 'Larsen', given: ['Hans', 'Jørgen'], prefix: [] },
                    { family: 'Hansen', given: ['Ib'], prefix: [] }
                ]
            });
            realm.create('ParentObject', {
                id: 2,
                name: [
                    { family: 'Petersen', given: ['Gurli', 'Margrete'], prefix: [] }
                ]
            });
        });

        console.log("JSON: " + JSON.stringify(realm.objects('ParentObject')));

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
    });
}

const config = {
    id: global.APPID,
    url: global.APPURL,
    timeout: 1000,
    app: {
        name: 'realm-sdk-integration-tests',
        version: '42'
    }
};

const credentials = Realm.Credentials.anonymous();
const app = new Realm.App(config);
app.logIn(credentials)
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`nested-list-helper failed:\n User login error:\n${loginError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then(() => process.exit(0));
