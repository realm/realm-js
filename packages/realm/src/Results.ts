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

import * as binding from "@realm/bindgen";

import { Collection } from "./Collection";
import { INTERNAL } from "./internal";

type Getter<T = unknown> = (results: binding.Results, index: number) => T;

const GETTER = Symbol("Realm.Object#getter");

export function createWrapper(internal: binding.Results, getter: Getter) {
  const result = Object.create(Results.prototype);
  Object.defineProperties(result, {
    [GETTER]: {
      enumerable: false,
      configurable: false,
      writable: false,
      value: getter,
    },
    [INTERNAL]: {
      enumerable: false,
      configurable: false,
      writable: false,
      value: internal,
    },
  });
  // TODO: Wrap in a proxy to trap keys, enabling the spread operator
  return result;
}

export class Results<T = unknown> extends Collection<T> {
  /**
   * The representation in the binding.
   * @internal
   */
  private [INTERNAL]!: binding.Results;

  /**
   * Getter used for random access read of elements from the underlying result.
   */
  private [GETTER]!: Getter<T>;

  get length(): number {
    return this[INTERNAL].size();
  }

  /**
   * Bulk update objects in the collection.
   * @param  {string} property
   * @param  {any} value
   * @returns void
   */
  update(property: string, value: any): void {
    throw new Error("Not yet implemented");
  }

  keys(): IterableIterator<number> {
    const size = this[INTERNAL].size();
    let index = 0;
    return {
      next(): IteratorResult<number, void> {
        if (index < size) {
          return { value: index++, done: false };
        } else {
          return { value: undefined, done: true };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  values(): IterableIterator<T> {
    const getter = this[GETTER];
    const snapshot = this[INTERNAL].snapshot();
    const keys = this.keys();
    return {
      next(): IteratorResult<T, void> {
        const { done, value: index } = keys.next();
        if (done) {
          return { value: undefined, done };
        } else {
          return { value: getter(snapshot, index), done };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  isValid(): boolean {
    return this[INTERNAL].isValid;
  }

  isEmpty(): boolean {
    return this[INTERNAL].size() === 0;
  }
}
