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

        if (realmConstructor.Sync._setFeatureToken) {
            realmConstructor.Sync.setFeatureToken = function(featureToken) {
                if (typeof featureToken !== 'string' && !(featureToken instanceof String)) {
                    throw new Error("featureToken should be a string");
                }

                realmConstructor.Sync._setFeatureToken(featureToken.trim());
            }
        }

        realmConstructor.prototype.subscribeToObjects = function(objectType, query) {
            const realm = this;
            let promise = new Promise((resolve, reject) => {
                realm._subscribeToObjects(objectType, query, function(err, results) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
            return promise;
        };
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
