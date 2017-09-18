/*
This script creates 3 new objects into a new realm. These are objects are validated to exists by the download api tests.
*/
'use strict';
console.log("download-api-helper started");
const username = process.argv[2];
const realmName = process.argv[3];
const realmModule = process.argv[4];

var Realm = require(realmModule);

function createObjects(user) {
    const config = {
        sync: { user, 
            url: `realm://localhost:9080/~/${realmName}`, 
            error: err => console.log(err) 
        },
        schema: [{ name: 'Dog', properties: { name: 'string' } }]
    };

    var realm = new Realm(config);

    realm.write(() => {
        for (let i = 1; i <= 3; i++) {
            realm.create('Dog', { name: `Lassy ${i}` });
        }
    });

    console.log("Dogs count " + realm.objects('Dog').length);
    setTimeout(() => process.exit(0), 3000);
}

Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, registeredUser) => {
    if (error) {
        const registrationError = JSON.stringify(error);
        Realm.Sync.User.login('http://localhost:9080', username, 'password', (err, loggedUser) => {
            if (err) {
                const loginError = JSON.stringify(err);
                console.error("download-api-helper failed:\n User.register() error:\n" + err + "\n" + registrationError + "\n User.login() error:\n" + loginError);
                process.exit(-2);
            }
            else {
                createObjects(loggedUser);
            }
        });
    } 
    else {    
        createObjects(registeredUser);
    }
});