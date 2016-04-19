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

var arrayMethods = require('./collection-methods');
var realmConstructor;

if (typeof Realm != 'undefined') {
    // The global Realm constructor should be available on device (using JavaScriptCore).
    realmConstructor = Realm;  // eslint-disable-line no-undef
// eslint-disable-next-line
} else if (typeof navigator != 'undefined' && navigator.userAgent) {
    // The userAgent will be defined when running in a browser (such as Chrome debugging mode).
    realmConstructor = require('./browser').default; // (exported as ES6 module)
// eslint-disable-next-line
} else if (typeof process == 'object' && ('' + process) == '[object process]') {
    // Prevent React Native packager from seeing this module.
    var bindings = 'bindings';
    realmConstructor = require(bindings)('realm').Realm;
} else {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}

// Add the specified Array methods to the Collection prototype.
Object.defineProperties(realmConstructor.Collection.prototype, arrayMethods);

// TODO: Remove this now useless object.
Object.defineProperty(realmConstructor, 'Types', {
    value: Object.freeze({
        'BOOL': 'bool',
        'INT': 'int',
        'FLOAT': 'float',
        'DOUBLE': 'double',
        'STRING': 'string',
        'DATE': 'date',
        'DATA': 'data',
        'OBJECT': 'object',
        'LIST': 'list',
    })
});

module.exports = realmConstructor;
