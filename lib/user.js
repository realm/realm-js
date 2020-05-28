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

'use strict';

const instanceMethods = {
    deleteUser() {
        return new Promise((resolve, reject) => {
            this._deleteUser((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    },

    linkCredentials(credentials) {
        return new Promise((resolve, reject) => {
            this._linkCredentials(credentials, (user, error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(user);
                }
            });
        });
    },

    callFunction(name, args) {
        return new Promise((resolve, reject) => {
            this._callFunction(name, args, (result, error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    },

    get functions() {
        const user = this;
        return new Proxy({}, {
            get(target, name) {
                return (...args) => {
                    return user.callFunction(name, args);
                };
            },
        });
    },
}

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};
