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

import { IdGetter, IndirectWeakMap } from "./internal";

/**
 * A cache of objects (the value) which can either be constructed on demand or retrieved from cache.
 * The cache is considered weak as it extends the `IndirectWeakMap` to store its values, making them available
 * for garbage collection.
 * @internal
 */
export class IndirectWeakCache<
  K extends object,
  V extends object,
  Args extends unknown[],
  Id = unknown,
> extends IndirectWeakMap<K, V, Id> {
  constructor(private construct: { new (...args: Args): V }, getId: IdGetter<K, Id>) {
    super(getId);
  }
  /**
   * Get an existing value from the cache or construct and store one in case of a miss.
   * @param key Object passed to the getId function provided at construction of the cache.
   * @param args An optional array of constructor arguments can be passed as well, which will be used in case of a cache miss
   * to construct and store a new value object.
   * @returns An existing or new value.
   * @throws If `args` are not supplied and no object existed in the cache.
   */
  getOrCreate(key: K, args?: Args) {
    const existing = this.get(key);
    if (existing) {
      return existing;
    } else if (args) {
      const result = new this.construct(...args);
      this.set(key, result);
      return result;
    } else {
      throw new Error("Needed to create an object, but no args were supplied");
    }
  }
}
