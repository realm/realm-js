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

// If process is defined, we're running in node.
function isNode() {
    return typeof process == 'object' && (('' + process) == '[object process]' || typeof jest == 'object')
}

// function isElectronRenderer() {
//     return isNode() && process.type === 'renderer'
// }

var realmConstructor;
if (isNode()) {
    node_require('./submit-analytics')('Run'); 

    // Prevent React Native packager from seeing this module.
    var binary = node_require('node-pre-gyp');
    var path = node_require('path');
    var pkg = path.resolve(path.join(__dirname,'../package.json'));
    var binding_path = binary.find(pkg);
    realmConstructor = require(binding_path).Realm;
} else {
    if (typeof Realm != 'undefined') {
        // The global Realm constructor should be available on device (using JavaScriptCore).
        realmConstructor = Realm;  // eslint-disable-line no-undef
    // eslint-disable-next-line
    } else if (typeof window != 'undefined') {
        // The userAgent will be defined when running in a browser (such as Chrome debugging mode).
        realmConstructor = require('./browser').default; // (exported as ES6 module)
    // eslint-disable-next-line
    }
}

if (!realmConstructor) {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}

require('./extensions')(realmConstructor);

module.exports = realmConstructor;
