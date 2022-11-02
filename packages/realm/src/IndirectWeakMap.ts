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

type HashFunction<K, H> = (k: K) => H;

export class IndirectWeakMap<K extends object, V extends object, H extends string | number | symbol>
  implements WeakMap<K, V>
{
  [Symbol.toStringTag] = "IndirectWeakMap";

  private values: Map<H, WeakRef<V>> = new Map();

  constructor(private hasher: HashFunction<K, H>) {}

  set(key: K, value: V): this {
    const hash = this.hasher(key);
    this.values.set(hash, new WeakRef(value));
    return this;
  }

  has(key: K): boolean {
    const hash = this.hasher(key);
    const ref = this.values.get(hash);
    if (ref) {
      if (ref.deref()) {
        return true;
      } else {
        // Prune the WeakRef
        this.values.delete(hash);
        return false;
      }
    } else {
      return false;
    }
  }

  get(key: K): V | undefined {
    const hash = this.hasher(key);
    const ref = this.values.get(hash);
    if (ref) {
      const result = ref.deref();
      if (!result) {
        // Prune the WeakRef
        this.values.delete(hash);
      }
      return result;
    }
  }

  delete(key: K): boolean {
    const hash = this.hasher(key);
    return this.values.delete(hash);
  }
}
