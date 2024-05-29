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

import { IllegalConstructorError, Realm, assert, binding } from "./internal";

/**
 * TODO(lj)
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
   * TODO(lj)
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

  /**
   * TODO(lj)
   * @internal
   */
  set value(_: number) {
    throw new Error("To update the value, use the methods on the Counter.");
  }

  /**
   * TODO(lj)
   * @param by The value to increment by.
   */
  increment(by = 1): void {
    assert.inTransaction(this.realm);
    assert.integer(by, "by");
    this.obj.addInt(this.columnKey, binding.Int64.numToInt(by));
  }

  /**
   * TODO(lj)
   * @param by The value to decrement by.
   */
  decrement(by = 1): void {
    assert.inTransaction(this.realm);
    // Assert that it is a number here despite calling into `increment` in order to
    // report the type provided by the user, rather than e.g. NaN or 0 due to negation.
    assert.integer(by, "by");
    this.increment(-by);
  }

  /**
   * TODO(lj)
   * @param value The value to reset the counter to.
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
