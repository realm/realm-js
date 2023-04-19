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

import { CallbackAdder, IllegalConstructorError, Listeners, assert, binding } from "./internal";

/**
 * Abstract base class containing methods shared by Realm **List**, **Dictionary**, and **Results**.
 *
 * A Realm Collection is a homogenous sequence of values of any of the types
 * that can be stored as properties of Realm objects. A collection can be
 * accessed in any of the ways that a normal Javascript Array can, including
 * subscripting, enumerating with `for-of` and so on.
 *
 * A Collection always reflect the current state of the Realm. The one exception to this is
 * when using `for...in` or `for...of` enumeration, which will always enumerate over the
 * objects which matched the query when the enumeration is begun, even if some of them are
 * deleted or modified to be excluded by the filter during the enumeration.
 *
 * @since 0.11.0
 */
export abstract class Collection<
  KeyType = unknown,
  ValueType = unknown,
  EntryType = [KeyType, ValueType],
  T = ValueType,
  ChangeCallbackType = unknown,
> implements Iterable<T>
{
  /** @internal */
  private listeners: Listeners<ChangeCallbackType, binding.NotificationToken>;

  /** @internal */
  constructor(addListener: CallbackAdder<ChangeCallbackType, binding.NotificationToken>) {
    if (arguments.length === 0) {
      throw new IllegalConstructorError("Collection");
    }
    this.listeners = new Listeners<ChangeCallbackType, binding.NotificationToken>({
      add: addListener,
      remove(token) {
        token.unregister();
      },
    });
    // Make the internal properties non-enumerable
    Object.defineProperties(this, {
      listeners: {
        enumerable: false,
        configurable: false,
        writable: false,
      },
    });
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns Iterator with all keys in the collection
   * @since 0.11.0
   */
  abstract keys(): Iterable<KeyType>;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns Iterator with all values in the collection
   * @since 0.11.0
   */
  abstract values(): Iterable<ValueType>;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.keys}
   * @returns Iterator with all key/value pairs in the collection
   * @since 0.11.0
   */
  abstract entries(): Iterable<EntryType>;

  /**
   * This is the same method as the {@link Collection.values} method.
   * Its presence makes collections _iterable_, thus able to be used with ES6
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of `for-of`}
   * loops,
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator `...`}
   * spread operators, and more.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator Symbol.iterator}
   *   and the {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable iterable protocol}
   * @returns Iterable of each value in the collection
   * @example
   * for (let object of collection) {
   *   // do something with each object
   * }
   * @since 0.11.0
   */
  abstract [Symbol.iterator](): Iterator<T>;

  /**
   * Add a listener `callback` which will be called when a **live** collection instance changes.
   * @param callback A function to be called when changes occur.
   *   The callback function is called with two arguments:
   *   - `collection`: the collection instance that changed,
   *   - `changes`: a dictionary with keys `insertions`, `newModifications`, `oldModifications`
   *      and `deletions`, each containing a list of indices in the collection that were
   *      inserted, updated or deleted respectively. `deletions` and `oldModifications` are
   *      indices into the collection before the change happened, while `insertions` and
   *      `newModifications` are indices into the new version of the collection.
   * @throws {@link TypeAssertionError} If `callback` is not a function.
   * @example
   * wines.addListener((collection, changes) => {
   *  // collection === wines
   *  console.log(`${changes.insertions.length} insertions`);
   *  console.log(`${changes.oldModifications.length} oldModifications`);
   *  console.log(`${changes.newModifications.length} newModifications`);
   *  console.log(`${changes.deletions.length} deletions`);
   *  console.log(`new size of collection: ${collection.length}`);
   * });
   * @note The callback will also be invoked when the listener is added, containing empty arrays for each property in the `changes` object.
   */
  addListener(callback: ChangeCallbackType): void {
    assert.function(callback, "callback");
    this.listeners.add(callback);
  }

  /**
   * Remove the listener `callback` from the collection instance.
   * @param callback Callback function that was previously
   *   added as a listener through the **addListener** method.
   * @throws {@link TypeAssertionError} If `callback` is not a function.
   */
  removeListener(callback: ChangeCallbackType): void {
    assert.function(callback, "callback");
    this.listeners.remove(callback);
  }

  /**
   * Remove all `callback` listeners from the collection instance.
   */
  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
