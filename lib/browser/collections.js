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
import * as util from './util';
import * as rpc from './rpc';

export default class Collection {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
}

function isIndex(propertyName) {
    return typeof propertyName === 'number' || (typeof propertyName === 'string' && /^-?\d+$/.test(propertyName));
}

const mutable = Symbol('mutable');

const traps = {
    get(collection, property, receiver) {
        if (isIndex(property)) {
            return util.getProperty(collection, property);
        }

        return Reflect.get(collection, property, collection);
    },
    set(collection, property, value, receiver) {
        if (isIndex(property)) {
            if (!collection[mutable]) {
                return false;
            }

            util.invalidateCache(collection[keys.realm]);
            rpc.setProperty(collection[keys.realm], collection[keys.id], property, value);
            return true;
        }

        if (!Reflect.set(collection, property, value, collection)) {
            throw new TypeError(`Cannot assign to read only property '${property}'`)
        }
        return true;
    },
    ownKeys(collection) {
        return Reflect.ownKeys(collection).concat(Array.from({ length: collection.length }, (value, key) => String(key)));
    },
    getOwnPropertyDescriptor(collection, property) {
        if (isIndex(property)) {
            let descriptor = {
                enumerable: true,
                configurable: true,
                writable: collection[mutable]
            };
            Reflect.defineProperty(descriptor, "value", { get: () => this.get(collection, property) });
            return descriptor;
        }

        return Reflect.getOwnPropertyDescriptor(collection, property);
    },
    has(collection, property) {
        if (isIndex(property)) {
            return true;
        }

        return Reflect.has(collection, property);
    }
};

export function createCollection(prototype, realmId, info, _mutable) {
    let collection = Object.create(prototype);

    Object.defineProperties(collection, {
        'length': {
            get: util.getterForProperty('length'),
        },
        'type': {
            value: info.dataType,
        },
        'optional': {
            value: info.optional,
        },
    });

    collection[keys.realm] = realmId;
    collection[keys.id] = info.id;
    collection[keys.type] = info.type;
    collection[mutable] = _mutable;

    return new Proxy(collection, traps);
}
