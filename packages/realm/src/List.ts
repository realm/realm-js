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
  assert,
  binding,
  OrderedCollection,
  OrderedCollectionHelpers,
  IllegalConstructorError,
  Realm,
} from "./internal";

type PartiallyWriteableArray<T> = Pick<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;

export class List<T = unknown> extends OrderedCollection<T> implements PartiallyWriteableArray<T> {
  /**
   * The representation in the binding.
   * @internal
   */
  public internal!: binding.List;

  /** @internal */
  private isEmbedded!: boolean;

  /** @internal */
  constructor(realm: Realm, internal: binding.List, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.List)) {
      throw new IllegalConstructorError("List");
    }
    super(realm, internal.asResults(), helpers);

    // Getting the `objectSchema` off the internal will throw if base type isn't object
    const baseType = this.results.type & ~binding.PropertyType.Flags;
    const isEmbedded =
      baseType === binding.PropertyType.Object && internal.objectSchema.tableType === binding.TableType.Embedded;

    Object.defineProperties(this, {
      internal: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
      isEmbedded: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: isEmbedded,
      },
    });
  }

  isValid() {
    return this.internal.isValid;
  }

  /**
   * Set an element of the ordered collection by index
   * @param index The index
   * @param value The value
   * @internal
   */
  public set(index: number, value: unknown) {
    const {
      realm,
      internal,
      isEmbedded,
      helpers: { toBinding },
    } = this;
    assert.inTransaction(realm);
    // TODO: Consider a more performant way to determine if the list is embedded
    internal.setAny(index, toBinding(value, isEmbedded ? () => [internal.insertEmbedded(index), true] : undefined));
  }

  get length(): number {
    return this.internal.size;
  }

  pop(): T | undefined {
    assert.inTransaction(this.realm);
    const {
      internal,
      helpers: { fromBinding },
    } = this;
    const lastIndex = internal.size - 1;
    if (lastIndex >= 0) {
      const result = fromBinding(internal.getAny(lastIndex));
      internal.remove(lastIndex);
      return result as T;
    }
  }

  /**
   * @param  {T} object
   * @returns number
   */
  push(...items: T[]): number {
    assert.inTransaction(this.realm);
    const {
      isEmbedded,
      internal,
      helpers: { toBinding },
    } = this;
    const start = internal.size;
    for (const [offset, item] of items.entries()) {
      const index = start + offset;
      if (isEmbedded) {
        // Simply transforming to binding will insert the embedded object
        toBinding(item, () => [internal.insertEmbedded(index), true]);
      } else {
        internal.insertAny(index, toBinding(item));
      }
    }
    return internal.size;
  }

  /**
   * @returns T
   */
  shift(): T | undefined {
    assert.inTransaction(this.realm);
    const {
      internal,
      helpers: { fromBinding },
    } = this;
    if (internal.size > 0) {
      const result = fromBinding(internal.getAny(0)) as T;
      internal.remove(0);
      return result;
    }
  }

  unshift(...items: T[]): number {
    assert.inTransaction(this.realm);
    const {
      isEmbedded,
      internal,
      helpers: { toBinding },
    } = this;
    for (const [index, item] of items.entries()) {
      if (isEmbedded) {
        // Simply transforming to binding will insert the embedded object
        toBinding(item, () => [internal.insertEmbedded(index), true]);
      } else {
        internal.insertAny(index, toBinding(item));
      }
    }
    return internal.size;
  }

  splice(start: number, deleteCount?: number): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    // Comments in the code below is copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    assert.inTransaction(this.realm);
    assert.number(start, "start");
    const {
      isEmbedded,
      internal,
      helpers: { fromBinding, toBinding },
    } = this;
    // If negative, it will begin that many elements from the end of the array.
    if (start < 0) {
      start = internal.size + start;
    }
    // If greater than the length of the array, start will be set to the length of the array.
    if (start > internal.size) {
      start = internal.size;
    }
    // If deleteCount is omitted, or if its value is equal to or larger than array.length - start
    // (that is, if it is equal to or greater than the number of elements left in the array, starting at start),
    // then all the elements from start to the end of the array will be deleted.
    const end = typeof deleteCount === "number" ? Math.min(start + deleteCount, internal.size) : internal.size;
    // Get the elements that are about to be deleted
    const result: T[] = [];
    for (let i = start; i < end; i++) {
      result.push(fromBinding(internal.getAny(i)) as T);
    }
    // Remove the elements from the list (backwards to avoid skipping elements as they're being deleted)
    for (let i = end - 1; i >= start; i--) {
      internal.remove(i);
    }
    // Insert any new elements
    for (const [offset, item] of items.entries()) {
      const index = start + offset;
      if (isEmbedded) {
        // Simply transforming to binding will insert the embedded object
        toBinding(item, () => [internal.insertEmbedded(index), true]);
      } else {
        internal.insertAny(index, toBinding(item));
      }
    }
    return result;
  }
}
