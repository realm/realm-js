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

/* global navigator */

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

function waitForCompletion(session, fn, timeout, timeoutErrorMessage) {
    const waiter = new Promise((resolve, reject) => {
        fn.call(session, (error) => {
            if (error === undefined) {
                setTimeout(() => resolve(), 1);
            } else {
                setTimeout(() => reject(error), 1);
            }
        });
    });
    if (timeout === undefined) {
        return waiter;
    }
    return Promise.race([
        waiter,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(timeoutErrorMessage);
            }, timeout);
        })
    ]);
}

function openLocalRealm(realmConstructor, config) {
    let promise = Promise.resolve(new realmConstructor(config));
    promise.progress = (callback) => { return promise; };
    promise.cancel = () => { };
    return promise;
}

module.exports = function(realmConstructor, context) {
    // Add the specified Array methods to the Collection prototype.
    Object.defineProperties(realmConstructor.Collection.prototype, require('./collection-methods'));

    setConstructorOnPrototype(realmConstructor.Collection);
    setConstructorOnPrototype(realmConstructor.List);
    setConstructorOnPrototype(realmConstructor.Results);
    setConstructorOnPrototype(realmConstructor.Object);

    realmConstructor._bson = require('bson');
    realmConstructor._Decimal128 = realmConstructor._bson.Decimal128;
    realmConstructor._ObjectId = realmConstructor._bson.ObjectId;
    const { DefaultNetworkTransport } = require('./NetworkTransport');
    realmConstructor._networkTransport = new DefaultNetworkTransport();

    Object.defineProperty(realmConstructor.Object.prototype, "toJSON", {
        value: function () {
            const result = {}
            Object.keys(this).forEach(p => result[p] = this[p]);
            Object.keys(Object.getPrototypeOf(this)).forEach(p => result[p] = this[p]);
            return result;
        },

        writable: true,
        configurable: true,
        enumerable: false
    });

    Object.defineProperty(realmConstructor.Object.prototype, "keys", {
        value: function () {
            return Object.keys(this).concat(Object.keys(Object.getPrototypeOf(this)));
        },

        writable: true,
        configurable: true,
        enumerable: false
    });

    Object.defineProperty(realmConstructor.Object.prototype, "entries", {
        value: function () {
            let result = {};
            for (const key in this) {
                result[key] = this[key];
            }

            return Object.entries(result);
        },

        writable: true,
        configurable: true,
        enumerable: false
    });

    //Add static methods to the Realm object
    Object.defineProperties(realmConstructor, getOwnPropertyDescriptors({
        open(config) {
            // If no config is defined, we should just open the default realm
            if (config === undefined) {
                config = {};
            }

            // For local Realms we open the Realm and return it in a resolved Promise.
            if (!("sync" in config)) {
                return openLocalRealm(realmConstructor, config);
            }

            // Determine if we are opening an existing Realm or not.
            let behavior = realmConstructor.exists(config) ? "existingRealmFileBehavior" : "newRealmFileBehavior";

            // Define how the Realm file is opened
            let openLocalRealmImmediately = false; // Default is downloadBeforeOpen
            if (config.sync[behavior] !== undefined) {
                const type = config.sync[behavior].type;
                switch (type) {
                    case 'downloadBeforeOpen':
                        openLocalRealmImmediately = false;
                        break;
                    case 'openImmediately':
                        openLocalRealmImmediately = true;
                        break;
                    default:
                        throw Error(`Invalid type: '${type}'. Only 'downloadBeforeOpen' and 'openImmediately' is allowed.`);
                }
            }

            // If configured to do so, the synchronized Realm will be opened locally immediately.
            // If this is the first time the Realm is created, the schema will be created locally as well.
            if (openLocalRealmImmediately) {
                return openLocalRealm(realmConstructor, config);
            }

            // Otherwise attempt to synchronize the Realm state from the server before opening it.

            // First configure any timeOut and corresponding behavior.
            let openPromises = [];
            if (config.sync[behavior] !== undefined && config.sync[behavior].timeOut !== undefined) {
                let timeOut = config.sync[behavior].timeOut;
                if (typeof timeOut !== 'number') {
                    throw new Error(`'timeOut' must be a number: '${timeOut}'`);
                }

                // Define the behavior in case of a timeout
                let throwOnTimeOut = true; // Default is to throw
                if (config.sync[behavior] !== undefined && config.sync[behavior].timeOutBehavior) {
                    const timeOutBehavior = config.sync[behavior].timeOutBehavior;
                    switch (timeOutBehavior) {
                        case 'throwException':
                            throwOnTimeOut = true;
                            break;
                        case 'openLocal':
                            throwOnTimeOut = false;
                            break;
                        default:
                            throw Error(`Invalid 'timeOutBehavior': '${timeOutBehavior}'. Only 'throwException' and 'openLocal' is allowed.`);
                    }
                }

                openPromises.push(new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (asyncOpenTask) {
                            asyncOpenTask.cancel();
                            asyncOpenTask = null;
                        }
                        if (throwOnTimeOut) {
                            reject(new Error(`${config.sync.url} could not be downloaded in the allocated time: ${timeOut} ms.`));
                        } else {
                            return resolve(openLocalRealm(realmConstructor, config));
                        }
                    }, timeOut);
                }));
            }

            // Configure promise responsible for downloading the Realm from the server
            let asyncOpenTask;
            let cancelled = false;
            openPromises.push(new Promise((resolve, reject) => {
                asyncOpenTask = realmConstructor._asyncOpen(config, (realm, error) => {
                    setTimeout(() => {
                        asyncOpenTask = null;
                        // The user may have cancelled the open between when
                        // the download completed and when we managed to
                        // actually invoke this, so recheck here.
                        if (cancelled) {
                            return;
                        }
                        if (error) {
                            reject(error);
                        } else {
                            resolve(realm);
                        }
                    }, 0);
                });
            }));

            // Return wrapped promises, allowing the users to control them.
            let openPromise = Promise.race(openPromises);
            openPromise.cancel = () => {
                if (asyncOpenTask) {
                    asyncOpenTask.cancel();
                    cancelled = true;
                }
            };
            openPromise.progress = (callback) => {
                if (asyncOpenTask) {
                    asyncOpenTask.addDownloadNotification(callback);
                }
                return openPromise;
            };
            return openPromise;
        },

        createTemplateObject(objectSchema) {
            let obj = {};
            for (let key in objectSchema.properties) {

                let type;
                if (typeof objectSchema.properties[key] === 'string' || objectSchema.properties[key] instanceof String) {
                    // Simple declaration of the type
                    type = objectSchema.properties[key];
                } else {
                    // Advanced property setup
                    const property = objectSchema.properties[key];

                    // if optional is set, it wil take precedence over any `?` set on the type parameter
                    if (property.optional === true) {
                        continue;
                    }

                    // If a default value is explicitly set, always set the property
                    if (property.default !== undefined) {
                        obj[key] = property.default;
                        continue;
                    }

                    type = property.type;
                }

                // Set the default value for all required primitive types.
                // Lists are always treated as empty if not specified and references to objects are always optional
                switch (type) {
                    case 'bool': obj[key] = false; break;
                    case 'int': obj[key] = 0; break;
                    case 'float': obj[key] = 0.0; break;
                    case 'double': obj[key] = 0.0; break;
                    case 'string': obj[key] = ""; break;
                    case 'data': obj[key] = new ArrayBuffer(0); break;
                    case 'date': obj[key] = new Date(0); break;
                }
            }
            return obj;
        },

        _expandEmbeddedObjectSchemas(schemas) {
            // we only work on arrays and let object store's schema parser produce the error messages
            if (!(schemas instanceof Array)) {
                return schemas;
            }

            let newSchema = [];
            schemas.forEach(schema => {
                // a schema must be an object and have 'name' and 'properties'
                // we let object store's schema parser produce the error messages
                if (!(schema instanceof Object) || !schema.hasOwnProperty('name') || !schema.hasOwnProperty('properties')) {
                    newSchema.push(schema);
                    return;
                }

                // is the schema defined as a constructor?
                if (schema instanceof Function) {
                    schema = schema.schema;
                }

                let os = {};
                os.name = schema.name;
                if (schema.primaryKey) {
                    os.primaryKey = schema.primaryKey;
                }
                if (schema.embedded) {
                    os.embedded = true;
                } else {
                    os.embedded = false;
                }

                if ((schema.properties instanceof Array)) {
                    newSchema.push(schema);
                } else {
                    os.properties = {};
                    for (let key in schema.properties) {
                        let prop = schema.properties[key];
                        if (prop instanceof Object && prop.hasOwnProperty('name') && prop.hasOwnProperty('properties')) {
                            let embeddedSchema = {};
                            embeddedSchema.name = prop.name;
                            embeddedSchema.embedded = true;
                            embeddedSchema.properties = prop.properties;
                            if (prop.hasOwnProperty('type') && prop.type === 'list') {
                                os.properties[key] = { type: 'list', objectType: prop.name };
                            } else {
                                os.properties[key] = { type: prop.name };
                            }
                            newSchema.push(embeddedSchema);
                        } else {
                            os.properties[key] = schema.properties[key];
                        }
                    }
                    newSchema.push(os);
                }
            });
            return newSchema;
        }
    }));

    // Add static properties to Realm Object
    const updateModeType = {
      All: 'all',
      Modified: 'modified',
      Never: 'never',
    };

    if (!realmConstructor.UpdateMode) {
      Object.defineProperty(realmConstructor, 'UpdateMode', {
        value: updateModeType,
        configurable: false,
      });
    }

    // Add sync methods
    if (realmConstructor.Sync) {
        let appMethods = require("./app");
        Object.defineProperties(realmConstructor.App, getOwnPropertyDescriptors(appMethods.static));
        Object.defineProperties(realmConstructor.App.prototype, getOwnPropertyDescriptors(appMethods.instance));

        let userMethods = require("./user");
        Object.defineProperties(realmConstructor.User, getOwnPropertyDescriptors(userMethods.static));
        Object.defineProperties(realmConstructor.User.prototype, getOwnPropertyDescriptors(userMethods.instance));

        let credentialMethods = require("./credentials");
        Object.defineProperties(realmConstructor.Credentials, getOwnPropertyDescriptors(credentialMethods.static))

        let emailPasswordProviderMethods = require("./email_password_provider_client_methods");
        Object.defineProperties(realmConstructor.Auth.EmailPasswordProvider.prototype, getOwnPropertyDescriptors(emailPasswordProviderMethods.instance));

        let userAPIKeyProviderMethods = require("./user_apikey_provider_client");
        Object.defineProperties(realmConstructor.Auth.UserAPIKeyProvider.prototype, getOwnPropertyDescriptors(userAPIKeyProviderMethods.instance));


        realmConstructor.Sync.AuthError = require("./errors").AuthError;

        if (realmConstructor.Sync.removeAllListeners) {
            process.on("exit", realmConstructor.Sync.removeAllListeners);
            process.on("SIGINT", function () {
                realmConstructor.Sync.removeAllListeners();
                process.exit(2);
            });
            process.on("uncaughtException", function(e) {
                realmConstructor.Sync.removeAllListeners();
                /* eslint-disable no-console */
                console.log(e.stack);
                process.exit(99);
            });
        }

        setConstructorOnPrototype(realmConstructor.User);
        setConstructorOnPrototype(realmConstructor.Sync.Session);
        setConstructorOnPrototype(realmConstructor.App);
        setConstructorOnPrototype(realmConstructor.Credentials);


        realmConstructor.Sync.openLocalRealmBehavior = {
            type: 'openImmediately'
        };

        realmConstructor.Sync.downloadBeforeOpenBehavior = {
            type: 'downloadBeforeOpen',
            timeOut: 30 * 1000,
            timeOutBehavior: 'throwException'
        };
        realmConstructor.Sync.Session.prototype.uploadAllLocalChanges = function(timeout) {
            return waitForCompletion(this, this._waitForUploadCompletion, timeout, `Uploading changes did not complete in ${timeout} ms.`);
        };

        realmConstructor.Sync.Session.prototype.downloadAllServerChanges = function(timeout) {
            return waitForCompletion(this, this._waitForDownloadCompletion, timeout, `Downloading changes did not complete in ${timeout} ms.`);
        };

        realmConstructor.Sync.ConnectionState = {
            Disconnected: "disconnected",
            Connecting: "connecting",
            Connected: "connected",
        };

        realmConstructor.Sync.ClientResyncMode = {
            Discard: 'discard',
            Manual: 'manual',
            Recover: 'recover'
        };

        Object.defineProperties(realmConstructor, getOwnPropertyDescriptors({
            // Creates the user agent description for the JS binding itself. Users must specify the application
            // user agent using Realm.Sync.setUserAgent(...)
            _createUserAgentDescription() {
                // Detect if in ReactNative (running on a phone) or in a Node.js environment
                // Credit: https://stackoverflow.com/questions/39468022/how-do-i-know-if-my-code-is-running-as-react-native
                try {
                    var userAgent = "RealmJS/";
                    userAgent = userAgent + require('../package.json').version + " (" + context + ", ";
                    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
                        // Running on ReactNative
                        const Platform = require('react-native').Platform;
                        userAgent += Platform.OS + ", v" + Platform.Version;
                    } else {
                        // Running on a normal machine
                        userAgent += process.version;
                    }
                    return userAgent += ")";
                } catch (e) {
                    return "RealmJS/Unknown"
                }
            },
        }));
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
