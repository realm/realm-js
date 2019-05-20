
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

import { createUser as createUserRPC, _adminUser as _adminUserRPC, getAllUsers as getAllUsersRPC, _getExistingUser as _getExistingUserRPC } from './rpc';
import { keys, objectTypes } from './constants';
import { getterForProperty, createMethods } from './util';

export default class User {
    static createUser(server, identity, token, isAdminToken, isAdminUser) {
       return createUserRPC(Array.from(arguments));
    }

    static _adminUser(adminToken, server) {
        return _adminUserRPC(Array.from(arguments));
    }

    static get all() {
        return getAllUsersRPC();
    }

    static _getExistingUser(server, identity) {
        return _getExistingUserRPC(Array.from(arguments));
    }
}

Object.defineProperties(User.prototype, {
    token: { get: getterForProperty('token') },
});

createMethods(User.prototype, objectTypes.USER, [
    '_logout',
    '_sessionForOnDiskPath'
]);

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
