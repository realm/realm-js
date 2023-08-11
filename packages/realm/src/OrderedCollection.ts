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
  ClassHelpers,
  Collection,
  DefaultObject,
  INTERNAL,
  IllegalConstructorError,
  JSONCacheMap,
  Realm,
  RealmObject,
  Results,
  TypeAssertionError,
  TypeHelpers,
  assert,
  binding,
  getTypeName,
  mixedToBinding,
  unwind,
} from "./internal";

const DEFAULT_COLUMN_KEY = binding.Int64.numToInt(0) as unknown as binding.ColKey;

type PropertyType = string;

/**
 * A sort descriptor is either a string containing one or more property names
 * separate by dots or an array with two items: `[propertyName, reverse]`.
 */
export type SortDescriptor = string | [string, boolean];

export type CollectionChangeSet = {
  insertions: number[];
  deletions: number[];
  newModifications: number[];
  oldModifications: number[];
};
export type CollectionChangeCallback<T = unknown, EntryType extends [unknown, unknown] = [unknown, unknown]> = (
  collection: OrderedCollection<T, EntryType>,
  changes: CollectionChangeSet,
) => void;

/** @internal */
export type OrderedCollectionHelpers = TypeHelpers & {
  get(results: binding.Results, index: number): unknown;
};

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: true };
const PROXY_HANDLER: ProxyHandler<OrderedCollection> = {
  // TODO: Consider executing the `parseInt` first to optimize for index access over accessing a member on the list
  get(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
    } else if (typeof prop === "string") {
      const index = Number.parseInt(prop, 10);
      // TODO: Consider catching an error from access out of bounds, instead of checking the length, to optimize for the hot path
      if (!Number.isNaN(index) && index >= 0 && index < target.length) {
        return target.get(index);
      }
    }
  },
  set(target, prop, value, receiver) {
    if (typeof prop === "string") {
      const index = Number.parseInt(prop, 10);
      // TODO: Consider catching an error from access out of bounds, instead of checking the length, to optimize for the hot path
      // TODO: Do we expect an upper bound check on the index when setting?
      if (Number.isInteger(index)) {
        if (index < 0) {
          throw new Error(`Index ${index} cannot be less than zero.`);
        }
        target.set(index, value);
        return true;
      }
    }
    return Reflect.set(target, prop, value, receiver);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    } else if (typeof prop === "string") {
      const index = Number.parseInt(prop, 10);
      if (index < target.length) {
        return DEFAULT_PROPERTY_DESCRIPTOR;
      }
    }
  },
};

/**
 * An {@link OrderedCollection} is a homogenous sequence of values of any of the types
 * that can be stored as properties of Realm objects. It can be
 * accessed in any of the ways that a normal JavaScript Array can, including
 * subscripting, enumerating with `for-of` and so on.
 * @see {@link https://mdn.io/Array | Array}
 */
