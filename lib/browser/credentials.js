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

import { keys, objectTypes } from './constants';
import { _anonymousRPC, _facebookRPC, _appleRPC, _emailPasswordRPC, _userApiKeyRPC, _serverApiKeyRPC, _functionRPC } from './rpc';

export default class Credentials {
    static anonymous() {
        return _anonymousRPC();
    }

    static facebook(token) {
        return _facebookRPC(token);
    }

    static apple(token) {
        return _appleRPC(token);
    }

    static emailPassword(email, password) {
        return _emailPasswordRPC(email, password);
    }

    static userApiKey(user_key) {
        return _userApiKeyRPC(user_key);
    }

    static function(payload) {
        return _functionRPC(payload);
    }

    static serverApiKey(server_key) {
        return _serverApiKeyRPC(server_key);
    }

}

export function createCredentials(realmId, info) {
    const credentialsProxy = Object.create(Credentials.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    credentialsProxy[keys.realm] = "(Credentials object)";

    credentialsProxy[keys.id] = info.id;
    credentialsProxy[keys.type] = objectTypes.CREDENTIALS;
    Object.assign(credentialsProxy, info.data);

    return credentialsProxy;
}