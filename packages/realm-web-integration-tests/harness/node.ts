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

import { importRealmApp } from "./import-realm-app";

// Reload the realm-web package when in --watch mode
for (const id in require.cache) {
    if (id.indexOf("/packages/realm-web/")) {
        delete require.cache[id];
    }
}

// The APP_ID and BASE_URL are defined and injected into the global when the app has been imported.
declare const global: { APP_ID: string; BASE_URL: string };

before(async function () {
    this.timeout(10000);
    // This enables app re-use when in --watch mode
    if (!global.APP_ID || !global.BASE_URL) {
        const { appId, baseUrl } = await importRealmApp();
        global.APP_ID = appId;
        global.BASE_URL = baseUrl;
    }
});
