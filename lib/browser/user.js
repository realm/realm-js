
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

import { createUser as createUserRPC, getAllUsers as getAllUsersRPC } from './rpc';
import { keys, objectTypes } from './constants';
import { getterForProperty } from './util';

class User {
    static createUser(server, identity, token, isAdmin) {
       return createUserRPC(Array.from(arguments)); 
    }

    static get all() {
        console.log("Getting all()");
        return getAllUsersRPC();
    }

    logout() {
        console.log("Logging out...");
    }
};

export default User;

export function createUser(realmId, info) {
    const userProxy = Object.create(User.prototype);
    userProxy[keys.id] = info.id;
    userProxy[keys.type] = objectTypes.USER;
    userProxy.identity = info.identity;
    userProxy.token = info.token;
    userProxy.isAdmin = info.isAdmin;

    return userProxy;
}