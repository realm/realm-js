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

function node_require(module) {
    return require(module);
}

var realmConstructor;

if (typeof Realm != 'undefined') {
    // The global Realm constructor should be available on device (using JavaScriptCore).
    realmConstructor = Realm;  // eslint-disable-line no-undef
// eslint-disable-next-line
} else if (typeof window != 'undefined') {
    // The userAgent will be defined when running in a browser (such as Chrome debugging mode).
    realmConstructor = require('./browser').default; // (exported as ES6 module)
// eslint-disable-next-line
} else if (typeof process == 'object' && (('' + process) == '[object process]' || typeof jest == 'object')) {
    // Prevent React Native packager from seeing this module.
    var binary = node_require('node-pre-gyp');
    var path = node_require('path');
    var binding_path = binary.find(path.resolve(path.join(__dirname,'../package.json')));
    realmConstructor = require(binding_path).Realm;
} else {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}

// Add the specified Array methods to the Collection prototype.
Object.defineProperties(realmConstructor.Collection.prototype, require('./collection-methods'));

// Add sync methods
realmConstructor.Sync.User = require('./sync').User;

// TODO: Remove this now useless object.
var types = Object.freeze({
    'BOOL': 'bool',
    'INT': 'int',
    'FLOAT': 'float',
    'DOUBLE': 'double',
    'STRING': 'string',
    'DATE': 'date',
    'DATA': 'data',
    'OBJECT': 'object',
    'LIST': 'list',
});
Object.defineProperty(realmConstructor, 'Types', {
    get: function() {
        if (typeof console != 'undefined') {
            /* global console */
            /* eslint-disable no-console */
            var stack = new Error().stack.split("\n").slice(2).join("\n");
            var msg = '`Realm.Types` is deprecated! Please specify the type name as lowercase string instead!\n'+stack;
            if (console.warn != undefined) {
                console.warn(msg);
            }
            else {
                console.log(msg);
            }
            /* eslint-enable no-console */
        }
        return types;
    },
    configurable: true
});

module.exports = realmConstructor;
