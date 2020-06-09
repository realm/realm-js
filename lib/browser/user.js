
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

'use strict';

import { keys, objectTypes } from './constants';
import { getterForProperty, createMethods } from './util';

export default class User {
}

createMethods(User.prototype, objectTypes.USER, [
    "logOut",
    "_sessionForOnDiskPath",
    "_deleteUser",
    "_linkCredentials",
    "_callFunction",
    "_pushRegister",
    "_pushDeregister",
]);

Object.defineProperties(User.prototype, {
    identity: { get: getterForProperty('identity') },
    token: { get: getterForProperty('token') },
    profile: { get: getterForProperty('profile') },
    isLoggedIn: { get: getterForProperty('isLoggedIn') },
    state: { get: getterForProperty('state') },
    customData: { get: getterForProperty('customData') },
});

export function createUser(realmId, info) {
    const userProxy = Object.create(User.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    userProxy[keys.realm] = "(User object)";

    userProxy[keys.id] = info.id;
    userProxy[keys.type] = objectTypes.USER;
    Object.assign(userProxy, info.data);

    return userProxy;
}
