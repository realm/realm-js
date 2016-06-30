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
import { getterForProperty, setterForProperty } from './util';

let mutationListeners = {};

export default class Collection {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
}

export function addMutationListener(realmId, callback) {
    let listeners = mutationListeners[realmId] || (mutationListeners[realmId] = new Set());
    listeners.add(callback);
}

export function removeMutationListener(realmId, callback) {
    let listeners = mutationListeners[realmId];
    if (listeners) {
        listeners.delete(callback);
    }
}

export function clearMutationListeners() {
    mutationListeners = {};
}

export function fireMutationListeners(realmId) {
    let listeners = mutationListeners[realmId];
    if (listeners) {
        listeners.forEach((cb) => cb());
    }
}

export function createCollection(prototype, realmId, info, mutable) {
    let collection = Object.create(prototype);
    let size;

    Object.defineProperties(collection, {
        'length': {
            get: getterForProperty('length'),
        },
        '-1': {
            value: undefined,
        },
    });

    let resize = function(length) {
        if (length == null) {
            length = collection.length;
        }
        if (length == size) {
            return;  // Nothing has changed.
        }
        if (size == null) {
            size = 0;  // This is first pass.
        }

        let props = {};

        if (length > size) {
            for (let i = size; i < length; i++) {
                props[i] = {
                    get: getterForProperty(i),
                    set: setterForProperty(i),
                    enumerable: true,
                    configurable: true,
                };
            }
        }
        else if (length < size) {
            for (let i = size; i >= length; i--) {
                delete collection[i];
            }
        }

        // Helpfully throw an exception on attempts to set to one past the last index.
        props[length] = {
            get: getterForProperty(length),
            set: setterForProperty(length),
            configurable: true,
        };

        Object.defineProperties(collection, props);

        size = length;
    };

    collection[keys.realm] = realmId;
    collection[keys.id] = info.id;
    collection[keys.type] = info.type;

    resize(info.size);

    addMutationListener(realmId, function listener() {
        try {
            resize();
        } catch (e) {
            // If the error indicates the collection was deleted, then remove this listener.
            if (e.message.indexOf('Access to invalidated') == 0) {
                removeMutationListener(realmId, listener);
            } else {
                throw e;
            }
        }
    });

    return collection;
}
