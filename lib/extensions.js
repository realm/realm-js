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

const URL = require('url-parse');

let getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function(obj) {
    return Object.getOwnPropertyNames(obj).reduce(function (descriptors, name) {
        descriptors[name] = Object.getOwnPropertyDescriptor(obj, name);
        return descriptors;
    }, {});
};

function setConstructorOnPrototype(klass) {
    if (klass.prototype.constructor !== klass) {
        Object.defineProperty(klass.prototype, 'constructor', { value: klass, configurable: true, writable: true });
    }
}

// Return a configuration usable by `Realm.open` when waiting for a download.
// It must have caching disabled, and no schema or schema version specified.
function waitForDownloadConfig(config) {
    if (!config) {
        return {_cache: false};
    }

    if (typeof config == 'string') {
        return {path: config, _cache: false};
    }

    if (typeof config == 'object') {
        return Object.assign({}, config, {schema: undefined, schemaVersion: undefined, _cache: false});
    }

    // Unknown type. Pass the config through.
    return config;
}

module.exports = function(realmConstructor) {
    // Add the specified Array methods to the Collection prototype.
    Object.defineProperties(realmConstructor.Collection.prototype, require('./collection-methods'));

    setConstructorOnPrototype(realmConstructor.Collection);
    setConstructorOnPrototype(realmConstructor.List);
    setConstructorOnPrototype(realmConstructor.Results);
    setConstructorOnPrototype(realmConstructor.Object);

    //Add async open API
    Object.defineProperties(realmConstructor, getOwnPropertyDescriptors({
        open(config) {
            // For local Realms we open the Realm and return it in a resolved Promise.
            if (!("sync" in config)) {
                let promise = Promise.resolve(new realmConstructor(config));
                promise.progress = (callback) => { };
                return promise;
            }

            // For synced Realms we open the Realm without specifying the schema and then wait until
            // the Realm has finished its initial sync with the server. We then reopen it with the correct
            // schema. This avoids writing the schema to a potentially read-only Realm file, which would
            // result in sync rejecting the writes. `_waitForDownload` ensures that the session is kept
            // alive until our callback has returned, which prevents it from being torn down and recreated
            // when we close the schemaless Realm and open it with the correct schema.
            let syncSession;
            let promise = new Promise((resolve, reject) => {
                let realm = new realmConstructor(waitForDownloadConfig(config));
                realm._waitForDownload(
                    (session) => { syncSession = session; },
                    (error) => {
                        realm.close();
                        if (error) {
                            setTimeout(() => { reject(error); }, 1);
                        }
                        else {
                            try {
                                let syncedRealm = new realmConstructor(config);
                                setTimeout(() => { resolve(syncedRealm); }, 1);
                            } catch (e) {
                                reject(e);
                            }
                        }
                    });
            });

            promise.progress = (callback) => {
                if (syncSession) {
                    syncSession.addProgressNotification('download', 'forCurrentlyOutstandingWork', callback);
                }

                return promise;
            };
            return promise;
        },

        openAsync(config, callback, progressCallback) {
            const message = "Realm.openAsync is now deprecated in favor of Realm.open. This function will be removed in future versions.";
            (console.warn || console.log).call(console, message);

            let promise = this.open(config)
            if (progressCallback) {
                promise.progress(progressCallback)
            }

            promise.then(realm => {
                callback(null, realm)
            }).catch(error => {
                callback(error);
            });
        },
    }));

    // Add sync methods
    if (realmConstructor.Sync) {
        let userMethods = require('./user-methods');
        Object.defineProperties(realmConstructor.Sync.User, getOwnPropertyDescriptors(userMethods.static));
        Object.defineProperties(realmConstructor.Sync.User.prototype, getOwnPropertyDescriptors(userMethods.instance));
        Object.defineProperty(realmConstructor.Sync.User, '_realmConstructor', { value: realmConstructor });

        realmConstructor.Sync.AuthError = require('./errors').AuthError;

        if (realmConstructor.Sync.removeAllListeners) {
            process.on('exit', realmConstructor.Sync.removeAllListeners);
            process.on('SIGINT', function () {
                realmConstructor.Sync.removeAllListeners();
                process.exit(2);
            });
            process.on('uncaughtException', function(e) {
                realmConstructor.Sync.removeAllListeners();
                /* eslint-disable no-console */
                console.log(e.stack);
                process.exit(99);
            });
        }

        setConstructorOnPrototype(realmConstructor.Sync.User);
        setConstructorOnPrototype(realmConstructor.Sync.Session);

        // A configuration for a default Realm
        realmConstructor.defaultSyncConfiguration = function() {
            let users = this.Sync.User.all;
            let identities = Object.keys(users);
            if (identities.length === 1) {
                let user = users[identities[0]];
                let url = new URL(user.server);
                let secure = (url.protocol === 'https:')?'s':'';
                let port = (url.port === undefined)?'9080':url.port
                let realmUrl = `realm${secure}://${url.hostname}:${port}/~/default`;

                let config = {
                    sync: {
                        user,
                        url: realmUrl
                    }
                };
                return config;
            }
            new Error(`One and only one user should be logged in but found ${users.length} users.`);
        }

        if (realmConstructor.Sync._setFeatureToken) {
            realmConstructor.Sync.setFeatureToken = function(featureToken) {
                console.log('Realm.Sync.setFeatureToken() is deprecated and you can remove any calls to it.');
            }
        }

        // Keep these value in sync with subscription_state.hpp
        realmConstructor.Sync.SubscriptionState = {
            Error: -1,      // An error occurred while creating or processing the partial sync subscription.
            Creating: 2,    // The subscription is being created.
            Pending: 0,     // The subscription was created, but has not yet been processed by the sync server.
            Complete: 1,    // The subscription has been processed by the sync server and data is being synced to the device.
            Invalidated: 3, // The subscription has been removed.
        };

        // Define the permission schemas as constructors so that they can be
        // passed into directly to functions which want object type names
        const permissionsSchema = Object.freeze({
            Class: function() {},
            Permission: function() {},
            Realm: function() {},
            Role: function() {},
            User: function() {},
        });
        permissionsSchema.Permission.schema = Object.freeze({
            name: '__Permission',
            properties: {
                role: '__Role',
                canRead: {type: 'bool', default: false},
                canUpdate: {type: 'bool', default: false},
                canDelete: {type: 'bool', default: false},
                canSetPermissions: {type: 'bool', default: false},
                canQuery: {type: 'bool', default: false},
                canCreate: {type: 'bool', default: false},
                canModifySchema: {type: 'bool', default: false},
            }
        });

        permissionsSchema.User.schema = Object.freeze({
            name: '__User',
            primaryKey: 'id',
            properties: {
                id: 'string'
            }
        });

        permissionsSchema.Role.schema = Object.freeze({
            name: '__Role',
            primaryKey: 'name',
            properties: {
                name: 'string',
                members: '__User[]'
            }
        });

        permissionsSchema.Class.schema = Object.freeze({
            name: '__Class',
            primaryKey: 'class_name',
            properties: {
                class_name: 'string',
                permissions: '__Permission[]'
            }
        });

        permissionsSchema.Realm.schema = Object.freeze({
            name: '__Realm',
            primaryKey: 'id',
            properties: {
                id: 'int',
                permissions: '__Permission[]'
            }
        });
        Object.defineProperty(realmConstructor, 'Permissions', {
            value: permissionsSchema,
            configurable: false
        });
    }

    // TODO: Remove this now useless object.
    var types = Object.freeze({
        'BOOL': 'bool',
        'INT': 'int',
        'FLOAT': 'float',
        'DOUBLE': 'double',
        'STRING': 'string',
        'DATE': 'date',
        'DATA': 'data',
        'OBJECT': 'object',
        'LIST': 'list',
    });
    Object.defineProperty(realmConstructor, 'Types', {
        get: function() {
            if (typeof console != 'undefined') {
                /* global console */
                /* eslint-disable no-console */
                var stack = new Error().stack.split("\n").slice(2).join("\n");
                var msg = '`Realm.Types` is deprecated! Please specify the type name as lowercase string instead!\n'+stack;
                if (console.warn != undefined) {
                    console.warn(msg);
                }
                else {
                    console.log(msg);
                }
                /* eslint-enable no-console */
            }
            return types;
        },
        configurable: true
    });
}
