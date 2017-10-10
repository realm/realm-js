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

import Collection, { createCollection } from './collections';
import { objectTypes } from './constants';
import { createMethods } from './util';

export default class Results extends Collection {
}

// Non-mutating methods:
createMethods(Results.prototype, objectTypes.RESULTS, [
    'filtered',
    'sorted',
    'snapshot',
    'isValid',
    'indexOf',
    'min',
    'max',
    'sum',
    'avg',
    'addListener',
    'removeListener',
    'removeAllListeners',
]);

// Mutating methods:
createMethods(Results.prototype, objectTypes.RESULTS, [
    'update',
], true);

export function createResults(realmId, info) {
    return createCollection(Results.prototype, realmId, info);
}
