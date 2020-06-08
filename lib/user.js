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

const {RemoteMongoDBCollection} = require("./mongo_client.js");
const {promisify} = require("./utils.js");

const instanceMethods = {
    linkCredentials(credentials) {
        return promisify(cb => this._linkCredentials(credentials, cb));
    },

    callFunction(name, args, service = undefined) {
        function cleanArgs(args) {
            for (const arg of args) {
                if (typeof arg === "object") {
                    for (const [key, value] of Object.entries(arg)) {
                        if (value === undefined) {
                            delete arg[key];
                        }
                    }
                }
            }
            return args;
        }
        args = cleanArgs(args);

        return promisify(cb => this._callFunction(name, args, service, cb));
    },

    async refreshCustomData() {
        await promisify(cb => this._refreshCustomData(cb));
        return this.customData;
    },

    remoteMongoClient(serviceName) {
        const user = this;
        return {
            db(dbName) {
                return {
                    collection(collName) {
                        return new RemoteMongoDBCollection(
                            user._functionsOnService(serviceName),
                            dbName,
                            collName);
                    },
                };
            },
        };
    },

    _functionsOnService(service) {
        const user = this;
        return new Proxy({}, {
            get(target, name, receiver) {
                if (typeof name === "string" && name != "inspect") {
                    return (...args) => {
                        return user.callFunction(name, args, service);
                    };
                } else {
                    return Reflect.get(target, name, receiver);
                }
            },
        });
    },

    get functions() {
        return this._functionsOnService(undefined);
    },

    get auth() {
        const user = this;
        return new Proxy({}, {
            get(target, name) {
                if (name === "apiKeys") {
                    return user._authApiKeys;
                }
            }
        });
    }
}

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};
