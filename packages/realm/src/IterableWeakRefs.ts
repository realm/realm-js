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
 * An internal iterable set of {@link binding.WeakRef} objects wrapping objects of type {@link T}.
 * @internal
 */
export class IterableWeakRefs<T extends object> {
  private internal: Set<binding.WeakRef<T>>;
  constructor() {
    this.internal = new Set();
  }

  add(value: T) {
    // This is a good time to get rid of entries that has been GC'ed
    this.clean();
    this.internal.add(new binding.WeakRef(value));
    return this;
  }

  delete(value: T) {
    this.clean();
    const ref = this.find(value);
    if (ref) {
      this.internal.delete(ref);
    }
  }

  clear() {
    this.internal.clear();
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (const valueRef of this.internal) {
      const value = valueRef.deref();
      if (value) {
        yield value;
      }
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

  /**
   * Deletes all weak references that no longer points to an object
   */
  private clean() {
    for (const ref of this.internal) {
      if (!ref.deref()) {
        this.internal.delete(ref);
      }
    }
  }
}
