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

import path from "path";

import { RealmAppImporter } from "realm-app-importer";

const MDB_REALM_BASE_URL =
    process.env.MDB_REALM_BASE_URL || "http://localhost:9090";
const MDB_REALM_USERNAME =
    process.env.MDB_REALM_USERNAME || "unique_user@domain.com";
const MDB_REALM_PASSWORD = process.env.MDB_REALM_PASSWORD || "password";

export async function importRealmApp() {
    // Create a new MongoDBRealmService
    const baseUrl = MDB_REALM_BASE_URL;
    const importer = new RealmAppImporter({
        baseUrl,
        username: MDB_REALM_USERNAME,
        password: MDB_REALM_PASSWORD,
        appsDirectoryPath: path.resolve(__dirname, "../imported-apps"),
        stitchConfigPath: path.resolve(__dirname, "../stitch-config.json"),
    });
    const appTemplatePath = path.resolve(__dirname, "../my-test-app-template");
    const { appId } = await importer.importApp(appTemplatePath);
    return { appId, baseUrl };
}
