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

import { IndirectWeakMap } from "./internal";

export class WeakCache<K extends { $addr: bigint }, V extends object, Args extends unknown[]> {
  private map = new IndirectWeakMap<K, V, bigint>(({ $addr }) => $addr);

  constructor(private ctor: { new (...args: Args): V }) {}

  get(key: K, args?: Args) {
    const existing = this.map.get(key);
    if (existing) {
      return existing;
    } else if (args) {
      const result = new this.ctor(...args);
      this.map.set(key, result);
      return result;
    } else {
      throw new Error("Needed to create an object, but no args were supplied");
    }
  }
}
