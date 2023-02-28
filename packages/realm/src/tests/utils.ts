////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import type { Realm } from "../index";

export type RealmContext = Mocha.Context & { realm: Realm };

export function generateRandomInteger() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export const REALMS_DIR = fileURLToPath(new URL("realms", import.meta.url));
export const REALMS_TEMP_DIR = path.resolve(REALMS_DIR, "temp");
if (!fs.existsSync(REALMS_TEMP_DIR)) {
  fs.mkdirSync(REALMS_TEMP_DIR, { recursive: true });
}

export function generateTempRealmPath() {
  return path.resolve(REALMS_TEMP_DIR, "random-" + generateRandomInteger() + ".realm");
}

export function closeRealm(this: Mocha.Context & Partial<RealmContext>) {
  if (this.realm && !this.realm.isClosed) {
    this.realm.close();
    delete this.realm;
  }
}
