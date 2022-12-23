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
import { INTERNAL } from "./internal";
/** @internal */
export class JSONCacheMap extends Map {
    add(object, value) {
        const tableKey = object[INTERNAL].table.key;
        let cachedMap = this.get(tableKey);
        if (!cachedMap) {
            cachedMap = new Map();
            this.set(tableKey, cachedMap);
        }
        cachedMap.set(object._objectKey(), value);
    }
    find(object) {
        return this.get(object[INTERNAL].table.key)?.get(object._objectKey());
    }
}
//# sourceMappingURL=JSONCacheMap.js.map