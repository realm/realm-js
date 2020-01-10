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

// Prevent React Native packager from seeing modules required with this
const nodeRequire = require;

const Realm = nodeRequire('.');

let impl;
process.on('message', (m) => {
    switch (m.message) {
        case 'load':
            impl = require(m.module);
            process.send({});
            break;
        case 'available':
            if (impl.onavailable) {
                impl.onavailable(m.path);
            }
            process.send({});
            break;
        case 'change':
        case 'delete':
            if (impl['on' + m.message]) {
                const change = Realm.Sync._deserializeChangeSet(m.change);
                try {
                    if (m.message === 'delete') {
                        impl.ondelete(change.path);
                    }
                    else if (!change.isEmpty) {
                        impl.onchange(change);
                    }
                }
                catch (e) {
                    change.close();
                    process.send({change: m.change});
                    throw e;
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
