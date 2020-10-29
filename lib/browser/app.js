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
import { createMethods } from './util';
import { createAppRPC } from "./rpc";

function setupApp(app, info) {
    app[keys.id] = info.id;
    app[keys.realm] = info.realmId;
    app[keys.type] = objectTypes.APP;
}

export default class App {
    constructor(config) {
        let info = createAppRPC(config);
        setupApp(this, info);
    }
}

createMethods(App.prototype, objectTypes.APP, [
    'logIn',
    'allUsers',
    'currentUser',
    'switchUser'
]);

export function createApp(realmId, info) {
    const appProxy = Object.create(App.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    // appProxy[keys.realm] = "(App object)";
    appProxy[keys.realm] = realmId;

    appProxy[keys.id] = info.id;
    appProxy[keys.type] = objectTypes.APP;
    Object.assign(appProxy, info.data);

    return appProxy;
}