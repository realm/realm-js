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
const nodeRequire = require;

function getContext() {
    // If process.release.name is an object with we're probably running in Node or Electron
    // From: http://stackoverflow.com/a/24279593/1417293
    if (typeof process === 'object' && typeof process.release === "object" && process.release.name === "node") {

        // Visual Studio Code defines the global.__debug__ object.
        if (typeof global === 'object' && global.__debug__) {
            return 'vscodedebugger';
        }

        return typeof process.versions === "object" && typeof process.versions.electron === "string" ? 'electron' : 'node.js';
    }

    // When running via Jest, the jest object is defined.
    if (typeof jest === 'object') {
        return 'node.js';
    }

    if (typeof navigator === 'object' && navigator.product === 'ReactNative') { // eslint-disable-line no-undef
        // Visual Studio Code defines the global.__debug__ object.
        if (typeof global !== 'undefined' && global.__debug__) {
            return 'vscodedebugger'
        }

        // Check if its in remote js debugging mode
        // https://stackoverflow.com/a/50377644
        if (typeof DedicatedWorkerGlobalScope !== 'undefined') {
            return 'chromedebugger';
        }

        // Otherwise, we must be in a "normal" react native situation.
        // In that case, the Realm type should have been injected by the native code.
        // If it hasn't, the user likely forgot to install the RealmJS CocoaPod
        if (typeof Realm === 'undefined') {
            throw new Error('Missing Realm constructor. Did you run "pod install"? Please see https://realm.io/docs/react-native/latest/#missing-realm-constructor for troubleshooting');
        }

        return 'reactnative';
    }

    // If we're not running in React Native but we already injected the Realm class,
    // we are probably running in a pure jscore environment
    if (typeof Realm !== 'undefined') {
        return 'jscore';
    }

    // Visual Studio Code defines the global.__debug__ object.
    if (typeof global !== 'undefined' && global.__debug__) {
        return 'vscodedebugger';
    }

    // Finally, if the navigator.userAgent contains the string "Chrome", we're likely
    // running via the chrome debugger, even if navigator.product isn't set to "ReactNative"
    if (typeof navigator !== 'undefined' &&
        /Chrome/.test(navigator.userAgent)) { // eslint-disable-line no-undef
        return 'chromedebugger';
    }

    throw new Error("Unknown execution context");
}

function getRealmConstructor(context) {
    switch(context) {
        case 'node.js':
        case 'electron':
            nodeRequire('./submit-analytics')('Run', context);
    
            var binary = nodeRequire('node-pre-gyp');
            var path = nodeRequire('path');
            var pkg = path.resolve(path.join(__dirname,'../package.json'));
            var binding_path = binary.find(pkg);

            return nodeRequire(binding_path).Realm;
        case 'reactnative':
        case 'jscore':
            return global.Realm;
        case 'chromedebugger':
        case 'vscodedebugger':
            // This condition is for stripping "browser" folder from production bundles.
            if (global.__DEV__) {
                return require('./browser').default; // (exported as ES6 module)
            } else {
                throw new Error('Can´t use debugger if __DEV__ isn´t true.');
            }
        default:
            throw new Error("Unexpected execution context (" + context + ")");
    }
}

const context = getContext();
const realmConstructor = getRealmConstructor(context);

require('./extensions')(realmConstructor, context);

if (realmConstructor.Sync) {
    if (context === 'node.js') {
      nodeRequire('./notifier')(realmConstructor);
      if (!realmConstructor.Worker) {
          Object.defineProperty(realmConstructor, 'Worker', { value: nodeRequire('./worker') });
      }
    }
}

module.exports = realmConstructor;
