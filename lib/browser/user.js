////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

import { EJSON } from "bson";

import { keys, objectTypes } from "./constants";
import { getterForProperty, createMethods } from "./util";
import { promisify } from "../utils";

export default class User {
  logOut() {
    return promisify((cb) => this._logOut(cb));
  }

  async callFunction(name, args, service) {
    const stringifiedArgs = EJSON.stringify(args, { relaxed: false });
    const result = await promisify((cb) => this._callFunction(name, stringifiedArgs, service, cb));
    return EJSON.parse(result);
  }

  get functions() {
    return new Proxy(this, {
      get(target, name, receiver) {
        if (typeof name === "string" && name !== "inspect") {
          return function (...args) {
            return target.callFunction(name, args);
          };
        } else {
          return Reflect.get(target, name, receiver);
        }
      },
    });
  }

  get customData() {
    return EJSON.parse(this._customData);
  }
}

createMethods(User.prototype, objectTypes.USER, [
  "_logOut",
  "_sessionForOnDiskPath",
  "_linkCredentials",
  "_callFunction",
  "_pushRegister",
  "_pushDeregister",
  "_makeStreamingRequest",
  // "_newWatchStream", // TODO expose WatchStream type via RN debug API
]);

Object.defineProperties(User.prototype, {
  id: { get: getterForProperty("id") },
  accessToken: { get: getterForProperty("accessToken") },
  refreshToken: { get: getterForProperty("refreshToken") },
  profile: { get: getterForProperty("profile") },
  identities: { get: getterForProperty("identities") },
  providerType: { get: getterForProperty("providerType") },
  isLoggedIn: { get: getterForProperty("isLoggedIn") },
  state: { get: getterForProperty("state") },
  apiKeys: { get: getterForProperty("apiKeys") },
  deviceId: { get: getterForProperty("deviceId") },
  _customData: { get: getterForProperty("_customData") },
});

export function createUser(realmId, info) {
  const userProxy = Object.create(User.prototype);

  // FIXME: This is currently necessary because util/createMethod expects
  // the realm id to be present on any object that is used over rpc
  userProxy[keys.realm] = "(User object)";
  userProxy[keys.id] = info.id;
  userProxy[keys.type] = objectTypes.USER;

  return userProxy;
}
