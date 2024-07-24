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

import type { binding } from "../binding";
import type { Dictionary, DictionaryAccessor } from "./Dictionary";
import type { List } from "./List";
import type { OrderedCollectionAccessor } from "./OrderedCollection";
import type { RealmSet } from "./Set";
import type { Results } from "./Results";
import type { TypeHelpers } from "./TypeHelpers";
import { type CallbackAdder, Listeners } from "./Listeners";
import { IllegalConstructorError } from "./errors";
import { assert } from "./assert";

/**
 * Collection accessor identifier.
 * @internal
 */
export const COLLECTION_ACCESSOR = Symbol("Collection#accessor");

/**
 * Collection type helpers identifier.
 * @internal
 */
export const COLLECTION_TYPE_HELPERS = Symbol("Collection#typeHelpers");

/**
 * Accessor for getting and setting items in the binding collection.
 * @internal
 */
type CollectionAccessor<T = unknown> = OrderedCollectionAccessor<T> | DictionaryAccessor<T>;

/**
 * Abstract base class containing methods shared by Realm {@link List}, {@link Dictionary}, {@link Results} and {@link RealmSet}.
 *
 * A {@link Collection} always reflect the current state of the Realm. The one exception to this is
 * when using `for...in` or `for...of` enumeration, which will always enumerate over the
 * objects which matched the query when the enumeration is begun, even if some of them are
 * deleted or modified to be excluded by the filter during the enumeration.
 * @since 0.11.0
 */
export abstract class Collection<
  KeyType = unknown,
  ValueType = unknown,
  EntryType = [KeyType, ValueType],
  T = ValueType,
  ChangeCallbackType = unknown,
  /** @internal */
  Accessor extends CollectionAccessor<ValueType> = CollectionAccessor<ValueType>,
> implements Iterable<T>
{
  /**
   * Accessor for getting and setting items in the binding collection.
   * @internal
   */
  protected readonly [COLLECTION_ACCESSOR]: Accessor;

  /**
   * Helper for converting the values to and from their binding representations.
   * @internal
   */
  protected readonly [COLLECTION_TYPE_HELPERS]: TypeHelpers<ValueType>;

  /** @internal */
  private listeners: Listeners<ChangeCallbackType, binding.NotificationToken, [string[] | undefined]>;

  /** @internal */
  constructor(
    accessor: Accessor,
    typeHelpers: TypeHelpers<ValueType>,
    addListener: CallbackAdder<ChangeCallbackType, binding.NotificationToken, [string[] | undefined]>,
  ) {
    if (arguments.length === 0) {
      throw new IllegalConstructorError("Collection");
    }
    this.listeners = new Listeners({
      add: addListener,
      remove(token) {
        token.unregister();
      },
    });
    // Make the internal properties non-enumerable
    Object.defineProperty(this, "listeners", {
      enumerable: false,
      configurable: false,
      writable: false,
    });

    this[COLLECTION_ACCESSOR] = accessor;
    this[COLLECTION_TYPE_HELPERS] = typeHelpers;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns An iterator with all keys in the collection.
   * @since 0.11.0
   */
  abstract keys(): Iterable<KeyType>;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns An iterator with all values in the collection.
   * @since 0.11.0
   */
  abstract values(): Iterable<ValueType>;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.keys}
   * @returns An iterator with all key/value pairs in the collection.
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
   * @returns An iterable of each value in the collection.
   * @example
   * for (let object of collection) {
   *   // do something with each object
   * }
   * @since 0.11.0
   */
  abstract [Symbol.iterator](): Iterator<T>;

  /**
   * Checks if this collection has not been deleted and is part of a valid Realm.
   * @returns `true` if the collection can be safely accessed.
   * @since 0.14.0
   */
  abstract isValid(): boolean;

  /**
   * Add a listener `callback` which will be called when a **live** collection instance changes.
   * @param callback - A function to be called when changes occur.
   * @param keyPaths - Indicates a lower bound on the changes relevant for the listener. This is a lower bound, since if multiple listeners are added (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the collection. In other words: A listener might fire more than the key-paths specify, if other listeners with different key-paths are present.
   * @note `deletions` and `oldModifications` report the indices in the collection before the change happened,
   * while `insertions` and `newModifications` report the indices into the new version of the collection.
   * @throws A {@link TypeAssertionError} if `callback` is not a function.
   * @note
   * Adding the listener is an asynchronous operation, so the callback is invoked the first time to notify the caller when the listener has been added.
   * Thus, when the callback is invoked the first time it will contain empty arrays for each property in the `changes` object.
   * @example
   * wines.addListener((collection, changes) => {
   *  // collection === wines
   *  console.log(`${changes.insertions.length} insertions`);
   *  console.log(`${changes.oldModifications.length} oldModifications`);
   *  console.log(`${changes.newModifications.length} newModifications`);
   *  console.log(`${changes.deletions.length} deletions`);
   *  console.log(`new size of collection: ${collection.length}`);
   * });
   * @example
   * wines.addListener((collection, changes) => {
   *  console.log("A wine's brand might have changed");
   * }, ["brand"]);
   */
  addListener(callback: ChangeCallbackType, keyPaths?: string | string[]): void {
    assert.function(callback, "callback");
    this.listeners.add(callback, typeof keyPaths === "string" ? [keyPaths] : keyPaths);
  }

  /**
   * Remove the listener `callback` from the collection instance.
   * @param callback - Callback function that was previously
   *   added as a listener through the {@link Collection.addListener} method.
   * @throws a {@link TypeAssertionError} If `callback` is not a function.
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

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyCollection = Collection<any, any, any, any, any>;
