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
import { deserialize } from './rpc';

export default class Session {

}

Object.defineProperties(Session.prototype, {
    connectionState: { get: getterForProperty('connectionState', false) },
    state: { get: getterForProperty('state', false) },
    url: { get: getterForProperty('url', false) },
});

createMethods(Session.prototype, objectTypes.SESSION, [
    '_refreshAccessToken',
    '_simulateError',
    'addProgressNotification',
    'removeProgressNotification',
    'addConnectionNotification',
    'removeConnectionNotification',
    'isConnected',
    'resume',
    'pause',
    '_waitForDownloadCompletion',
    '_waitForUploadCompletion',
]);

export function createSession(realmId, info) {
    let sessionProxy = Object.create(Session.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    sessionProxy[keys.realm] = "(Session object)";

    sessionProxy[keys.id] = info.id;
    sessionProxy[keys.type] = objectTypes.SESSION;
    sessionProxy.user = deserialize(realmId, info.data.user);
    sessionProxy.config = deserialize(realmId, info.data.config)

    return sessionProxy;
}
