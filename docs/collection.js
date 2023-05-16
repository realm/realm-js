////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/* eslint getter-return: "off" */

/**
 * Abstract base class containing methods shared by {@link Realm.List} and {@link Realm.Results}.
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
 * @memberof Realm
 * @since 0.11.0
 */
class Collection {
  /**
   * The number of values in the collection.
   * @type {number}
   * @readonly
   */
  get length() {}

  /**
   * The {@linkplain Realm~PropertyType type} of values in the collection.
   * @type {string}
   * @readonly
   * @since 2.0.0
   */
  get type() {}

  /**
   * Whether `null` is a valid value for the collection.
   * @type {boolean}
   * @readonly
   * @since 2.0.0
   */
  get optional() {}

  /**
   * Checks if this collection has not been deleted and is part of a valid Realm.
   * @returns {boolean} indicating if the collection can be safely accessed.
   * @since 0.14.0
   */
  isValid() {}

  /**
   * Checks if this collection is empty.
   * @returns {boolean} indicating if the collection is empty or not.
   * @since 2.7.0
   */
  isEmpty() {}

  /**
   * Returns new _Results_ that represent this collection being filtered by the provided query.
   *
   * @param {string} query - Query used to filter objects from the collection.
   * @param {...any} [arg] - Each subsequent argument is used by the placeholders
   *   (e.g. `$0`, `$1`, `$2`, …) in the query.
   * @throws {Error} If the query or any other argument passed into this method is invalid.
   * @returns {Realm.Results<T>} filtered according to the provided query.
   *
   * This is currently only supported for collections of Realm Objects.
   *
   * See {@tutorial query-language} for details about the query language.
   * @example
   * let merlots = wines.filtered('variety == "Merlot" && vintage <= $0', maxYear);
   */
  filtered(query, ...arg) {}

  /**
   * Returns new _Results_ that represent a sorted view of this collection.
   *
   * A collection of Realm Objects can be sorted on one or more properties of
   * those objects, or of properties of objects linked to by those objects.
   * To sort by a single property, simply pass the name of that property to
   * `sorted()`, optionally followed by a boolean indicating if the sort should be reversed.
   * For more than one property, you must pass an array of
   * {@linkplain Realm.Collection~SortDescriptor sort descriptors} which list
   * which properties to sort on.
   *
   * Collections of other types sort on the values themselves rather than
   * properties of the values, and so no property name or sort descriptors
   * should be supplied.
   *
   * @example
   * // Sort wines by age
   * wines.sorted('age')
   * @example
   * // Sort wines by price in descending order, then sort ties by age in
   * // ascending order
   * wines.sorted([['price', false], ['age']])
   * @example
   * // Sort a list of numbers in ascending order
   * let sortedPrices = wine.pricesSeen.sort()
   * @example
   * // Sort people by how expensive their favorite wine is
   * people.sort("favoriteWine.price")
   *
   * @param {string|Realm.Collection~SortDescriptor[]} [descriptor] - The property name(s) to sort the collection on.
   * @param {boolean} [reverse=false] - Sort in descending order rather than ascended.
   *   May not be supplied if `descriptor` is an array of sort descriptors.
   * @throws {Error} If a specified property does not exist.
   * @returns {Realm.Results<T>} sorted according to the arguments passed in.
   */
  sorted(descriptor, reverse) {}

