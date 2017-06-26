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

/**
 * Abstract base class containing methods shared by {@link Realm.List} and {@link Realm.Results}.
 * @memberof Realm
 * @since 0.11.0
 */
class Collection {
    /**
     * The number of objects in the collection.
     * @type {number}
     * @readonly
     */
    get length() {}

    /**
     * Checks if this collection has not been deleted and is part of a valid Realm.
     * @returns {boolean} indicating if the collection can be safely accessed.
     * @since 0.14.0
     */
    isValid() {}

    /**
     * Returns new _Results_ that represent this collection being filtered by the provided query.
     * @param {string} query - Query used to filter objects from the collection.
     * @param {...any} [arg] - Each subsequent argument is used by the placeholders
     *   (e.g. `$0`, `$1`, `$2`, …) in the query.
     * @throws {Error} If the query or any other argument passed into this method is invalid.
     * @returns {Realm.Results} filtered according to the provided query.
     * 
     * See {@tutorial query-language} for details about the query language.
     * @example
     * let merlots = wines.filtered('variety == "Merlot" && vintage <= $0', maxYear);
     */
    filtered(query, ...arg) {}

    /**
     * Returns new _Results_ that represent this collection being sorted by the provided property
     * (or properties) of each object.
     * @param {string|Realm.Results~SortDescriptor[]} descriptor - The property name(s) to sort
     *   the objects in the collection.
     * @param {boolean} [reverse=false] - May only be provided if `descriptor` is a string.
     * @throws {Error} If a specified property does not exist.
     * @returns {Realm.Results} sorted according to the arguments passed in
     */
    sorted(descriptor, reverse) {}

    /**
     * Create a frozen snapshot of the collection. This means objects added to and removed from the
     * original collection will not be reflected in the _Results_ returned by this method.
     * However, objects deleted from the Realm will become `null` at their respective indices.
     * This is **not** a _deep_ snapshot, meaning the objects contained in this snapshot will
     * continue to update as changes are made to them.
     * @returns {Realm.Results} which will **not** live update.
     */
    snapshot() {}

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.entries}
     * @returns {Realm.Collection~Iterator} of each `[index, object]` pair in the collection
     * @since 0.11.0
     */
    entries() {}

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
     * @returns {Realm.Collection~Iterator} of each index in the collection
     * @since 0.11.0
     */
    keys() {}

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values Array.prototype.values}
     * @returns {Realm.Collection~Iterator} of each Realm object in the collection
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
     * @returns {Realm.Collection~Iterator} of each Realm object in the collection
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
     * @returns {Realm.Object[]} containing the objects from the start index up to, but not
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
     * @returns {Realm.Object|undefined} if the `callback` did not return `true` for any object
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
    * @param {Realm.Object} [object] - The object to search for in the collection.
    * @throws {Error} If the argument does not belong to the realm.
    * @returns {number} representing the index where the object was found, or `-1`
    *   if not in collection.
    * @since 1.8.2
    */
   indexOf(object) {}

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
     *   - `changes`: a dictionary with keys `insertions`, `modifications` and `deletions`,
     *      each containing a list of indices that were inserted, updated or deleted respectively.
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
 *       added as a listener through the {@link Collection#addListener addListener} method.
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
 * The sort descriptors may either just be a string representing the property name, **or** an
 * array with two items: `[propertyName, reverse]`
 * @typedef Realm.Collection~SortDescriptor
 * @type {string|Array}
 */
