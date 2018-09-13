////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/*
* This script creates 3 new objects into a new realm. These are objects are validated to exists by the download api tests.
*/

'use strict';
console.log("partial-sync-api-helper started");
const username = process.argv[2];
const realmModule = process.argv[3];

const Realm = require(realmModule);

function createObjects(user) {
    const config = {
        sync: {
            user,
            url: `realm://localhost:9080/default`,
            fullSynchronization: false,
            error: err => console.log('partial-sync-api-helper', err)
        },
        schema: [{ name: 'Dog', properties: { name: 'string' } }]
    };

    const realm = new Realm(config);
    realm.write(() => {
        for (let i = 1; i <= 3; i++) {
            realm.create('Dog', { name: `Lassy ${i}` });
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
        session.addProgressNotification('upload', 'forCurrentlyOutstandingWork', callback);
    });
}

const credentials = Realm.Sync.Credentials.nickname(username);
Realm.Sync.User.login('http://localhost:9080', credentials)
    .catch((error) => {
        const loginError = JSON.stringify(error);
        console.error(`partial-sync-api-helper failed:\n User login error:\n${loginError}`);
        process.exit(-2);
    })
    .then((user) => createObjects(user))
    .then(() => process.exit(0));
