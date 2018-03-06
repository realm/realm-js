/*
This script creates new nested objects into a new Realm. 
*/

'use strict';
console.log("nested-list-helper started");
const username = process.argv[3];
const realmName = process.argv[4];
const realmModule = process.argv[5];

const Realm = require(realmModule);
// Ensure that schemas.js gets the correct module with `require('realm')`
require.cache[require.resolve('realm')] = require.cache[require.resolve(realmModule)];
let schemas = require(process.argv[2]);

function createObjects(user) {
    const config = {
        sync: { user,
            url: `realm://localhost:9080/~/${realmName}`,
            error: err => console.log(err)
        },
        schema: [schemas.ParentObject, schemas.NameObject],
    };

    const realm = new Realm(config);

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
                {family: 'Petersen', given: ['Gurli', 'Margrete'], prefix: [] }
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
}

let registrationError;
Realm.Sync.User.register('http://localhost:9080', username, 'password')
  .catch((error) => {
      registrationError = JSON.stringify(error);
      return Realm.Sync.User.login('http://localhost:9080', username, 'password')
    })
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`nested-list-helper failed:\n User.register() error:\n${registrationError}\n User.login() error:\n${registrationError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then(() => process.exit(0));
