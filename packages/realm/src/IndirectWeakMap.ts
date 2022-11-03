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

/**
 * A map from some type of object (the key) into another type of object (the value), where a
 * function (the hasher supplied at construction) is called to derive a hash of the key,
 * which is used when looking up the value. This makes it possible for multiple different key
 * objects to get the same value object.
 * The map is considered weak in the sense that values are wrapped in a `WeakRef` before being
 * inserted in the underling map. A value is also registered with a finalization registry, ensuring
 * that their entry in the underlying map is removed when they get garbage collected,
 * in an effort to make the entire `IndirectWeakMap` avoid leaks.
 */
export class IndirectWeakMap<K extends object, V extends object, H> implements WeakMap<K, V> {
  [Symbol.toStringTag] = "IndirectWeakMap";

  private registry = new FinalizationRegistry<H>((hash) => {
    this.values.delete(hash);
  });

  constructor(private hasher: HashFunction<K, H>, private values: Map<H, WeakRef<V>> = new Map()) {}

  set(key: K, value: V): this {
    const hash = this.hasher(key);
    const ref = new WeakRef(value);
    // Unregister the finalization registry on value being removed from the map
    // to avoid its finalization to prune the new value from the map of values.
    const existingRef = this.values.get(hash);
    if (existingRef) {
      this.registry.unregister(existingRef);
    }
    // Register the new value with the finalization registry, to prune its WeakRef from
    // the map of values.
    this.registry.register(value, hash, ref);
    this.values.set(hash, ref);
    return this;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  get(key: K): V | undefined {
    const hash = this.hasher(key);
    return this.values.get(hash)?.deref();
  }

  delete(key: K): boolean {
    const hash = this.hasher(key);
    return this.values.delete(hash);
  }
}
