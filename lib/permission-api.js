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

const url_parse = require('url-parse');

const permissionSchema = {
    name: 'Permission',
    properties: {
        id:            { type: 'string' },
        updatedAt:     { type: 'date' },
        userId:        { type: 'string' },
        path:          { type: 'string' },
        mayRead:       { type: 'bool', optional: true },
        mayWrite:      { type: 'bool', optional: true },
        mayManage:     { type: 'bool', optional: true },
    }
};

function openPermissionRealm(user) {
    let url = url_parse(user.server);
    if (url.protocol === 'http:') {
        url.set('protocol', 'realm:');
    } else if (url.protocol === 'https:') {
        url.set('protocol', 'realms:');
    } else {
        throw new Error(`Unexpected user auth url: ${user.server}`);
    }

    url.set('pathname', '/~/__permission');

    return new user.constructor._realmConstructor({
        schema: [permissionSchema],
        sync: {
            user,
            url: url.href
        }
    });
}

module.exports = {
  getGrantedPermissions() {
    return new Promise((resolve, reject) => {
      resolve(42);
    });
  }
}
