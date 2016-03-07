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

const registeredConstructors = {};

export function create(realmId, info) {
    let schema = info.schema;
    let constructor = (registeredConstructors[realmId] || {})[schema.name];
    let object = constructor ? Object.create(constructor.prototype) : {};

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

    return object;
}

export function registerConstructors(realmId, constructors) {
    registeredConstructors[realmId] = constructors;
}

export function typeForConstructor(realmId, constructor) {
    let constructors = registeredConstructors[realmId];

    for (let name in constructors) {
        if (constructors[name] == constructor) {
            return name;
        }
    }

    return null;
}
