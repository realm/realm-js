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

module.exports = function(realmConstructor) {
    // Add the specified Array methods to the Collection prototype.
    Object.defineProperties(realmConstructor.Collection.prototype, require('./collection-methods'));

    // Add sync methods
    if (realmConstructor.Sync) {
        Object.defineProperties(realmConstructor.Sync.User, require('./user-methods')(realmConstructor));
        realmConstructor.Sync.AuthError = require('./errors').AuthError;

        if (realmConstructor.Sync.cleanup) {
            process.on('exit', () => realmConstructor.Sync.cleanup());
        }
    }

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
}