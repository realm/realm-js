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
import Collection, * as collections from './collections';
import List, { createList } from './lists';
import Results, { createResults } from './results';
import RealmObject, * as objects from './objects';
import User, { createUser } from './user';
import Session, { createSession } from './session';
import * as rpc from './rpc';
import * as util from './util';
import { static as staticUserMethods } from '../user-methods';

const {debugHosts, debugPort} = NativeModules.Realm;

rpc.registerTypeConverter(objectTypes.LIST, createList);
rpc.registerTypeConverter(objectTypes.RESULTS, createResults);
rpc.registerTypeConverter(objectTypes.OBJECT, objects.createObject);
rpc.registerTypeConverter(objectTypes.REALM, createRealm);
rpc.registerTypeConverter(objectTypes.USER, createUser);
rpc.registerTypeConverter(objectTypes.SESSION, createSession);

function createRealm(_, info) {
    let realm = Object.create(Realm.prototype);

    setupRealm(realm, info.id);
    return realm;
}

function setupRealm(realm, realmId) {
    realm[keys.id] = realmId;
    realm[keys.realm] = realmId;
    realm[keys.type] = objectTypes.REALM;

    [
        'empty',
        'path',
        'readOnly',
        'inMemory',
        'schema',
        'schemaVersion',
        'syncSession',
        'isInTransaction',
        'isClosed',
    ].forEach((name) => {
        Object.defineProperty(realm, name, {get: util.getterForProperty(name)});
    });
}

function getObjectType(realm, type) {
    if (typeof type == 'function') {
        return objects.typeForConstructor(realm[keys.realm], type);
    }
    return type;
}

export default class Realm {
    constructor(config) {
        let schemas = typeof config == 'object' && config.schema;
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

        let realmId = rpc.createRealm(Array.from(arguments));
        setupRealm(this, realmId);

        // This will create mappings between the id, path, and potential constructors.
        objects.registerConstructors(realmId, this.path, constructors);
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
    'close',
    '_waitForDownload',
    '_objectForObjectId',
    '_subscribeToObjects',
]);

// Mutating methods:
util.createMethods(Realm.prototype, objectTypes.REALM, [
    'delete',
    'deleteModel',
    'deleteAll',
    'write',
    'compact',
    'beginTransaction',
    'commitTransaction',
    'cancelTransaction',
], true);

const Sync = {
    User,
    Session
};

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
    Sync: {
        value: Sync,
    },
    defaultPath: {
        get: util.getterForProperty('defaultPath'),
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
            collections.clearMutationListeners();
            objects.clearRegisteredConstructors();
            rpc.clearTestState();
        },
    },
});

for (let i = 0, len = debugHosts.length; i < len; i++) {
    try {
        let refreshAccessTokenCallback = staticUserMethods._refreshAccessToken.bind(User);
        // The session ID refers to the Realm constructor object in the RPC server.
        Realm[keys.id] = rpc.createSession(refreshAccessTokenCallback, debugHosts[i] + ':' + debugPort);
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
