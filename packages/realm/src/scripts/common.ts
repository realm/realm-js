////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

export const SUPPORTED_CONFIGURATIONS = ["Release", "Debug", "MinSizeRel", "RelWithDebInfo"] as const;
export type Configuration = (typeof SUPPORTED_CONFIGURATIONS)[number];

export const PACKAGE_PATH = path.resolve(__dirname, "../..");
export const PACKAGE_JSON_PATH = path.resolve(PACKAGE_PATH, "package.json");
export const PACKAGE_JSON = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
assert(typeof PACKAGE_JSON === "object" && PACKAGE_JSON !== null, "Failed to read package.json");
export const PACKAGE_VERSION: string = PACKAGE_JSON.version;
assert(typeof PACKAGE_VERSION === "string", "Failed to package version");

export const REALM_CORE_RELATIVE_PATH = "bindgen/vendor/realm-core";
export const REALM_CORE_PATH = path.resolve(PACKAGE_PATH, REALM_CORE_RELATIVE_PATH);

const REALM_CORE_DEPENDENCIES_PATH = path.resolve(REALM_CORE_PATH, "dependencies.yml");
const REALM_CORE_DEPENDENCIES = fs.readFileSync(REALM_CORE_DEPENDENCIES_PATH, "utf8");
// We could add a dependency on 'yaml', but it seems a bit overkill for this
const REALM_CORE_VERSION_MATCH = REALM_CORE_DEPENDENCIES.match(/^VERSION: ?(.+)$/m);
assert(REALM_CORE_VERSION_MATCH, "Failed to determine Realm Core version");
export const REALM_CORE_VERSION = REALM_CORE_VERSION_MATCH[1];
