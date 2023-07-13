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

import {
  IllegalConstructorError,
  OrderedCollection,
  OrderedCollectionHelpers,
  Realm,
  assert,
  binding,
} from "./internal";

/**
 * Instances of this class will be returned when accessing object properties whose type is `"Set"`
 *
 * Sets mostly behave like normal JavaScript Sets, with a few exceptions:
 * They can only store values of a single type (indicated by the `type`
 * and `optional` properties of the Set).
 * They can only be modified inside a **write** transaction.
 * Unlike JavaScript's Set, Realm~Set does NOT make any guarantees about the
 * traversal order of `values()`, `entries()`, `keys()`, or `forEach` iterations.
 * If values in a Set are required to have some order, it must be implemented
 * by the developer by, for example, wrapping values in an object that holds
 * a user-supplied insertion order.
 * @see https://www.mongodb.com/docs/realm/sdk/react-native/model-data/data-types/sets/
 */
export class RealmSet<T = unknown> extends OrderedCollection<T, [T, T]> {
  /** @internal */
  private declare internal: binding.Set;

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
  /**
   * @returns The number of values in the Set.
   */
  get size(): number {
    return this.length;
  }

  /**
   * Checks if this Set has not been deleted and is part of a valid Realm.
   * @returns `true` if the set can be safely accessed, `false` if not.
   */
  isValid(): boolean {
    return this.internal.isValid;
  }

  /**
   * Delete a value from the Set.
   * @param value - Value to delete from the Set.
   * @throws An {@link Error} if not inside a write transaction.
   * @returns `true` if the value existed in the Set prior to deletion, `false` if not.
   */
  delete(value: T): boolean {
    assert.inTransaction(this.realm);
    const [, success] = this.internal.removeAny(this.helpers.toBinding(value, undefined));
    return success;
  }

  /**
   * Add a new value to the Set.
   * @param value - Value to add to the Set.
   * @throws A {@link TypeError} if a `value` is not of a type which can be stored in
   * the Set, or if an object being added to the Set does not match the for the Set.
   * @throws An {@link Error} if not inside a write transaction.
   * @returns The Set itself, after adding the new value.
   */
  add(value: T): this {
    assert.inTransaction(this.realm);
    this.internal.insertAny(this.helpers.toBinding(value, undefined));
    return this;
  }

  /**
   * Remove all values from the Set.
   * @throws An {@link Error} if not inside a write transaction.
   */
  clear(): void {
    assert.inTransaction(this.realm);
    this.internal.deleteAll();
  }

  /**
   * Check for existence of a value in the Set.
   * @param value - Value to search for in the Set
   * @throws A {@link TypeError} if a `value` is not of a type which can be stored in
   * the Set, or if an object being added to the Set does not match the
   * **object schema** for the Set.
   * @returns `true` if the value exists in the Set, `false` if not.
   */
  has(value: T): boolean {
    return this.includes(value);
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/entries | Set.prototype.entries()}
   * @returns An iterator over the entries of the Set. Each entry is a two-element array
   * containing the value from the Set, followed by a copy of the same value (`[value, value]`).
   */
  *entries(): Generator<[T, T]> {
    for (const value of this.values()) {
      yield [value, value] as [T, T];
    }
  }
}
