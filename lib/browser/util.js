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

import { fireMutationListeners } from './collections';
import { keys } from './constants';
import * as rpc from './rpc';

export function createMethods(prototype, type, methodNames, mutates) {
    let props = {};

    methodNames.forEach((name) => {
        props[name] = {
            value: createMethod(type, name, mutates),
        };
    });

    Object.defineProperties(prototype, props);
}

export function createMethod(type, name, mutates) {
    return function() {
        let realmId = this[keys.realm];
        let id = this[keys.id];

        if (!realmId || !id) {
            throw new TypeError(name + ' method was not called a Realm object!');
        }
        if (this[keys.type] !== type) {
            throw new TypeError(name + ' method was called on an object of the wrong type!');
        }

        try {
            return rpc.callMethod(realmId, id, name, Array.from(arguments));
        } finally {
            if (mutates) {
                fireMutationListeners(realmId);
            }
        }
    };
}

export function getterForProperty(name) {
    return function() {
        return rpc.getProperty(this[keys.realm], this[keys.id], name);
    };
}

export function setterForProperty(name) {
    return function(value) {
        let realmId = this[keys.realm];

        rpc.setProperty(realmId, this[keys.id], name, value);

        // If this isn't a primitive value, then it might create a new object in the Realm.
        if (value && typeof value == 'object') {
            fireMutationListeners(realmId);
        }
    };
}