  /**
   * Create a snapshot of the collection.
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
   *
   * Snapshotting is not supported for list of primitive types.
   *
   * @returns {Realm.Results<T>} which will **not** live update.
   */
  snapshot() {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.entries}
   * @returns {Realm.Collection~Iterator<T>} of each `[index, object]` pair in the collection
   * @since 0.11.0
   */
  entries() {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns {Realm.Collection~Iterator<T>} of each index in the collection
   * @since 0.11.0
   */
  keys() {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values Array.prototype.values}
   * @returns {Realm.Collection~Iterator<T>} of each Realm object in the collection
   * @since 0.11.0
   */
  values() {}

  /**
   * This is the same method as the {@link Realm.Collection#values values()} method.
   * Its presence makes collections _iterable_, thus able to be used with ES6
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of `for-of`}
   * loops,
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator `...`}
   * spread operators, and more.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator Symbol.iterator}
   *   and the {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable iterable protocol}
   * @returns {Realm.Collection~Iterator<T>} of each Realm object in the collection
   * @since 0.11.0
   * @example
   * for (let object of collection) {
   *   // do something with each object
   * }
   */
  [Symbol.iterator]() {}

  /**
   * Joins all objects in the collection into a string.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join Array.prototype.join}
   * @param {string} [separator=","] - A string to separate the return values of the
   *   `toString()` method being called on each object in the collection.
   * @returns {string}
   * @since 0.11.0
   */
  join(separator) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice Array.prototype.slice}
   * @param {number} [start=0] - The start index. If negative, then the start index will be
   *   counted from the end of the collection.
   * @param {number} [end] - The end index. The objects up to, but not including, the end
   *   index will be include in the return value. If negative, then the end index will be
   *   counted from the end of the collection. If omitted, then all objects from the start
   *   index will be included in the return value.
   * @returns {T[]} containing the objects from the start index up to, but not
   *   including, the end index.
   * @since 0.11.0
   */
  slice(start, end) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find Array.prototype.find}
   * @param {function} callback - Function to execute on each object in the collection.
   *   If this function returns `true`, then that object will be returned by this method.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {T|undefined} if the `callback` did not return `true` for any object
   *   in the collection.
   * @since 0.11.0
   */
  find(callback, thisArg) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex Array.prototype.findIndex}
   * @param {function} callback - Function to execute on each object in the collection.
   *   If this function returns `true`, then the index of that object will be returned
   *   by this method. This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {number} representing the index where the `callback` returned `true`, or `-1`
   *   if `true` was never returned.
   * @since 0.11.0
   */
  findIndex(callback, thisArg) {}

  /**
     Finds the index of the given object in the collection.
     * @param {T} object - The value to search for in the collection.
     * @throws {Error} If the argument is a {@link Realm.Object} that does not
     *                 belong to the same Realm as the collection.
     * @returns {number} representing the index where the value was found, or
     *          `-1` if not in collection.
     * @since 1.8.2
     */
  indexOf(object) {}

  /**
   * Returns the minimum value of the values in the collection or of the
   * given property among all the objects in the collection, or `undefined`
   * if the collection is empty.
   *
   * Only supported for int, float, double and date properties. `null` values
   * are ignored entirely by this method and will not be returned.
   *
   * @param {string} [property] - For a collection of objects, the property to take the minimum of.
   * @throws {Error} If no property with the name exists or if property is not numeric/date.
   * @returns {number} the minimum value.
   * @since 1.12.1
   */
  min(property) {}

  /**
   * Returns the maximum value of the values in the collection or of the
   * given property among all the objects in the collection, or `undefined`
   * if the collection is empty.
   *
   * Only supported for int, float, double and date properties. `null` values
   * are ignored entirely by this method and will not be returned.
   *
   * @param {string} [property] - For a collection of objects, the property to take the maximum of.
   * @throws {Error} If no property with the name exists or if property is not numeric/date.
   * @returns {number} the maximum value.
   * @since 1.12.1
   */
  max(property) {}

  /**
   * Computes the sum of the values in the collection or of the given
   * property among all the objects in the collection, or 0 if the collection
   * is empty.
   *
   * Only supported for int, float and double properties. `null` values are
   * ignored entirely by this method.
   * @param {string} [property] - For a collection of objects, the property to take the sum of.
   * @throws {Error} If no property with the name exists or if property is not numeric.
   * @returns {number} the sum.
   * @since 1.12.1
   */
  sum(property) {}

  /**
   * Computes the average of the values in the collection or of the given
   * property among all the objects in the collection, or `undefined` if the collection
   * is empty.
   *
   * Only supported for int, float and double properties. `null` values are
   * ignored entirely by this method and will not be factored into the average.
   * @param {string} [property] - For a collection of objects, the property to take the average of.
   * @throws {Error} If no property with the name exists or if property is not numeric.
   * @returns {number} the sum.
   * @since 1.12.1
   */
  avg(property) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach Array.prototype.forEach}
   * @param {function} callback - Function to execute on each object in the collection.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @since 0.11.0
   */
  forEach(callback, thisArg) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every Array.prototype.every}
   * @param {function} callback - Function to execute on each object in the collection.
   *   If this function returns `true` for every object, then this method will return `true`.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {boolean} representing if `callback` returned `true` for every object in the
   *   collection.
   * @since 0.11.0
   */
  every(callback, thisArg) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some Array.prototype.some}
   * @param {function} callback - Function to execute on each object in the collection.
   *   If this function ever returns `true`, then this method will return `true`.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {boolean} – `true` when `callback` returns `true` for an object in the collection,
   *   otherwise `false`.
   * @since 0.11.0
   */
  some(callback, thisArg) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map Array.prototype.map}
   * @param {function} callback - Function to execute on each object in the collection.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {any[]} – the return values of `callback` after being called on every object
   *   in the collection.
   * @since 0.11.0
   */
  map(callback, thisArg) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce Array.prototype.reduce}
   * @param {function} callback - Function to execute on each object in the collection.
   *   This function takes four arguments:
   *   - `previousValue` – The value previously returned in the last invocation of the callback,
   *     or `initialValue`, if supplied.
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [initialValue] - The value to use as the first argument to the first call
   *   of the `callback`.
   * @throws {TypeError} If the collection is empty and no `initialValue` was supplied.
   * @returns {any} – the value returned by the final invocation of `callback`, _except_ for
   *   the following special cases:
   *   - If collection consists of a single object, and no `initalValue` was supplied, then
   *     that object will be returned.
   *   - If the collection is empty, then `initialValue` _must_ be supplied and will be returned.
   * @since 0.11.0
   */
  reduce(callback, initialValue) {}

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight Array.prototype.reduceRight}
   * @param {function} callback - Function to execute on each object, from **right to left**,
   *   in the collection. This function takes four arguments:
   *   - `previousValue` – The value previously returned in the last invocation of the callback,
   *     or `initialValue`, if supplied.
   *   - `object` – The current object being processed in the collection.
   *   - `index` – The index of the object being processed in the collection.
   *   - `collection` – The collection itself.
   * @param {object} [initialValue] - The value to use as the first argument to the first call
   *   of the `callback`.
   * @throws {TypeError} If the collection is empty and no `initialValue` was supplied.
   * @returns {any} – the value returned by the final invocation of `callback`, _except_ for
   *   the following special cases:
   *   - If collection consists of a single object, and no `initalValue` was supplied, then
   *     that object will be returned.
   *   - If the collection is empty, then `initialValue` _must_ be supplied and will be returned.
   * @since 0.11.0
   */
  reduceRight(callback, initialValue) {}

  /**
   * Add a listener `callback` which will be called when a **live** collection instance changes.
   * @param {function(collection, changes)} callback - A function to be called when changes occur.
   *   The callback function is called with two arguments:
   *   - `collection`: the collection instance that changed,
   *   - `changes`: a dictionary with keys `insertions`, `newModifications`, `oldModifications`
   *      and `deletions`, each containing a list of indices in the collection that were
   *      inserted, updated or deleted respectively. `deletions` and `oldModifications` are
   *      indices into the collection before the change happened, while `insertions` and
   *      `newModifications` are indices into the new version of the collection.
   * @throws {Error} If `callback` is not a function.
   * @example
   * wines.addListener((collection, changes) => {
   *  // collection === wines
   *  console.log(`${changes.insertions.length} insertions`);
   *  console.log(`${changes.modifications.length} modifications`);
   *  console.log(`${changes.deletions.length} deletions`);
   *  console.log(`new size of collection: ${collection.length}`);
   * });
   */
  addListener(callback) {}

  /**
   * Remove the listener `callback` from the collection instance.
   * @param {function(collection, changes)} callback - Callback function that was previously
   *   added as a listener through the {@link Collection#addListener addListener} method.
   * @throws {Error} If `callback` is not a function.
   */
  removeListener(callback) {}

  /**
   * Remove all `callback` listeners from the collection instance.
   */
  removeAllListeners(name) {}
}

/**
 * This is an ES6 iterator.
 * @typedef Realm.Collection~Iterator
 * @memberof Realm.Collection
 * @property {function} next - Returns an object with two properties:
 *   - `done` – `true` if the iterator is done iterating through items in the collection,
 *     otherwise `false`
 *   - `value` – the next item being iterated through in the collection, or `undefined` when
 *     `done` is `true`
 * @property {function} Symbol.iterator - This method simply returns `this`, thus making this
 *   iterator itself _iterable_ (i.e. usable in
 *   {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of `for-of`}
 *   loops, with the
 *   {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator `...`}
 *   spread operator, and more).
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterator iterator protocol}
 */

/**
 * A sort descriptor is either a string containing one or more property names
 * separate by dots, **or** an array with two items: `[propertyName, reverse]`.
 *
 * @typedef Realm.Collection~SortDescriptor
 * @memberof Realm.Collection
 * @type {string|Array}
 */
