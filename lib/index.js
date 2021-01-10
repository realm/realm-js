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

"use strict";

const utils = require("./utils");

// Prevent React Native packager from seeing modules required with this
const nodeRequire = require;

function getRealmConstructor(context) {
    switch(context) {
        case 'node.js':
        case 'electron':
            var analytics = nodeRequire('./submit-analytics');
            analytics.submitProductionAnalytics('Run');

            var binary = nodeRequire("node-pre-gyp");
            var path = nodeRequire("path");
            var pkg = path.resolve(path.join(__dirname,"../package.json"));
            var binding_path = binary.find(pkg);

            return nodeRequire(binding_path).Realm;
        case "reactnative":
            //switch how babel transpiled code creates children objects.
            //Inheriting from Realm.Object with class syntax does not support using Reflect.construct the way babel transpiles it.
            //Defining Reflect.construct.sham makes the transpiled code use different standart mechanism for inheriting. (Function.apply with setPrototypeOf)
            if (typeof Reflect !== "undefined" && Reflect.construct) {
                Reflect.construct.sham = 1;
            }
            return global.Realm;
        case "jscore":
            return global.Realm;
        case "chromedebugger":
        case "vscodedebugger":
            // This condition is for stripping "browser" folder from production bundles.
            if (global.__DEV__) {
                return require("./browser").default; // (exported as ES6 module)
            } else {
                throw new Error("Can´t use debugger if __DEV__ isn´t true.");
            }
        default:
            throw new Error("Unexpected execution context (" + context + ")");
    }
}

const environment = utils.getEnvironment();
const realmConstructor = getRealmConstructor(environment);

require("./extensions")(realmConstructor, environment);

const versions = utils.getVersions();
realmConstructor.App._setVersions(versions);

module.exports = realmConstructor;
