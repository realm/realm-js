////////////////////////////////////////////////////////////////////////////
//
// Copyright 2018 Realm Inc.
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
import { getterForProperty, createMethods } from './util';

export default class Subscription {
}

Object.defineProperties(Subscription.prototype, {
    error: { get: getterForProperty('error') },
    state: { get: getterForProperty('state') },
    name:  { get: getterForProperty('name') }
});

// Non-mutating methods:
createMethods(Subscription.prototype, objectTypes.SUBSCRIPTION, [
    'addListener',
    'removeListener',
    'removeAllListeners'
]);

// Mutating methods:
createMethods(Subscription.prototype, objectTypes.SUBSCRIPTION, [
    'unsubscribe',
], true);

export function createSubscription(realmId, info) {
    let subscription = Object.create(Subscription.prototype);
    subscription[keys.realm] = realmId;
    subscription[keys.id] = info.id;
    subscription[keys.type] = objectTypes.SUBSCRIPTION;
    return subscription;
}
