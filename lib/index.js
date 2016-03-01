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

var realmConstructor;

if (typeof Realm != 'undefined') {
    // The global Realm constructor should be available on device (using JavaScriptCore).
    realmConstructor = Realm;  // eslint-disable-line no-undef
} else if (typeof navigator != 'undefined' && navigator.userAgent) { // eslint-disable-line no-undef
    // The userAgent will be defined when running in a browser (such as Chrome debugging mode).
    realmConstructor = require('./browser').default; // (exported as ES6 module)
} else {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}

var arrayPrototype = Array.prototype;
var arrayMethods = {};

[
    'join',
    'slice',
    'forEach',
    'every',
    'some',
    'find',
    'findIndex',
    'map',
    'reduce',
    'reduceRight',
    'entries',
    'keys',
    'values',
].forEach(function(methodName) {
    var method = arrayPrototype[methodName];
    if (method) {
        arrayMethods[methodName] = {value: method};
    }
});

// Add the specified Array methods to the prototype of List and Results.
Object.defineProperties(realmConstructor.List.prototype, arrayMethods);
Object.defineProperties(realmConstructor.Results.prototype, arrayMethods);

module.exports = realmConstructor;
