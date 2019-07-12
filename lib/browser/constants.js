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

export const keys = {};
export const objectTypes = {};
export const propTypes = {};

[
    'id',
    'realm',
    'type',
].forEach(function(name) {
    keys[name] = Symbol(name);
});

[
    'DATA',
    'DATE',
    'DICT',
    'FUNCTION',
    'LIST',
    'OBJECT',
    'REALM',
    'RESULTS',
    'USER',
    'SESSION',
    'SUBSCRIPTION',
    'ASYNCOPENTASK',
    'UNDEFINED',
].forEach(function(type) {
    Object.defineProperty(objectTypes, type, {
        value: type.toLowerCase(),
    });
});

[
    'BOOL',
    'INT',
    'FLOAT',
    'DOUBLE',
    'STRING',
    'DATE',
    'DATA',
    'OBJECT',
    'LIST',
].forEach(function(type) {
    Object.defineProperty(propTypes, type, {
        value: type.toLowerCase(),
        enumerable: true,
    });
});
