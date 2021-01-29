////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

"use strict";


module.exports = {
    /**
     * Helper to wrap callback-taking C++ function into a Promise-returning JS function
     * @example
     * // floop() is a wrapper method on a type with a _floop C++ method.
     * function floop(how, why) {
     *   return promisify(cb => this._floop(how, why, cb));
     * }
     */
    promisify(func) {
        return new Promise((resolve, reject) => {
            func((...cbargs) => {
                if (cbargs.length < 1 || cbargs.length > 2)
                    throw Error(`invalid cbargs length ${cbargs.length}`)
                let error = cbargs[cbargs.length-1];
                if (error) {
                    reject(error);
                } else if (cbargs.length == 2) {
                    resolve(cbargs[0]);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Determines the environment in which the package is being loaded.
     * @returns A string representing the environment.
     */
    getEnvironment() {
        // If process.release.name is an object with we're probably running in Node or Electron
        // From: http://stackoverflow.com/a/24279593/1417293
        if (typeof process === "object" && typeof process.release === "object" && process.release.name === "node") {
    
            // Visual Studio Code defines the global.__debug__ object.
            if (typeof global === "object" && global.__debug__) {
                return "vscodedebugger";
            }
    
            return typeof process.versions === "object" && typeof process.versions.electron === "string" ? "electron" : "node.js";
        }
    
        // When running via Jest, the jest object is defined.
        if (typeof jest === "object") {
            return "node.js";
        }
    
        if (typeof navigator === "object" && navigator.product === "ReactNative") { // eslint-disable-line no-undef
            // Visual Studio Code defines the global.__debug__ object.
            if (typeof global !== "undefined" && global.__debug__) {
                return "vscodedebugger"
            }
    
            // Check if its in remote js debugging mode
            // https://stackoverflow.com/a/50377644
            if (typeof DedicatedWorkerGlobalScope !== "undefined") {
                return "chromedebugger";
            }
    
            // Otherwise, we must be in a "normal" react native situation.
            // In that case, the Realm type should have been injected by the native code.
            // If it hasn't, the user likely forgot to install the RealmJS CocoaPod
            if (typeof Realm === "undefined") {
                throw new Error("Missing Realm constructor. Did you run \"pod install\"? Please see https://realm.io/docs/react-native/latest/#missing-realm-constructor for troubleshooting");
            }
    
            return "reactnative";
        }
    
        // If we're not running in React Native but we already injected the Realm class,
        // we are probably running in a pure jscore environment
        if (typeof Realm !== "undefined") {
            return "jscore";
        }
    
        // Visual Studio Code defines the global.__debug__ object.
        if (typeof global !== "undefined" && global.__debug__) {
            return "vscodedebugger";
        }
    
        // Finally, if the navigator.userAgent contains the string "Chrome", we're likely
        // running via the chrome debugger, even if navigator.product isn't set to "ReactNative"
        if (typeof navigator !== "undefined" &&
            /Chrome/.test(navigator.userAgent)) { // eslint-disable-line no-undef
            return "chromedebugger";
        }
    
        throw new Error("Unknown execution context");
    },

    /**
     * @returns An object with names and versions of the various components making up the context.
     */
    getVersions() {
        const packageJson = require("../package.json");
        const packageVersion = packageJson.version;
        const environment = this.getEnvironment();

        try {
            if (environment === "reactnative") {
                const { Platform } = require("react-native");
                return {
                    packageVersion,
                    platformContext: environment,
                    platformOs: Platform.OS,
                    // Android reports a number ...
                    platformVersion: `${Platform.Version}`,
                };
            } else if (environment === "node.js" || environment === "electron") {
                return {
                    packageVersion,
                    platformContext: environment,
                    platformOs: process.platform,
                    platformVersion: process.versions.electron || process.version,
                };
            }
        } catch (err) {
            console.warn("Error getting versions:", err.stack);
        }
        
        return {
            packageVersion,
            platformContext: environment,
            platformOs: "unknown",
            platformVersion: "?.?.?",
        };
    },
}
