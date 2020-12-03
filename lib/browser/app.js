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
import { createMethods, getterForProperty } from "./util";
import { setVersions, createAppRPC, _logInRPC } from "./rpc";
import { promisify } from "../utils";

function setupApp(app, info) {
    app[keys.id] = info.id;
    app[keys.realm] = "(App object)";
    app[keys.type] = objectTypes.APP;
}

export default class App {
    constructor(config) {
        let info = createAppRPC(config);
        setupApp(this, info);
    }

    /**
     * Invokes the RPC client to set versions.
     * @todo Turn this into a call to the static App._setVersions method if the RPC layer supported invoking remote static methods.
     * @param {object} versions An object containing package and platform names and versions.
     */
    static _setVersions(versions) {
        return setVersions(versions);
    }

    logIn(credentials) {
        return promisify(cb => this._logIn(credentials, cb));
    }
}

createMethods(App.prototype, objectTypes.APP, [
    "_logIn",
    "switchUser"
]);

Object.defineProperties(App.prototype, {
    currentUser: { get: getterForProperty("currentUser") },
    allUsers: { get: getterForProperty("allUsers") },
    emailPasswordAuth: { get: getterForProperty("emailPasswordAuth") },
});

export function createApp(realmId, info) {
    const appProxy = Object.create(App.prototype);

    // FIXME: This is currently necessary because util/createMethod expects
    // the realm id to be present on any object that is used over rpc
    appProxy[keys.realm] = "(App object)";

    appProxy[keys.id] = info.id;
    appProxy[keys.type] = objectTypes.APP;
    Object.assign(appProxy, info.data);

    return appProxy;
}