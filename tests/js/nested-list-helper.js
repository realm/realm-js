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
            url: `realm://127.0.0.1:9080/~/${realmName}`,
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

    return realm.syncSession.uploadAllLocalChanges();
}

// seems like we can't just use the test-utils.getRegularUser method
const credentials = Realm.Sync.Credentials.usernamePassword(username, 'password');
Realm.Sync.User.login('http://127.0.0.1:9080', credentials)
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`nested-list-helper failed:\n User login error:\n${loginError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then(() => process.exit(0));
