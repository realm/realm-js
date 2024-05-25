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

import { IllegalConstructorError, binding } from "./internal";

/**
 * TODO(lj)
 */
export class Counter {
  /**
   * The binding representation of the associated obj.
   * @internal
   */
  private declare readonly objInternal: binding.Obj;
  /**
   * The column key on the obj.
   * @internal
   */
  private declare readonly columnKey: binding.ColKey;

  /** @internal */
  constructor(obj: binding.Obj, columnKey: binding.ColKey /*, value = 0*/) {
    if (!(obj instanceof binding.Obj)) {
      throw new IllegalConstructorError("Counter");
    }

    Object.defineProperty(this, "internalObj", {
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
    // TODO(lj)
    return 0;
  }

  /**
   * TODO(lj)
   * @param by The value to increment by.
   */
  increment(by: number): void {
    // TODO(lj)
    console.log(`Incrementing counter by ${by}.`);
  }

  /**
   * TODO(lj)
   * @param by The value to decrement by.
   */
  decrement(by: number): void {
    // TODO(lj)
    console.log(`Decrementing counter by ${by}.`);
  }

  /**
   * TODO(lj)
   * @param value The value to reset the counter to.
   */
  set(value: number): void {
    // TODO(lj)
    console.log(`Setting counter to ${value}.`);
  }

  /**
   * TODO(lj)
   */
  valueOf(): number {
    return this.value;
  }
}
