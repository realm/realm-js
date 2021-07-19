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

const { promisify } = require("./utils.js");

const instanceMethods = {
  create(name) {
    return promisify((cb) => this._create(name, cb));
  },

  fetch(id) {
    return promisify((cb) => this._fetch(id, cb));
  },

  fetchAll() {
    return promisify((cb) => this._fetchAll(cb));
  },

  delete(apiKeyId) {
    return promisify((cb) => this._delete(apiKeyId, cb));
  },

  enable(apiKeyId) {
    return promisify((cb) => this._enable(apiKeyId, cb));
  },

  disable(apiKeyId) {
    return promisify((cb) => this._disable(apiKeyId, cb));
  },
};

const staticMethods = {
  // none
};

module.exports = {
  static: staticMethods,
  instance: instanceMethods,
};
