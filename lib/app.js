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
  logIn(credentials) {
    return promisify((cb) => this._logIn(credentials, cb));
  },

  removeUser(user) {
    return promisify((cb) => this._removeUser(user, cb));
  },

  deleteUser(user) {
    return promisify((cb) => this._deleteUser(user, cb));
  },
};

const staticMethods = {
  getApp(appId) {
    let app = this._getApp(appId);
    if (app) {
      return app;
    } else {
      return new this(appId);
    }
  },
};

module.exports = {
  static: staticMethods,
  instance: instanceMethods,
};
