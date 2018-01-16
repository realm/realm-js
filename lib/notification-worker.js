////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function nodeRequire(module) {
    return require_method(module);
}

const Realm = require('.');

let impl;
process.on('message', (m) => {
    switch (m.message) {
        case 'load':
            impl = require(m.module);
            break;
        case 'available':
            if (impl.onavailable) {
                impl.onavailable(m.path);
            }
            process.send({});
            break;
        case 'change':
            if (impl.onchange) {
                const change = Realm.Sync._deserializeChangeSet(m.change);
                if (!change.isEmpty) {
                    impl.onchange(change);
                }
                change.close();
            }
            process.send({change: m.change});
            break;
        case 'message':
            if (impl.onmessage) {
                impl.onmessage(m.body);
            }
            process.send({});
            break;
        case 'stop':
            process.exit(0);
    }
});
