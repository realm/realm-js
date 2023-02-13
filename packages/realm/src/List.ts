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
  ObjectSchema,
  OrderedCollection,
  OrderedCollectionHelpers,
  Realm,
  assert,
  binding,
} from "./internal";

type PartiallyWriteableArray<T> = Pick<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;

/**
 * Instances of this class will be returned when accessing object properties whose type is `"list"`.
 *
 * Lists mostly behave like normal Javascript Arrays, except for that they can
 * only store values of a single type (indicated by the `type` and `optional`
 * properties of the List), and can only be modified inside a {@link Realm.write | write} transaction.
 */
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

  /**
   * Remove the **last** value from the list and return it.
   * @throws {@link AssertionError} If not inside a write transaction.
   * @returns The last value or undefined if the list is empty.
   */
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
   * Add one or more values to the _end_ of the list.
   *
   * @param items Values to add to the list.
   * @throws {TypeError} If a `value` is not of a type which can be stored in
   *   the list, or if an object being added to the list does not match the {@link ObjectSchema} for the list.
   *
   * @throws {@link AssertionError} If not inside a write transaction.
   * @returns A number equal to the new length of
   *          the list after adding the values.
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
   * Remove the **first** value from the list and return it.
   * @throws {@link AssertionError} If not inside a write transaction.
   * @returns The first value or undefined if the list is empty.
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

  /**
   * Add one or more values to the _beginning_ of the list.
   *
   * @param items Values to add to the list.
   * @throws {TypeError} If a `value` is not of a type which can be stored in
   * the list, or if an object being added to the list does not match the {@link Realm.ObjectSchema} for the list.
   * @throws {@link AssertionError} If not inside a write transaction.
   * @returns The new {@link length} of the list after adding the values.
   */
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

  /** TODO
   * Changes the contents of the list by removing value and/or inserting new value.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice Array.prototype.splice}
   * @param start The start index. If greater than the length of the list,
   *   the start index will be set to the length instead. If negative, then the start index
   *   will be counted from the end of the list (e.g. `list.length - index`).
   * @param deleteCount The number of values to remove from the list.
   *   If not provided, then all values from the start index through the end of
   *   the list will be removed.
   * @returns An array containing the value that were removed from the list. The
   *   array is empty if no value were removed.
   */
  splice(start: number, deleteCount?: number): T[];
  /**
   * Changes the contents of the list by removing value and/or inserting new value.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice Array.prototype.splice}
   * @param start The start index. If greater than the length of the list,
   *   the start index will be set to the length instead. If negative, then the start index
   *   will be counted from the end of the list (e.g. `list.length - index`).
   * @param deleteCount The number of values to remove from the list.
   *   If not provided, then all values from the start index through the end of
   *   the list will be removed.
   * @param items Values to insert into the list starting at `index`.
   * @returns An array containing the value that were removed from the list. The
   *   array is empty if no value were removed.
   */
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  /**
   * Changes the contents of the list by removing value and/or inserting new value.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice Array.prototype.splice}
   * @param start The start index. If greater than the length of the list,
   *   the start index will be set to the length instead. If negative, then the start index
   *   will be counted from the end of the list (e.g. `list.length - index`).
   * @param deleteCount The number of values to remove from the list.
   *   If not provided, then all values from the start index through the end of
   *   the list will be removed.
   * @param items Values to insert into the list starting at `index`.
   * @returns An array containing the value that were removed from the list. The
   *   array is empty if no value were removed.
   */
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

  /**
   * Removes the element of the list at the specified index.
   *
   * @param index The index of the element to remove.
   * @throws {@link AssertionError} If not inside a write transaction or the input index is less than 0
   * or greater than the size of the list.
   */
  remove(index: number) {
    assert.inTransaction(this.realm);
    assert.number(index, "index");

    assert(index >= 0, "Index cannot be smaller than 0");
    assert(index < this.internal.size, "Index cannot be greater than the size of the list");

    this.internal.remove(index);
  }

  /**
   * Moves one element of the list from one index to another.
   *
   * @param from The index of the element to move.
   * @param to The destination index of the element.
   * @throws {@link AssertionError} If not inside a write transaction or if any of the input indexes
   * is less than 0 or greater than the size of the list.
   */
  move(from: number, to: number) {
    assert.inTransaction(this.realm);
    assert.number(from, "from");
    assert.number(to, "to");

    const size = this.internal.size;
    assert(from >= 0 && to >= 0, "Indexes cannot be smaller than 0");
    assert(from < size && to < size, "Indexes cannot be greater than the size of the list");

    this.internal.move(from, to);
  }

  /**
   * Swaps the positions of the elements of the list at two indexes.
   *
   * @param index1 The index of the first element.
   * @param index2 The index of the second element.
   * @throws {@link AssertionError} If not inside a write transaction or if any of the input indexes
   * is less than 0 or greater than the size of the list.
   */
  swap(index1: number, index2: number) {
    assert.inTransaction(this.realm);
    assert.number(index1, "index1");
    assert.number(index2, "index2");

    const size = this.internal.size;
    assert(index1 >= 0 && index2 >= 0, "Indexes cannot be smaller than 0");
    assert(index1 < size && index2 < size, "Indexes cannot be greater than the size of the list");

    this.internal.swap(index1, index2);
  }
}
