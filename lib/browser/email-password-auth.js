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

import { keys, objectTypes } from "./constants";
import { createMethods } from "./util";
import { promisify } from "../utils";
import { handleDeprecatedPositionalArgs } from "@realm.io/common";

// TODO for v11: change all signatures to methodName(argsObject) and remove handleDeprecatedPositionalArgs call
//
// Example post-v11:
// registerUser(argsObject) {
//   return promisify((cb) => this._registerUser(argsObject, cb));
// },
export class EmailPasswordAuth {
  registerUser(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "registerUser", ["email", "password"]);

    return promisify((cb) => this._registerUser(argsObject, cb));
  }

  confirmUser(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "confirmUser", ["token", "tokenId"]);

    return promisify((cb) => this._confirmUser(argsObject, cb));
  }

  resendConfirmationEmail(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "resendConfirmationEmail", ["email"]);

    return promisify((cb) => this._resendConfirmationEmail(argsObject, cb));
  }

  retryCustomConfirmation(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "retryCustomConfirmation", ["email"]);

    return promisify((cb) => this._retryCustomConfirmation(argsObject, cb));
  }

  sendResetPasswordEmail(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "sendResetPasswordEmail", ["email"]);

    return promisify((cb) => this._sendResetPasswordEmail(argsObject, cb));
  }

  resetPassword(...args) {
    const { argsObject } = handleDeprecatedPositionalArgs(args, "resetPassword", ["password", "token", "tokenId"]);

    return promisify((cb) => this._resetPassword(argsObject, cb));
  }

  callResetPasswordFunction(...args) {
    const { argsObject, restArgs } = handleDeprecatedPositionalArgs(
      args,
      "callResetPasswordFunction",
      ["email", "password"],
      true,
    );

    return promisify((cb) => this._callResetPasswordFunction(argsObject, restArgs, cb));
  }
}

createMethods(EmailPasswordAuth.prototype, objectTypes.EMAILPASSWORDAUTH, [
  "_registerUser",
  "_confirmUser",
  "_resendConfirmationEmail",
  "_retryCustomConfirmation",
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
