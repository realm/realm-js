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
    createAPIKey(name, user) {
        return new Promise((resolve, reject) => {
            this._createAPIKey(name, user, (apiKey, err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKey);
                }
            });
        });
    },

    fetchAPIKey(id, user) {
        return new Promise((resolve, reject) => {
            this._fetchAPIKey(id, user, (apiKey, err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKey);
                }
            });
        });
    },

    fetchAPIKeys(user) {
        return new Promise((resolve, reject) => {
            this._fetchAPIKeys(user, (apiKeys, err)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKeys);
                }
            });
        });
    },

    deleteAPIKey(apiKeyId, user) {
        return new Promise((resolve, reject) => {
            this._deleteAPIKey(apiKeyId, user, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    enableAPIKey(apiKeyId, user) {
        return new Promise((resolve, reject) => {
            this._enableAPIKey(apiKeyId, user, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    disableAPIKey(apiKeyId, user) {
        return new Promise((resolve, reject) => {
            this._disableAPIKey(apiKeyId, user, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },


};

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};