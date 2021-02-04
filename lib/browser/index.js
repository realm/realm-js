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

import { NativeModules } from 'react-native';
import { keys, objectTypes } from './constants';
import Collection from './collections';
import List, { createList } from './lists';
import Results, { createResults } from './results';
import RealmObject, * as objects from './objects';
import User, { createUser } from './user';
import { createAsyncOpenTask } from './async-open-task';
import App, { createApp } from './app';
import Credentials, { createCredentials } from './credentials';
import * as rpc from './rpc';
import * as util from './util';
import { createSession } from './session';
import { invalidateCache } from './cache';
import { performFetch } from "./fetch";
import { createEmailPasswordAuth } from './email-password-auth';

const {debugHosts, debugPort} = NativeModules.Realm;

rpc.registerTypeConverter(objectTypes.LIST, createList);
rpc.registerTypeConverter(objectTypes.RESULTS, createResults);
rpc.registerTypeConverter(objectTypes.OBJECT, objects.createObject);
rpc.registerTypeConverter(objectTypes.REALM, createRealm);
rpc.registerTypeConverter(objectTypes.USER, createUser);
rpc.registerTypeConverter(objectTypes.SESSION, createSession);
rpc.registerTypeConverter(objectTypes.ASYNCOPENTASK, createAsyncOpenTask);
rpc.registerTypeConverter(objectTypes.APP, createApp);
rpc.registerTypeConverter(objectTypes.CREDENTIALS, createCredentials);
rpc.registerTypeConverter(objectTypes.EMAILPASSWORDAUTH, createEmailPasswordAuth);

function createRealm(_, info) {
    let realm = Object.create(Realm.prototype);
    setupRealm(realm, info);
    return realm;
}

function setupRealm(realm, info) {
    realm[keys.id] = info.id;
    realm[keys.realm] = info.realmId;
    realm[keys.type] = objectTypes.REALM;

    [
        'empty',
        'schema',
        'schemaVersion',
        'isInTransaction',
        'isClosed',
    ].forEach((name) => {
        Object.defineProperty(realm, name, {get: util.getterForProperty(name)});
    });
    for (let key in info.data) {
        realm[key] = rpc.deserialize(info.id, info.data[key]);
    }
}

function getObjectType(realm, type) {
    if (typeof type == 'function') {
        return objects.typeForConstructor(realm[keys.realm], type);
    }
    return type;
}

export default class Realm {
    constructor(config) {
        let schemas = typeof config === 'object' && config.schema;
        let constructors = schemas ? {} : null;

        for (let i = 0, len = schemas ? schemas.length : 0; i < len; i++) {
            let item = schemas[i];

            if (typeof item == 'function') {
                let schema = item.schema;
                if (!schema || typeof schema != 'object') {
                    throw new Error("Realm object constructor must have a 'schema' property.");
                }

                let {name, properties} = schema;
                if (!name || typeof name != 'string') {
                    throw new Error(`Failed to read ObjectSchema: name must be of type 'string', got (${typeof name})`);
                } else if (!properties || typeof properties != 'object') {
                    throw new Error(`Failed to read ObjectSchema: properties must be of type 'object', got (${typeof properties})`);
                }

                schemas.splice(i, 1, schema);
                constructors[name] = item;
            }
        }

        let info = rpc.createRealm(Array.from(arguments));
        setupRealm(this, info);

        // This will create mappings between the id, path, and potential constructors.
        objects.registerConstructors(info.realmId, this.path, constructors);
    }

    create(type, ...args) {
        let method = util.createMethod(objectTypes.REALM, 'create', true);
        return method.apply(this, [getObjectType(this, type), ...args]);
    }

    objects(type, ...args) {
        let method = util.createMethod(objectTypes.REALM, 'objects');
        return method.apply(this, [getObjectType(this, type), ...args]);
    }

    objectForPrimaryKey(type, ...args) {
        let method = util.createMethod(objectTypes.REALM, 'objectForPrimaryKey');
        return method.apply(this, [getObjectType(this, type), ...args]);
    }
}

// Non-mutating methods:
util.createMethods(Realm.prototype, objectTypes.REALM, [
    'addListener',
    'removeListener',
    'removeAllListeners',
    'writeCopyTo',
    '_waitForDownload',
    '_objectForObjectId',
]);

// Mutating methods:
util.createMethods(Realm.prototype, objectTypes.REALM, [
    'delete',
    'deleteModel',
    'deleteAll',
    'write',
    'compact',
    'close',
    'beginTransaction',
    'commitTransaction',
    'cancelTransaction',
], true);

Object.defineProperties(Realm, {
    Collection: {
        value: Collection,
    },
    List: {
        value: List,
    },
    Results: {
        value: Results,
    },
    Object: {
        value: RealmObject,
    },
    App: {
        value: App,
    },
    Credentials: {
        value: Credentials,
    },
    User: {
        value: User,
    },
    defaultPath: {
        get: util.getterForProperty('defaultPath', false),
        set: util.setterForProperty('defaultPath'),
    },
    schemaVersion: {
        value: function(_path, _encryptionKey) {
            return rpc.callMethod(undefined, Realm[keys.id], 'schemaVersion', Array.from(arguments));
        }
    },
    deleteFile: {
        value: function(config) {
            return rpc.callMethod(undefined, Realm[keys.id], 'deleteFile', Array.from(arguments));
        }
    },
    copyBundledRealmFiles: {
        value: function() {
            return rpc.callMethod(undefined, Realm[keys.id], 'copyBundledRealmFiles', []);
        }
    },
    clearTestState: {
        value: function() {
            objects.clearRegisteredConstructors();
            invalidateCache();
            rpc.clearTestState();
        },
    },
    _asyncOpen: {
        value: function(config, callback) {
            return rpc.asyncOpenRealm(Realm[keys.id], config, callback);
        },
    },
    exists: {
        value: function(config) {
            return rpc.callMethod(undefined, Realm[keys.id], 'exists', Array.from(arguments));
        }
    },
});

for (let i = 0, len = debugHosts.length; i < len; i++) {
    try {
        Realm[keys.id] = rpc.createSession(debugHosts[i] + ":" + debugPort, { performFetch });
        break;
    } catch (e) {
        // Only throw exception after all hosts have been tried.
        if (i < len - 1) {
            continue;
        }

        // Log the original exception for debugging purposes.
        console.error(e);

        throw new Error(
            'Realm failed to connect to the embedded debug server inside the app. ' +
            'If attempting to use Chrome debugging from a device, ensure the device is ' +
            'reachable on the same network as this machine.'
        );
    }
}
