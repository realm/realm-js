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

import * as binding from "./binding";
import { IllegalConstructorError } from "./errors";
import { OrderedCollection, OrderedCollectionHelpers } from "./OrderedCollection";
import type { Realm } from "./Realm";

export class Set<T = unknown> extends OrderedCollection<T> {
  /** @internal */
  private internal!: binding.Set;

  /** @internal */
  constructor(realm: Realm, internal: binding.Set, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.Set)) {
      throw new IllegalConstructorError("Set");
    }
    super(realm, internal.asResults(), helpers);
    Object.defineProperty(this, "internal", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: internal,
    });
  }

  isValid() {
    return this.internal.isValid;
  }

  /**
   * Delete a value from the Set
   * @param {T} object Value to delete from the Set
   * @returns Boolean:  true if the value existed in the Set prior to deletion, false otherwise
   */
  delete(value: T): boolean {
    const [, success] = this.internal.removeAny(this.helpers.toBinding(value, undefined));
    return success;
  }

  /**
   * Add a new value to the Set
   * @param  {T} object Value to add to the Set
   * @returns The Realm.Set<T> itself, after adding the new value
   */
  add(value: T): this {
    this.internal.insertAny(this.helpers.toBinding(value, undefined));
    return this;
  }

  /**
   * Clear all values from the Set
   */
  clear(): void {
    this.internal.deleteAll();
  }

  /**
   * Check for existence of a value in the Set
   * @param  {T} object Value to search for in the Set
   * @returns Boolean: true if the value exists in the Set, false otherwise
   */
  has(value: T): boolean {
    return this.includes(value);
  }
}
