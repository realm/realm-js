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

const instanceMethods = {
    createAPIKey(name) {
        return new Promise((resolve, reject) => {
            this._createAPIKey(name, (apiKey, err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKey);
                }
            });
        });
    },

    fetchAPIKey(id) {
        return new Promise((resolve, reject) => {
            this._fetchAPIKey(id, (apiKey, err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKey);
                }
            });
        });
    },

    fetchAPIKeys() {
        return new Promise((resolve, reject) => {
            this._fetchAPIKeys((apiKeys, err)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(apiKeys);
                }
            });
        });
    },

    deleteAPIKey(apiKeyId) {
        return new Promise((resolve, reject) => {
            this._deleteAPIKey(apiKeyId, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    enableAPIKey(apiKeyId) {
        return new Promise((resolve, reject) => {
            this._enableAPIKey(apiKeyId, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    disableAPIKey(apiKeyId) {
        return new Promise((resolve, reject) => {
            this._disableAPIKey(apiKeyId, (err) => {
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