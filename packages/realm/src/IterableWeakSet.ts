////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { binding } from "./internal";

/**
 * Implements an iterable `WeakSet`.
 * @internal
 */
export class IterableWeakSet<T extends object> implements Set<T> {
  private internal: Set<binding.WeakRef<T>>;
  constructor(values?: readonly T[] | null) {
    this.internal = new Set(values ? values.map((value) => new binding.WeakRef(value)) : undefined);
  }

  /**
   * Deletes all weak references that no longer points to an object
   */
  clean() {
    for (const ref of this.internal) {
      if (!ref.deref()) {
        this.internal.delete(ref);
      }
    }
  }

  get size() {
    return this.internal.size;
  }

  get [Symbol.toStringTag]() {
    return IterableWeakSet.name;
  }

  forEach(cb: (value: T, value2: T, set: Set<T>) => void, thisArg?: unknown) {
    this.internal.forEach((valueRef, valueRef2) => {
      const value = valueRef.deref();
      const value2 = valueRef2.deref();
      if (value && value2) {
        cb.call(thisArg, value, value2, this);
      }
    }, this);
  }

  add(value: T) {
    this.internal.add(new binding.WeakRef(value));
    return this;
  }

  clear() {
    this.internal.clear();
  }

  delete(value: T): boolean {
    // This is a good time to get rid of entries that has been GC'ed
    this.clean();
    const ref = this.find(value);
    if (ref) {
      return this.internal.delete(ref);
    }
    return false;
  }

  has(value: T): boolean {
    const ref = this.find(value);
    return ref ? true : false;
  }

  *entries(): IterableIterator<[T, T]> {
    for (const [valueRef, valueRef2] of this.internal.entries()) {
      const value = valueRef.deref();
      const value2 = valueRef2.deref();
      if (value && value2) {
        yield [value, value2];
      }
    }
  }

  *keys(): IterableIterator<T> {
    for (const keyRef of this.internal.keys()) {
      const key = keyRef.deref();
      if (key) {
        yield key;
      }
    }
  }

  *values(): IterableIterator<T> {
    for (const valueRef of this.internal.values()) {
      const value = valueRef.deref();
      if (value) {
        yield value;
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (const value of this.values()) {
      yield value;
    }
  }

  /**
   * Finds the weak reference given a value
   */
  private find(value: T) {
    for (const ref of this.internal) {
      if (ref.deref() === value) {
        return ref;
      }
    }
  }
}
