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

const {promisify} = require("./utils.js");

const instanceMethods = {
    createAPIKey(name) {
        return promisify(cb => this._createAPIKey(name, cb));
    },

    fetchAPIKey(id) {
        return promisify(cb => this._fetchAPIKey(id, cb));
    },

    fetchAPIKeys() {
        return promisify(cb => this._fetchAPIKeys(cb));
    },

    deleteAPIKey(apiKeyId) {
        return promisify(cb => this._deleteAPIKey(apiKeyId, cb));
    },

    enableAPIKey(apiKeyId) {
        return promisify(cb => this._enableAPIKey(apiKeyId, cb));
    },

    disableAPIKey(apiKeyId) {
        return promisify(cb => this._disableAPIKey(apiKeyId, cb));
    },
};

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};
