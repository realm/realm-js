////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { IllegalConstructorError, Realm, UpdateMode, assert, binding } from "./internal";

/**
 * A logical counter representation for performing numeric updates that need
 * to be synchronized as sequentially consistent events rather than individual
 * reassignments of the number.
 *
 * For instance, offline Client 1 and Client 2 which both see `Counter.value`
 * as `0`, can both call `Counter.increment(1)`. Once online, the value will
 * converge to `2`.
 * @note
 * __Declaring a counter__:
 *
 * A property schema is declared as either:
 * - `"counter"`
 * - `{ type: "int", presentation: "counter" }`
 *
 * __Creating a counter__:
 *
 * Use a `number` when creating your counter on a {@link Realm.Object}.
 * ```ts
 * realm.write(() => {
 *   realm.create(MyObject, { _id, counter: 0 });
 * })
 * ```
 *
 * To update a `null` counter, use {@link UpdateMode.Modified} or {@link UpdateMode.All}.
 * ```ts
 * realm.write(() => {
 *   realm.create(MyObject, { _id, counter: 0 }, UpdateMode.Modified);
 * })
 * ```
 *
 * __Nullability__:
 *
 * The above property schema can be extended to allow a nullable counter.
 * A `Counter` never stores `null` values itself, but the counter property
 * on the {@link Realm.Object} (e.g. `myRealmObject.myCounter`) can be `null`.
 *
 * __Not a live object__:
 *
 * The `Counter` instance itself is _not_ a live object. Calling `myCounter.value`
 * will always return the most recent locally persisted (and synced) state, and
 * calling `myRealmObject.myCounter` always returns a new `Counter` instance (or
 * potentially `null` for nullable counters).
 */
export class Counter {
  /** @internal */
  private declare readonly realm: Realm;
  /** @internal */
  private declare readonly obj: binding.Obj;
  /** @internal */
  private declare readonly columnKey: binding.ColKey;

  /** @internal */
  constructor(realm: Realm, obj: binding.Obj, columnKey: binding.ColKey) {
    if (!(realm instanceof Realm) || !(obj instanceof binding.Obj)) {
      throw new IllegalConstructorError("Counter");
    }

    // TODO(lj): May convert these into Symbols.
    Object.defineProperty(this, "realm", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    });
    Object.defineProperty(this, "obj", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: obj,
    });
    Object.defineProperty(this, "columnKey", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: columnKey,
    });
  }

  /**
   * The current count.
   */
  get value(): number {
    try {
      return Number(this.obj.getAny(this.columnKey));
    } catch (err) {
      // Throw a custom error message instead of Core's.
      assert.isValid(this.obj);
      throw err;
    }
  }

  /** @internal */
  set value(_: number) {
    throw new Error("To update the value, use the methods on the Counter.");
  }

  /**
   * Increment the count.
   * @param by The value to increment by. (Default: `1`)
   */
  increment(by = 1): void {
    assert.inTransaction(this.realm);
    assert.integer(by, "by");
    this.obj.addInt(this.columnKey, binding.Int64.numToInt(by));
  }

  /**
   * Decrement the count.
   * @param by The value to decrement by. (Default: `1`)
   */
  decrement(by = 1): void {
    assert.inTransaction(this.realm);
    // Assert that it is a number here despite calling into `increment` in order to
    // report the type provided by the user, rather than e.g. NaN or 0 due to negation.
    assert.integer(by, "by");
    this.increment(-by);
  }

  /**
   * Reset the count.
   * @param value The value to reset the count to.
   * @warning
   * Unlike {@link Counter.increment | increment} and {@link Counter.decrement | decrement},
   * setting the count behaves like regular individual updates to the underlying value.
   */
  set(value: number): void {
    assert.inTransaction(this.realm);
    assert.integer(value, "value");
    this.obj.setAny(this.columnKey, binding.Int64.numToInt(value));
  }

  /**
   * TODO(lj)
   */
  valueOf(): number {
    return this.value;
  }
}
