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
            let syncSession;
            let promise = new Promise((resolve, reject) => {
                realmConstructor._waitForDownload(config,
                    (session) => {
                        syncSession = session;
                    },
                    (error) => {
                        if (error) {
                            setTimeout(() => {  reject(error); }, 1);
                        }
                        else {
                            try {
                                let syncedRealm = new this(config);
                                //FIXME: RN hangs here. Remove when node's makeCallback alternative is implemented
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

            realmConstructor._waitForDownload(config,
                (syncSession) => {
                    if (progressCallback) {
                        syncSession.addProgressNotification('download', 'forCurrentlyOutstandingWork', progressCallback);
                    }
                },
                (error) => {
                    if (error) {
                        setTimeout(() => { callback(error); }, 1);
                    }
                    else {
                        try {
                            let syncedRealm = new this(config);
                            //FIXME: RN hangs here. Remove when node's makeCallback alternative is implemented
                            setTimeout(() => { callback(null, syncedRealm); }, 1);
                        } catch (e) {
                            setTimeout(() => { callback(e); }, 1);
                        }
                    }
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
