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

// Prevent React Native packager from seeing modules required with this
function node_require(module) {
    return require(module);
}

function getContext() {
    if (typeof process == 'object' && (('' + process) == '[object process]' || typeof jest == 'object')) {
        return process.type === 'renderer' ? 'electron' : 'nodejs';
    } else {
        if (navigator && navigator.product === 'ReactNative') {
            return 'reactnative';
        } else if (typeof navigator !== 'undefined' && navigator.product === 'Gecko') {
            return 'chromedebugger';
        } else if (global.__debug__) {  // This might be provided by Nuclide and other IDE's as well..
            return 'vscodedebugger';
        }
    }
    return 'unknown';
}

var realmConstructor;

switch(getContext()) {
    case 'nodejs':
    case 'electron':
        node_require('./submit-analytics')('Run'); 

        var binary = node_require('node-pre-gyp');
        var path = node_require('path');
        var pkg = path.resolve(path.join(__dirname,'../package.json'));
        var binding_path = binary.find(pkg);

        realmConstructor = require(binding_path).Realm;
        break;
    
    case 'reactnative':
        realmConstructor = Realm;  // eslint-disable-line no-undef
        break;

    case 'chromedebugger':
    case 'vscodedebugger':
        realmConstructor = require('./browser').default; // (exported as ES6 module)
        break;
}


if (!realmConstructor) {
    throw new Error('Missing Realm constructor. Did you run "react-native link realm"? Please see https://realm.io/docs/react-native/latest/#missing-realm-constructor for troubleshooting');
}

require('./extensions')(realmConstructor);

module.exports = realmConstructor;
