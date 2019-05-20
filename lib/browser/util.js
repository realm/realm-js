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

import { keys } from './constants';
import * as rpc from './rpc';

export function createMethods(prototype, type, methodNames, mutating) {
    let props = {};

    methodNames.forEach((name) => {
        props[name] = {
            value: createMethod(type, name, mutating),
        };
    });

    Object.defineProperties(prototype, props);
}

export function createMethod(type, name, mutating) {
    return function() {
        let realmId = this[keys.realm];
        let id = this[keys.id];

        if (!realmId || !id) {
            throw new TypeError(`${type}.${name} was called on non-Realm object ${this}!`);
        }
        if (this[keys.type] !== type) {
            throw new TypeError(`${type}.${name} was called on Realm object of type ${this[keys.type]}!`);
        }

        if (mutating) {
            invalidateCache(realmId);
        }
        try {
            return rpc.callMethod(realmId, id, name, Array.from(arguments));
        }
        finally {
            if (mutating) {
                invalidateCache(realmId);
            }
        }
    };
}

let propertyCache = {};

export function invalidateCache(realmId) {
    if (realmId) {
        propertyCache[realmId] = {};
    }
    else {
        propertyCache = {};
    }
}

function getRealmCache(realmId) {
    let realmCache = propertyCache[realmId];
    if (!realmCache) {
        realmCache = propertyCache[realmId] = {};
    }
    return realmCache;
}

export function cacheObject(realmId, id, value) {
    getRealmCache(realmId)[id] = value;
}

export function getProperty(obj, name, cache = true) {
    let realmId = obj[keys.realm];
    let id = obj[keys.id];
    if (!cache || realmId === undefined) {
        return rpc.getProperty(realmId, id, name);
    }

    let realmCache = getRealmCache(realmId);
    let objCache = realmCache[id];
    if (!objCache) {
        objCache = realmCache[id] = rpc.getObject(realmId, id, name);
        return objCache[name];
    }

    if (name in objCache) {
        return objCache[name];
    }
    return objCache[name] = rpc.getProperty(realmId, id, name);
}

export function getterForProperty(name, cache = true) {
    return function() {
        return getProperty(this, name, cache);
    };
}

export function setterForProperty(name) {
    return function(value) {
        invalidateCache(this[keys.realm]);
        rpc.setProperty(this[keys.realm], this[keys.id], name, value);
    };
}
