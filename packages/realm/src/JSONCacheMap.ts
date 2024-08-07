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

import type { RealmObject } from "./Object";
import type { DefaultObject } from "./schema";
import { OBJECT_INTERNAL } from "./symbols";

/** @internal */
export class JSONCacheMap extends Map<number, Map<string, DefaultObject>> {
  add<T>(object: RealmObject<T>, value: DefaultObject) {
    const tableKey = object[OBJECT_INTERNAL].table.key;
    let cachedMap = this.get(tableKey);
    if (!cachedMap) {
      cachedMap = new Map();
      this.set(tableKey, cachedMap);
    }
    cachedMap.set(object._objectKey(), value);
  }
  find<T>(object: RealmObject<T>) {
    return this.get(object[OBJECT_INTERNAL].table.key)?.get(object._objectKey());
  }
}
