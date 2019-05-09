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

import { keys, objectTypes } from './constants';
import { getterForProperty, setterForProperty, createMethods, cacheObject } from './util';
import * as rpc from './rpc'

let registeredConstructors = {};
let registeredRealmPaths = {};

export default class RealmObject {
}

// Non-mutating methods:
createMethods(RealmObject.prototype, objectTypes.OBJECT, [
    'isValid',
    'objectSchema',
    'linkingObjects',
    'linkingObjectsCount',
    '_objectId',
    '_isSameObject',
    'addListener',
    'removeListener',
    'removeAllListeners',
]);

export function clearRegisteredConstructors() {
    registeredConstructors = {};
    registeredRealmPaths = {};
}

export function createObject(realmId, info) {
    let schema = info.schema;
    let realmPath = registeredRealmPaths[realmId];
    let constructor = (registeredConstructors[realmPath] || {})[schema.name];
    let object = Object.create(constructor ? constructor.prototype : RealmObject.prototype);

    object[keys.realm] = realmId;
    object[keys.id] = info.id;
    object[keys.type] = info.type;

    schema.properties.forEach((name) => {
        Object.defineProperty(object, name, {
            enumerable: true,
            get: getterForProperty(name),
            set: setterForProperty(name),
        });
    });

    if (constructor) {
        let result = constructor.call(object);
        if (result != null && result != object) {
            throw new Error('Realm object constructor must not return another value');
        }
    }
    for (let key in info.cache) {
        info.cache[key] = rpc.deserialize(undefined, info.cache[key])
    }
    cacheObject(realmId, info.id, info.cache);

    return object;
}

export function registerConstructors(realmId, realmPath, constructors) {
    registeredRealmPaths[realmId] = realmPath;

    if (constructors) {
        registeredConstructors[realmPath] = constructors;
    }
}

export function typeForConstructor(realmId, constructor) {
    let realmPath = registeredRealmPaths[realmId];
    let constructors = registeredConstructors[realmPath];

    for (let name in constructors) {
        if (constructors[name] == constructor) {
            return name;
        }
    }

    throw new Error("Constructor was not registered in the schema for this Realm")
}
