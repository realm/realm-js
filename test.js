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

'use strict';

const Realm = require('.');
const prompt = require('prompt');
const mkdirp  = require('mkdirp');
const wildcard = require('wildcard');

// User.loginWithProvider('http://127.0.0.1:8080/', 'debug', 'abcd', function(error, user) {
//    console.log(user);
// });

Realm.Sync.User.create('http://127.0.0.1:9080/', 'ari', 'aaa', function(error, user) {

var notifier_dir = './notifier';
mkdirp.sync(notifier_dir);

var access_token = 'ewoJImlkZW50aXR5IjogImFkbWluIiwKCSJhY2Nlc3MiOiBbInVwbG9hZCIsICJkb3dubG9hZCIsICJtYW5hZ2UiXQp9Cg==:DlFksxA+cJyEOc9bu6JwBUfDi4fJCagjAcIPPsoisjqfmOzSrk5Omuw0IkxCRU534p2+CAAj5IOH47DfObPtAA8q2DHguYDOKWYxyktS/6doPCqDHYN7k9EgUHdPTkESNkuPZbaVfXZTGzocB8m7+MaEXJde7FGPbh1sBz/+sPldnlAhnOqO5QbWzIEyoGHiOSg3V7UCh2H8kalr3tef7fkE2X65OBMgcarPvM5M6sPijOx2N5zrVrjL2wvguP9zS+g2ybFPUqV3DGv3S8cnGA+wVId/jCfGc2ujNhecunJdENH+/pL+0BTYHCFEWkY1WP1NUyti60FwRaXAtcYxeA==';
var admin_user = new Realm.Sync.User.adminUser('http://127.0.0.1:9080/', access_token);

Realm.Sync.setLogLevel('error');
// Realm.Sync.setGlobalListener(notifier_dir, 'realm://127.0.0.1:9080', admin_user,
//     (name) => {
//         console.log('filter: ' + name); 
//         return true; 
//     },    
//     (name, realm, changes) => { 
//         console.log('change: ' + name); 
//         console.log(changes); 
//     }
// );
// console.log('global notifier listening...');

Realm.Sync.User.login('http://127.0.0.1:9080/', 'ari', 'aaa', function(error, user) {
    var realm = new Realm({
        sync: {
            user: user, 
            url: 'realm://127.0.0.1:9080/~/demo/realm1'
        }, 
        schema: [{
            name: 'IntObject',
            properties: {
                int: 'int'
            }
        }]
    });

    function create(err, result) {
        if (err) {
            exit();
        }
        if (!err) {
            realm.write(() => {
                realm.create('IntObject', {int: parseInt(result.int)});
            });
            console.log(realm.objects('IntObject'));
        }

        prompt.get(['int'], create);
    }
    prompt.start();
    prompt.get(['int'], create);
});

});

