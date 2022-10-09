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

const { EJSON } = require("bson");

const { promisify } = require("./utils.js");

const instanceMethods = {
  registerUser(details) {
    return promisify((cb) => this._registerUser(details, cb));
  },

  confirmUser(details) {
    return promisify((cb) => this._confirmUser(details, cb));
  },

  resendConfirmationEmail(details) {
    return promisify((cb) => this._resendConfirmationEmail(details, cb));
  },

  retryCustomConfirmation(details) {
    return promisify((cb) => this._retryCustomConfirmation(details, cb));
  },

  sendResetPasswordEmail(details) {
    return promisify((cb) => this._sendResetPasswordEmail(details, cb));
  },

  resetPassword(details) {
    return promisify((cb) => this._resetPassword(details, cb));
  },

  callResetPasswordFunction(details, ...args) {
    const stringifiedArgs = EJSON.stringify(args, { relaxed: false });
    return promisify((cb) => this._callResetPasswordFunction(details, stringifiedArgs, cb));
  },
};

const staticMethods = {
  // none
};

module.exports = {
  static: staticMethods,
  instance: instanceMethods,
};
