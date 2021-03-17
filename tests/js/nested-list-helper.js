/*
This script creates new nested objects into a new Realm.
*/

'use strict';
console.log("nested-list-helper started", JSON.stringify(process.argv));
const appid = process.argv[2];
const appurl = process.argv[3];
const realmName = process.argv[4];
const realmModule = process.argv[5];

const Realm = require(realmModule);
const { ObjectId, serialize } = Realm.BSON;

let schemas = {};
schemas.ParentObject = {
    name: 'ParentObject',
    primaryKey: '_id',
    properties: {
        _id:           'objectId?',
        id:            'int',
        name:          'NameObject[]'
    }
};

schemas.NameObject = {
    name: 'NameObject',
    primaryKey: '_id',
    properties: {
        _id:          'objectId?',
        family:       'string',
        given:        'string[]',
        prefix:       'string[]'
    }
};

function createObjects(user) {
    const config = {
        sync: {
            user,
            partitionValue: "LoLo",
            error: err => console.log(err)
        },
        schema: [schemas.ParentObject, schemas.NameObject],
    };

    Realm.deleteFile(config);
    let realm = new Realm(config);
    realm.write(() => {
        realm.deleteAll();
        realm.create('ParentObject', {
            id: 1,
            _id: new ObjectId(),
            name: [
                { _id: new ObjectId(), family: 'Larsen', given: ['Hans', 'Jørgen'], prefix: [] },
                { _id: new ObjectId(), family: 'Hansen', given: ['Ib'], prefix: [] }
            ]
        });
        realm.create('ParentObject', {
            id: 2,
            _id: new ObjectId(),
            name: [
                { _id: new ObjectId(), family: 'Petersen', given: ['Gurli', 'Margrete'], prefix: [] }
            ]
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
    id: appid,
    url: appurl,
    timeout: 1000,
    app: {
        name: 'default',
        version: '0'
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
    .then((realm) => { realm.close(); process.exit(0); });
