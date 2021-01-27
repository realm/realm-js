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

import { keys, objectTypes } from "./constants";
import { createMethods } from "./util";
import { promisify } from "../utils";

export class EmailPasswordAuth {
  registerUser(email, password) {
    return promisify(cb => this._registerUser(email, password, cb));
  }

  confirmUser(token, token_id) {
      return promisify(cb => this._confirmUser(token, token_id, cb));
  }

  resendConfirmationEmail(email) {
      return promisify(cb => this._resendConfirmationEmail(email, cb));
  }

  sendResetPasswordEmail(email) {
      return promisify(cb => this._sendResetPasswordEmail(email, cb));
  }

  resetPassword(password, token, token_id) {
      return promisify(cb => this._resetPassword(password, token, token_id, cb));
  }

  callResetPasswordFunction(email, password, ...bsonArgs) {
      return promisify(cb => this._callResetPasswordFunction(email, password, bsonArgs, cb));
  }
}

createMethods(EmailPasswordAuth.prototype, objectTypes.EMAILPASSWORDAUTH, [
    "_registerUser",
    "_confirmUser",
    "_resendConfirmationEmail",
    "_sendResetPasswordEmail",
    "_resetPassword",
    "_callResetPasswordFunction",
]);

export function createEmailPasswordAuth(realmId, info) {
    const proxy = Object.create(EmailPasswordAuth.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    proxy[keys.realm] = "(EmailPasswordAuth object)";
    proxy[keys.id] = info.id;
    proxy[keys.type] = objectTypes.EMAILPASSWORDAUTH;

    return proxy;
}