export abstract class OrderedCollection<T = unknown, EntryType extends [unknown, unknown] = [number, T]>
  extends Collection<number, T, EntryType, T, CollectionChangeCallback<T, EntryType>>
  implements Omit<ReadonlyArray<T>, "entries">
{
  /** @internal */ protected declare realm: Realm;
  /** @internal */ protected declare results: binding.Results;
  /** @internal */ protected declare helpers: OrderedCollectionHelpers;
  /** @internal */
  constructor(realm: Realm, results: binding.Results, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0) {
      throw new IllegalConstructorError("OrderedCollection");
    }
    super((callback) => {
      return results.addNotificationCallback((changes) => {
        try {
          callback(proxied, {
            deletions: unwind(changes.deletions),
            insertions: unwind(changes.insertions),
            oldModifications: unwind(changes.modifications),
            newModifications: unwind(changes.modificationsNew),
          });
        } catch (err) {
          // Scheduling a throw on the event loop,
          // since throwing synchronously here would result in an abort in the calling C++
          setImmediate(() => {
            throw err;
          });
        }
      }, undefined);
    });
    // Wrap in a proxy to trap ownKeys and get, enabling the spread operator
    const proxied = new Proxy(this, PROXY_HANDLER as ProxyHandler<this>);
    // Get the class helpers for later use, if available
    const { objectType } = results;
    const classHelpers = typeof objectType === "string" && objectType !== "" ? realm.getClassHelpers(objectType) : null;
    // Make the internal properties non-enumerable
    Object.defineProperty(this, "realm", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    });
    Object.defineProperty(this, "results", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: results,
    });
    Object.defineProperty(this, "helpers", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: helpers,
    });
    Object.defineProperty(this, "classHelpers", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: classHelpers,
    });
    Object.defineProperty(this, "mixedToBinding", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: mixedToBinding.bind(undefined, realm.internal),
    });
    return proxied;
  }

  /** @internal */
  protected declare classHelpers: ClassHelpers | null;
  private declare mixedToBinding: (value: unknown) => binding.MixedArg;

  /**
   * Get an element of the ordered collection by index.
   * @param index - The index.
   * @returns The element.
   * @internal
   */
  public get(index: number): T {
    return this.helpers.fromBinding(this.helpers.get(this.results, index)) as T;
  }

  /**
   * Set an element of the ordered collection by index.
   * @param index - The index.
   * @param value - The value.
   * @internal
   */
  public set(index: number, value: T): void;
  public set() {
    throw new Error(`Assigning into a ${this.constructor.name} is not supported`);
  }

  /**
   * The plain object representation for JSON serialization.
   * Use circular JSON serialization libraries such as [@ungap/structured-clone](https://www.npmjs.com/package/@ungap/structured-clone)
   * and [flatted](https://www.npmjs.com/package/flatted) to stringify Realm entities that have circular structures.
   * @returns An array of plain objects.
   */
  toJSON(): Array<DefaultObject>;
  /** @internal */
  toJSON(_?: string, cache = new JSONCacheMap()): Array<DefaultObject> {
    return this.map((item, index) => {
      if (item instanceof RealmObject) {
        return item.toJSON(index.toString(), cache);
      } else {
        return item as DefaultObject;
      }
    });
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys | Array.prototype.keys()}
   * @returns An iterator with all keys in the collection.
   */
  *keys(): Generator<number> {
    const size = this.results.size();
    for (let i = 0; i < size; i++) {
      yield i;
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values} | Array.prototype.values()}
   * @returns An iterator with all values in the collection.
   */
  *values(): Generator<T> {
    const snapshot = this.results.snapshot();
    const { get, fromBinding } = this.helpers;
    for (const i of this.keys()) {
      yield fromBinding(get(snapshot, i)) as T;
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries | Array.prototype.entries()}
   * @returns An iterator with all key/value pairs in the collection.
   */
  *entries(): Generator<EntryType> {
    const { get, fromBinding } = this.helpers;
    const snapshot = this.results.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      yield [i, fromBinding(get(snapshot, i))] as EntryType;
    }
  }

  [n: number]: T;

  /**
   * @returns The number of values.
   */
  get length(): number {
    return this.results.size();
  }

  /**
   * @throws An {@link Error} as the length property cannot be assigned.
   */
  set length(value: number) {
    throw new Error("Cannot assign to read only property 'length'");
  }

  /**
   * Name of the type of items.
   * @returns The name of the type of values.
   */
  get type(): PropertyType {
    return getTypeName(this.results.type & ~binding.PropertyType.Flags, undefined);
  }

  /**
   * Whether `null` is a valid value for the collection.
   * @returns Whether `null` is a valid value for the collection.
   * @readonly
   */
  get optional(): boolean {
    return !!(this.results.type & binding.PropertyType.Nullable);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any -- We've copied these from the lib types */

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString | Array.prototype.toString()}
   * @returns A string representation of the collection.
   */
  toString(): string {
    return [...this].toString();
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toLocaleString | Array.prototype.toLocaleString()}
   * @returns A localized string representation of the collection.
   */
  toLocaleString(): string {
    return [...this].toLocaleString();
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat | Array.prototype.concat()}
   * @param items - Arrays and/or values to concatenate into a new array.
   * @returns A new array with the results of calling a provided function on every element in this array.
   */
  concat(...items: ConcatArray<T>[]): T[];
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat | Array.prototype.concat()}
   * @param items - Arrays and/or values to concatenate into a new array.
   * @returns A new array with the results of calling a provided function on every element in this array.
   */
  concat(...items: (T | ConcatArray<T>)[]): T[];
  concat(...items: any[]): T[] {
    return [...this].concat(...items);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join | Array.prototype.join()}
   * @params separator - A string used to separate one element of the collection from the next in the resulting String.
   * @returns A string representing the elements of the collection.
   */
  join(separator?: string): string {
    return [...this].join(separator);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice | Array.prototype.slice()}
   * @params start - Zero-based index at which to begin extraction.
   * @params end - Zero-based index at which to end extraction. It extracts up to but not including `end`.
   * @returns A new array containing the elements between the start and end indices.
   */
  slice(start?: number, end?: number): T[] {
    return [...this].slice(start, end);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf | Array.prototype.indexOf()}
   * @params searchElement - Element to locate in the collection.
   * @params fromIndex - The collection index at which to begin the search. If omitted, the search starts at index 0.
   * @note `fromIndex` is currently not supported. So all searches start at index 0.
   * @returns The first index at which a given element can be found in the collection, or -1 if it is not present.
   */
  indexOf(searchElement: T, fromIndex?: number): number {
    assert(typeof fromIndex === "undefined", "The second fromIndex argument is not yet supported");
    if (this.type === "object") {
      assert.instanceOf(searchElement, RealmObject);
      return this.results.indexOfObj(searchElement[INTERNAL]);
    } else {
      return this.results.indexOf(this.helpers.toBinding(searchElement));
    }
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf | Array.prototype.lastIndexOf()}
   * @params searchElement - Element to locate in the collection.
   * @params fromIndex - The collection index at which to begin the search. If omitted, the search starts at the last index.
   * @returns The last index at which a given element can be found in the collection, or -1 if it is not present. The collection is searched backwards, starting at `fromIndex`.
   */
  lastIndexOf(searchElement: T, fromIndex?: number): number {
    return [...this].lastIndexOf(searchElement, fromIndex);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every | Array.prototype.every()}
   * @params predicate - A function to test for each element.
   * @params predicate.value - The current element being processed in the collection.
   * @params predicate.index - The index of the current element being processed in the collection.
   * @params predicate.array - The collection `every` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the predicate function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns `true` if the callback function returns a truthy value for every collection element; otherwise, `false`.
   */
  every<S extends T>(
    predicate: (value: T, index: number, array: readonly T[]) => value is S,
    thisArg?: any,
  ): this is readonly S[];
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every | Array.prototype.every()}
   * @params predicate - A function to test for each element.
   * @params predicate.value - The current element being processed in the collection.
   * @params predicate.index - The index of the current element being processed in the collection.
   * @params predicate.array - The collection `every` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the predicate function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns `true` if the callback function returns a truthy value for every collection element; otherwise, `false`.
   */
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  every(predicate: any, thisArg?: any): boolean {
    return [...this].every(predicate, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some | Array.prototype.some()}
   * @params predicate - A function to test for each element.
   * @params predicate.value - The current element being processed in the collection.
   * @params predicate.index - The index of the current element being processed in the collection.
   * @params predicate.array - The collection `every` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the predicate function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns `true` if the callback function returns a truthy value for any collection element; otherwise, `false`.
   */
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean {
    return [...this].some(predicate, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach | Array.prototype.forEach()}
   * @params callbackfn - A function that accepts up to three arguments. `forEach` calls the callbackfn function one time for each element in the collection.
   * @params callbackfn.value - The current element being processed in the collection.
   * @params callbackfn.index - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `forEach` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the `callbackfn` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   */
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void {
    return [...this].forEach(callbackfn, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | Array.prototype.map()}
   * @params callbackfn - A function that accepts up to three arguments. The `map` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.value - The current element being processed in the collection.
   * @params callbackfn.index - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `map` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the `callbackfn` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns A new array containing the results of calling the `callbackfn` function on each element in the collection.
   */
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[] {
    return [...this].map(callbackfn, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter | Array.prototype.filter()}
   * @params predicate - A function that accepts up to three arguments. The `filter` method calls the `predicate` function one time for each element in the collection.
   * @params predicate.value - The current element being processed in the collection.
   * @params predicate.index - The index of the current element being processed in the collection.
   * @params predicate.array - The collection `filter` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the `predicate` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns A new array containing the elements of the collection for which the `predicate` function returned `true`.
   */
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter | Array.prototype.filter()}
   * @params predicate - A function that accepts up to three arguments. The `filter` method calls the `predicate` function one time for each element in the collection.
   * @params predicate.value - The current element being processed in the collection.
   * @params predicate.index - The index of the current element being processed in the collection.
   * @params predicate.array - The collection `filter` was called upon.
   * @params thisArg - An object to which the `this` keyword can refer in the `predicate` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns A new array containing the elements of the collection for which the `predicate` function returned `true`.
   */
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
  filter<S extends T>(predicate: any, thisArg?: any): T[] | S[] {
    return [...this].filter(predicate, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | Array.prototype.reduce()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduce` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduce` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | Array.prototype.reduce()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduce` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduce` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduce(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
    initialValue: T,
  ): T;
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | Array.prototype.reduce()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduce` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduce` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
    initialValue: U,
  ): U;
  reduce<U>(callbackfn: any, initialValue?: any): T | U {
    return [...this].reduce(callbackfn, initialValue);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight | Array.prototype.reduceRight()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduceRight` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduceRight` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight | Array.prototype.reduceRight()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduceRight` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduceRight` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduceRight(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
    initialValue: T,
  ): T;
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight | Array.prototype.reduceRight()}
   * @params callbackfn - A function that accepts up to four arguments. The `reduceRight` method calls the `callbackfn` function one time for each element in the collection.
   * @params callbackfn.previousValue - The value previously returned in the last invocation of the `callbackfn` function, or `initialValue`, if supplied. (See below.)
   * @params callbackfn.currentValue - The current element being processed in the collection.
   * @params callbackfn.currentIndex - The index of the current element being processed in the collection.
   * @params callbackfn.array - The collection `reduceRight` was called upon.
   * @params initialValue - If `initialValue` is specified, it is used as the initial value to start the accumulation. The first call to the `callbackfn` function provides this value as an argument instead of an element value.
   * @returns The value that results from the reduction.
   */
  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
    initialValue: U,
  ): U;
  reduceRight<U>(callbackfn: any, initialValue?: any): T | U {
    return [...this].reduceRight(callbackfn, initialValue);
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find | Array.prototype.find()}
   * @params predicate - A function that accepts up to three arguments. The `find` method calls the `predicate` function one time for each element in the collection.
   * @params predicate.value - The value of the element.
   * @params predicate.index - The index of the element.
   * @params predicate.obj - The object being traversed.
   * @params thisArg - An object to which the `this` keyword can refer in the `predicate` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns The value of the first element in the array that satisfies the provided testing function. Otherwise, `undefined` is returned.
   */
  find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any,
  ): S | undefined;
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find | Array.prototype.find()}
   * @params predicate - A function that accepts up to three arguments. The `find` method calls the `predicate` function one time for each element in the collection.
   * @params predicate.value - The value of the element.
   * @params predicate.index - The index of the element.
   * @params predicate.obj - The object being traversed.
   * @params thisArg - An object to which the `this` keyword can refer in the `predicate` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns The value of the first element in the array that satisfies the provided testing function. Otherwise, `undefined` is returned.
   */
  find<T>(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any): T | undefined {
    return [...this].find(predicate, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex | Array.prototype.findIndex()}
   * @params predicate - A function that accepts up to three arguments. The `findIndex` method calls the `predicate` function one time for each element in the collection.
   * @params predicate.value - The value of the element.
   * @params predicate.index - The index of the element.
   * @params predicate.obj - The object being traversed.
   * @params thisArg - An object to which the `this` keyword can refer in the `predicate` function. If `thisArg` is omitted, `undefined` is used as the `this` value.
   * @returns The index of the first element in the array that satisfies the provided testing function. Otherwise, -1 is returned.
   */
  findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number {
    return [...this].findIndex(predicate, thisArg);
  }
  // TODO: Implement support for RealmObjects, by comparing their #objectKey values
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes | Array.prototype.includes()}
   * @params searchElement - The element to search for.
   * @params fromIndex - The position in this array at which to begin searching for `searchElement`. A negative value searches from the index of array.length + fromIndex by asc.
   * @note `fromIndex` is currently not supported. So all searches start at index 0.
   * @returns `true` if the `searchElement` is found in the array; otherwise, `false`.
   */
  includes(searchElement: T, fromIndex?: number): boolean {
    return this.indexOf(searchElement, fromIndex) !== -1;
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | Array.prototype.flatMap()}
   * @params callback - Function that produces an element of the new Array, taking three arguments:
   * @params callback.currentValue - The current element being processed in the array.
   * @params callback.index - The index of the current element being processed in the array.
   * @params callback.array - The array `flatMap` was called upon.
   * @params thisArg - Value to use as this when executing callback.
   * @returns A new array with each element being the result of the callback function and flattened to a depth of 1.
   */
  flatMap<U, This = undefined>(
    callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[],
    thisArg?: This,
  ): U[] {
    return [...this].flatMap(callback, thisArg);
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat | Array.prototype.flat()}
   * @params depth - The depth level specifying how deep a nested array structure should be flattened. Defaults to 1.
   * @returns A new array with the sub-array elements concatenated into it.
   */
  flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];
  flat<D extends number = 1>(): FlatArray<this, D>[] {
    throw new Error("Method not implemented.");
  }
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at | Array.prototype.at()}
   * @params index - The index of the element to return from the array. If the index is a negative number, the element at `array.length + index` is returned.
   * @returns The element at the given index in the array; `undefined` if there is no element at the given index.
   */
  at(index: number): T | undefined {
    return [...this].at(index);
  }

  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * @returns An iterator that iterates over all the values in the collection.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  // Other methods

  // TODO: Implement this method
  /**
   * @returns A string describing the filters applied to this collection.
   */
  description(): string {
    throw new Error("Method not implemented.");
  }

  /**
   * Checks if this collection is empty.
   * @returns `true` if the collection is empty, `false` if not.
   */
  isEmpty(): boolean {
    return this.results.size() === 0;
  }

  /**
   * Returns the minimum value of the values in the collection or of the
   * given property among all the objects in the collection, or `undefined`
   * if the collection is empty.
   *
   * Only supported for int, float, double and date properties. `null` values
   * are ignored entirely by this method and will not be returned.
   * @param property - For a collection of objects, the property to take the minimum of.
   * @throws A {@link TypeAssertionError} if no property with the name exists or if property is not numeric/date.
   * @returns The minimum value.
   */
  min(property?: string): number | Date | undefined {
    const columnKey = this.getPropertyColumnKey(property);
    const result = this.results.min(columnKey);
    if (result instanceof Date || typeof result === "number" || typeof result === "undefined") {
      return result;
    } else if (binding.Int64.isInt(result)) {
      return binding.Int64.intToNum(result);
    } else if (result instanceof binding.Float) {
      return result.value;
    } else if (result instanceof binding.Timestamp) {
      return result.toDate();
    } else {
      throw new TypeAssertionError("Timestamp, number, bigint, Float or null", result, "result");
    }
  }

  /**
   * Returns the maximum value of the values in the collection or of the
   * given property among all the objects in the collection, or `undefined`
   * if the collection is empty.
   *
   * Only supported for int, float, double and date properties. `null` values
   * are ignored entirely by this method and will not be returned.
   * @param property - For a collection of objects, the property to take the maximum of.
   * @throws An {@link Error} if no property with the name exists or if property is not numeric/date.
   * @returns The maximum value.
   */
  max(property?: string): number | Date | undefined {
    const columnKey = this.getPropertyColumnKey(property);
    const result = this.results.max(columnKey);
    if (result instanceof Date || typeof result === "number" || typeof result === "undefined") {
      return result;
    } else if (binding.Int64.isInt(result)) {
      return binding.Int64.intToNum(result);
    } else if (result instanceof binding.Float) {
      return result.value;
    } else if (result instanceof binding.Timestamp) {
      return result.toDate();
    } else {
      throw new TypeAssertionError("Timestamp, number, bigint, Float or undefined", result, "result");
    }
  }

  /**
   * Computes the sum of the values in the collection or of the given
   * property among all the objects in the collection, or 0 if the collection
   * is empty.
   *
   * Only supported for int, float and double properties. `null` values are
   * ignored entirely by this method.
   * @param property - For a collection of objects, the property to take the sum of.
   * @throws An {@link Error} if no property with the name exists or if property is not numeric.
   * @returns The sum.
   */
  sum(property?: string): number {
    const columnKey = this.getPropertyColumnKey(property);
    const result = this.results.sum(columnKey);
    if (typeof result === "number") {
      return result;
    } else if (binding.Int64.isInt(result)) {
      return binding.Int64.intToNum(result);
    } else if (result instanceof binding.Float) {
      return result.value;
    } else {
      throw new TypeAssertionError("number, bigint or Float", result, "result");
    }
  }

  /**
   * Computes the average of the values in the collection or of the given
   * property among all the objects in the collection, or `undefined` if the collection
   * is empty.
   *
   * Only supported for int, float and double properties. `null` values are
   * ignored entirely by this method and will not be factored into the average.
   * @param property - For a collection of objects, the property to take the average of.
   * @throws An {@link Error} if no property with the name exists or if property is not numeric.
   * @returns The sum.
   */
  avg(property?: string): number | undefined {
    const columnKey = this.getPropertyColumnKey(property);
    const result = this.results.average(columnKey);
    if (typeof result === "number" || typeof result === "undefined") {
      return result;
    } else if (binding.Int64.isInt(result)) {
      return binding.Int64.intToNum(result);
    } else if (result instanceof binding.Float) {
      return result.value;
    } else {
      throw new TypeAssertionError("number, Float, bigint or undefined", result, "result");
    }
  }

  /**
   * Returns new {@link Results} that represent this collection being filtered by the provided query.
   * @param queryString - Query used to filter objects from the collection.
   * @param args - Each subsequent argument is used by the placeholders
   * (e.g. `$0`, `$1`, `$2`, …) in the query.
   * @throws An {@link Error} if the query or any other argument passed into this method is invalid.
   * @returns Results filtered according to the provided query.
   * @note This is currently only supported for collections of Realm Objects.
   * @example
   * let merlots = wines.filtered('variety == "Merlot" && vintage <= $0', maxYear);
   */
  filtered(queryString: string, ...args: unknown[]): Results<T> {
    const { results: parent, realm, helpers } = this;
    const kpMapping = binding.Helpers.getKeypathMapping(realm.internal);
    const bindingArgs = args.map((arg) =>
      Array.isArray(arg) ? arg.map((sub) => this.mixedToBinding(sub)) : this.mixedToBinding(arg),
    );
    const newQuery = parent.query.table.query(queryString, bindingArgs, kpMapping);
    const results = binding.Helpers.resultsAppendQuery(parent, newQuery);
    return new Results(realm, results, helpers);
  }

  /**
   * Returns new _Results_ that represent a sorted view of this collection.
   *
   * A collection of Realm Objects can be sorted on one or more properties of
   * those objects, or of properties of objects linked to by those objects.
   * To sort by a single property, simply pass the name of that property to
   * `sorted()`, optionally followed by a boolean indicating if the sort should be reversed.
   * For more than one property, you must pass an array of
   * **sort descriptors** which list
   * which properties to sort on.
   *
   * Collections of other types sort on the values themselves rather than
   * properties of the values, and so no property name or sort descriptors
   * should be supplied.
   * @param reverse - Sort in descending order rather than ascended.
   * It may not be applied if `descriptor` is an array of sort descriptors.
   * @throws An {@link Error} if a specified property does not exist.
   * @returns Results sorted according to the arguments passed in.
   */
  sorted(reverse?: boolean): Results<T>;
  /**
   * Returns new _Results_ that represent a sorted view of this collection.
   *
   * A collection of Realm Objects can be sorted on one or more properties of
   * those objects, or of properties of objects linked to by those objects.
   * To sort by a single property, simply pass the name of that property to
   * `sorted()`, optionally followed by a boolean indicating if the sort should be reversed.
   * For more than one property, you must pass an array of
   * **sort descriptors** which list
   * which properties to sort on.
   *
   * Collections of other types sort on the values themselves rather than
   * properties of the values, and so no property name or sort descriptors
   * should be supplied.
   * @param descriptor - The property name(s) to sort the collection on.
   * @throws An {@link Error} if a specified property does not exist.
   * @returns Results sorted according to the arguments passed in.
   */
  sorted(descriptor: SortDescriptor[]): Results<T>;
  /**
   * Returns new _Results_ that represent a sorted view of this collection.
   *
   * A collection of Realm Objects can be sorted on one or more properties of
   * those objects, or of properties of objects linked to by those objects.
   * To sort by a single property, simply pass the name of that property to
   * `sorted()`, optionally followed by a boolean indicating if the sort should be reversed.
   * For more than one property, you must pass an array of
   * **sort descriptors** which list
   * which properties to sort on.
   *
   * Collections of other types sort on the values themselves rather than
   * properties of the values, and so no property name or sort descriptors
   * should be supplied.
   * @param descriptor - The property name(s) to sort the collection on.
   * @throws An {@link Error} if a specified property does not exist.
   * @returns Results sorted according to the arguments passed in.
   */
  sorted(descriptor: string, reverse?: boolean): Results<T>;
  sorted(arg0: boolean | SortDescriptor[] | string = "self", arg1?: boolean): Results<T> {
    if (Array.isArray(arg0)) {
      assert.undefined(arg1, "second 'argument'");
      const { results: parent, realm, helpers } = this;
      // Map optional "reversed" to "ascending" (expected by the binding)
      const descriptors = arg0.map<[string, boolean]>((arg, i) => {
        if (typeof arg === "string") {
          return [arg, true];
        } else if (Array.isArray(arg)) {
          const [property, direction] = arg;
          assert.string(property, "property");
          assert.boolean(direction, "direction");
          return [property, !direction];
        } else {
          throw new TypeAssertionError("string or array with two elements [string, boolean]", arg, `descriptor[${i}]`);
        }
      });
      // TODO: Call `parent.sort`, avoiding property name to column key conversion to speed up performance here.
      const results = parent.sortByNames(descriptors);
      return new Results(realm, results, helpers);
    } else if (typeof arg0 === "string") {
      return this.sorted([[arg0, arg1 === true]]);
    } else if (typeof arg0 === "boolean") {
      return this.sorted([["self", arg0]]);
    } else {
      throw new TypeAssertionError("property name and optional bool or an array of descriptors", arg0, "argument");
    }
  }

  /**
   * Create a frozen snapshot of the collection.
   *
   * Values added to and removed from the original collection will not be
   * reflected in the _Results_ returned by this method, including if the
   * values of properties are changed to make them match or not match any
   * filters applied.
   *
   * This is **not** a _deep_ snapshot. Realm objects contained in this
   * snapshot will continue to update as changes are made to them, and if
   * they are deleted from the Realm they will be replaced by `null` at the
   * respective indices.
   * @returns Results which will **not** live update.
   */
  snapshot(): Results<T> {
    return new Results(this.realm, this.results.snapshot(), this.helpers);
  }

  private getPropertyColumnKey(name: string | undefined): binding.ColKey {
    if (this.classHelpers) {
      assert.string(name, "name");
      return this.classHelpers.properties.get(name).columnKey;
    } else if (name) {
      throw new Error(`Cannot get property named '${name}' on a list of primitives`);
    } else {
      return DEFAULT_COLUMN_KEY;
    }
  }
}
