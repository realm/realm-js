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

const REALM = Symbol("Counter#realm");
const OBJ = Symbol("Counter#obj");
const COLUMN_KEY = Symbol("Counter#columnKey");

/**
 * A logical counter representation for performing numeric updates that need
 * to be synchronized as sequentially consistent events rather than individual
 * reassignments of the number.
 *
 * For instance, offline Client 1 and Client 2 which both see `Counter.value`
 * as `0`, can both call `Counter.increment(1)`. Once online, the value will
 * converge to `2`.
 *
 * ### Counter types are *not* supported as:
 *
 * - `Mixed` values
 * - Primary keys
 * - Inside collections
 * - Query arguments for placeholders (e.g. `$0`) in {@link Realm.Results.filtered | filtered()}
 *   - If you need to use the value of the `Counter` when filtering, use `Counter.value`.
 *
 * ### Declaring a counter
 *
 * A property schema is declared as either:
 * - `"counter"`
 * - `{ type: "int", presentation: "counter" }`
 *
 * ### Creating a counter
 *
 * Use a `number` when creating your counter on a {@link Realm.Object}.
 *
 * ```typescript
 * realm.write(() => {
 *   realm.create(MyObject, { _id: "123", counter: 0 });
 * });
 * ```
 *
 * ### Updating the count
 *
 * Use the instance methods to update the underlying count.
 *
 * ### Nullability
 *
 * The above property schema can be extended to allow a nullable counter.
 * A `Counter` never stores `null` values itself, but the counter property
 * on the {@link Realm.Object} (e.g. `myRealmObject.myCounter`) can be `null`.
 *
 * To create a counter from a previously `null` value, or to reset a nullable
 * counter to `null`, use {@link UpdateMode.Modified} or {@link UpdateMode.All}.
 *
 * ```typescript
 * realm.write(() => {
 *   realm.create(MyObject, { _id: "123", counter: 0 }, UpdateMode.Modified);
 * });
 * ```
 */
export class Counter {
  /** @internal */
  private readonly [REALM]: Realm;
  /** @internal */
  private readonly [OBJ]: binding.Obj;
  /** @internal */
  private readonly [COLUMN_KEY]: binding.ColKey;

  /** @internal */
  constructor(realm: Realm, obj: binding.Obj, columnKey: binding.ColKey) {
    if (!(realm instanceof Realm) || !(obj instanceof binding.Obj)) {
      throw new IllegalConstructorError("Counter");
    }

    this[REALM] = realm;
    this[OBJ] = obj;
    this[COLUMN_KEY] = columnKey;
  }

  /**
   * The current count.
   */
  get value(): number {
    try {
      return Number(this[OBJ].getAny(this[COLUMN_KEY]));
    } catch (err) {
      // Throw a custom error message instead of Core's.
      assert.isValid(this[OBJ]);
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
    assert.inTransaction(this[REALM]);
    assert.integer(by, "by");
    this[OBJ].addInt(this[COLUMN_KEY], binding.Int64.numToInt(by));
  }

  /**
   * Decrement the count.
   * @param by The value to decrement by. (Default: `1`)
   */
  decrement(by = 1): void {
    assert.inTransaction(this[REALM]);
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
    assert.inTransaction(this[REALM]);
    assert.integer(value, "value");
    this[OBJ].setAny(this[COLUMN_KEY], binding.Int64.numToInt(value));
  }
}
