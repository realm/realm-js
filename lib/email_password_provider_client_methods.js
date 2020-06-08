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

const {promisify} = require("./utils.js");

const instanceMethods = {
    registerEmail(email, password) {
        return promisify(cb => this._registerEmail(cb));
    },

    confirmUser(token, token_id) {
        return promisify(cb => this._confirmUser(token, token_id, cb));
    },

    resendConfirmationEmail(email) {
        return promisify(cb => this._resendConfirmationEmail(email, cb));
    },

    sendResetPasswordEmail(email) {
        return promisify(cb => this._sendResetPasswordEmail(email, cb));
    },

    resetPassword(password, token, token_id) {
        return promisify(cb => this._sendResetPasswordEmail(password, token_id, token_id, cb));
    }
};

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};
