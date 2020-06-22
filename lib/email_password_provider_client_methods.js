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
    registerUser(email, password) {
        return new Promise((resolve, reject) => {
            this._registerUser(email, password, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    confirmUser(token, token_id) {
        return new Promise((resolve, reject) => {
            this._confirmUser(token, token_id, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    resendConfirmationEmail(email) {
        return new Promise((resolve, reject) => {
            this._resendConfirmationEmail(email, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    sendResetPasswordEmail(email) {
        return new Promise((resolve, reject) => {
            this._sendResetPasswordEmail(email, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    resetPassword(password, token, token_id) {
        return new Promise((resolve, reject) => {
            this._resetPassword(password, token, token_id, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    callResetPasswordFunction(email, password, bsonArgs) {
        return new Promise((resolve, reject) => {
            this._callResetPasswordFunction(email, password, bsonArgs, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
};

const staticMethods = {
    // none
};

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
};
