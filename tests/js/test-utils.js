////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* eslint-env es6, node */

const Realm = require('realm');

'use strict';

const AUTH_URL = 'http://127.0.0.1:9080';
const ADMIN_REALM_URL = 'realm://127.0.0.1:9080/__admin';

module.exports = {
    uuid: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    getAdminUser: function(username) {
        const defaultAdminUserPromise = Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.usernamePassword('realm-admin', ''));
        if (!username) {
            return defaultAdminUserPromise;
        }

        return Promise.all([defaultAdminUserPromise, Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.usernamePassword(username, 'password'))])
            .then(([admin, newUser]) => {
                return Realm.open({
                    sync: {
                        user: admin,
                        fullSynchronization: true,
                        url: ADMIN_REALM_URL
                    }
                }).then((realm) => {
                    return {
                        realm, newUser
                    };
                });
            })
            .then(({ realm, newUser }) => {
                // TODO: this is a hack - ROS should expose a way to promote a user and realm-js should
                // expose a friendly API for that.
                const newUserObject = realm.objectForPrimaryKey('User', newUser.identity);
                realm.write(() => {
                    newUserObject.isAdmin = true
                });
                return realm.syncSession.uploadAllLocalChanges()
                    .then(() => {
                        realm.close();
                    });
            })
            .then(() => {
                return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.usernamePassword(username, 'password'));
            });
    },

    getRegularUser: function(username) {
        if (!username) {
            return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.anonymous());
        }

        return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.usernamePassword(username, 'password'));
    }
};
