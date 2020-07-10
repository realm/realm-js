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

import { App } from "./App";
import { OAuth2Helper } from "./OAuth2Helper";
import { createDefaultStorage } from "./storage";

const appCache: { [id: string]: Realm.App } = {};

/**
 * Get or create a singleton Realm App from an id.
 *
 * @param id The Realm App id visible from the MongoDB Realm UI or a configuration.
 * @returns The Realm App instance. Calling this function multiple times with the same id will return the same instance.
 */
export function app(id: string) {
    if (id in appCache) {
        return appCache[id];
    } else {
        const instance = new App(id);
        appCache[id] = instance;
        return instance;
    }
}

/**
 * Handle an OAuth 2.0 redirect.
 *
 * @param location An optional location to use (defaults to the windows current location).
 * @param storage Optional storage used to save any results from the location.
 */
export function handleAuthRedirect(
    location = window.location,
    storage = createDefaultStorage(),
) {
    try {
        const queryString = location.hash.substr(1); // Strip the initial # from the hash
        OAuth2Helper.handleRedirect(queryString, storage);
    } catch (err) {
        // Ensure calling this never throws: It should not interrupt a users flow.
        console.warn(err);
    }
}

export { App };
export { Credentials } from "./Credentials";
export { User, UserState } from "./User";
export { createDefaultStorage } from "./storage";
