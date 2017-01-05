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
function nodeRequire(module) {
    return require(module);
}


function getContext() {
    // If process is an object, we're probably running in Node or Electron
    // From: http://stackoverflow.com/a/24279593/1417293
    if (typeof process === 'object' && process + '' === '[object process]') {
        return process.type === 'renderer' ? 'electron' : 'nodejs';
    }

    // When running via Jest, the jest object is defined.
    if (typeof jest === 'object') {
        return 'nodejs';
    }

    // If we've already injected the Realm class, we are probably
    // running in a jscore environment, either directly or via React Native
    if (typeof Realm !== 'undefined') {
        if (typeof navigator !== 'undefined' && 
            navigator.product === 'ReactNative') { // eslint-disable-line no-undef
            return 'reactnative';
        }

        return 'jscore';
    }

    // Visual Studio Code defines the global.__debug__ object.
    if (typeof global !== 'undefined' && global.__debug__) {
        return 'vscodedebugger';
    }

    // Finally, if the navigator.userAgent contains the string "Chrome", we're likely
    // running via the chrome debugger.
    if (typeof navigator !== 'undefined' && 
        /Chrome/.test(navigator.userAgent)) { // eslint-disable-line no-undef
        return 'chromedebugger';
    }

    throw Error("Unknown execution context");
}

var realmConstructor;

switch(getContext()) {
    case 'nodejs':
    case 'electron':
        nodeRequire('./submit-analytics')('Run'); 

        var binary = nodeRequire('node-pre-gyp');
        var path = nodeRequire('path');
        var pkg = path.resolve(path.join(__dirname,'../package.json'));
        var binding_path = binary.find(pkg);

        realmConstructor = require(binding_path).Realm;
        break;
    
    case 'reactnative':
    case 'jscore':
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
