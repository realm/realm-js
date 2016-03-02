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
 * Instances of this class will be returned when accessing object properties whose type is `"list"`
 * (see {@linkplain Realm~ObjectSchemaProperty ObjectSchemaProperty}).
 * The objects contained in a list are accessible through its index properties and may only be
 * modified inside a {@linkplain Realm#write write} transaction.
 * @memberof Realm
 */
class List {
    /**
     * The number of objects in the list.
     * @type {number}
     * @readonly
     */
    get length() {}

    /**
     * Returns new results that represent this list being filtered by the provided query.
     * ```js
     * let merlots = wines.filtered('varietal == "Merlot" && vintage <= $0', maxYear);
     * ```
     * @param {string} query - Query used to filter results.
     * @param {...any} [arg] - Each subsequent argument is used by the placeholders
     *   (e.g. `$0`, `$1`, `$2`, …) in the query.
     * @throws {Error} If the query or any other argument passed into this method is invalid.
     * @returns {Realm.Results} filtered according to the provided query.
     */
    filtered(query, ...arg) {}

    /**
     * Returns new results that represent this list being sorted by the provided property
     *   (or properties) of each object.
     * @param {string|Realm.Results~SortDescriptor[]} descriptor - The property name(s) to sort
     *   results by.
     * @param {boolean} [reverse=false] - May only be provided if `descriptor` is a string.
     * @throws {Error} If a specified property does not exist.
     * @returns {Realm.Results} sorted according to the arguments passed in
     */
    sorted(descriptor, reverse) {}

    /**
     * Create a frozen snapshot of the list. This means changes to the list will not be
     * reflected in the results returned by this method. However, deleted objects will become
     * `null` at their respective indices.
     * @returns {Realm.Results} which will **not** live update.
     */
    snapshot() {}

    /**
     * Remove the **first** object from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Object|undefined} if the list is empty.
     */
    shift() {}

    /**
     * Remove the **last** object from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Object|undefined} if the list is empty.
     */
    pop() {}

    /**
     * Add one or more objects to the _end_ of the list.
     * @param {...Realm.Object} object - Each object’s type must match
     *   {@linkcode Realm~ObjectSchemaProperty objectType} specified in the schema.
     * @throws {TypeError} If an `object` is of the wrong type.
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of the list
     *   after adding objects.
     */
    push(...object) {}

    /**
     * Add one or more objects to the _beginning_ of the list.
     * @param {...Realm.Object} object - Each object’s type must match
     *   {@linkcode Realm~ObjectSchemaProperty objectType} specified in the schema.
     * @throws {TypeError} If an `object` is of the wrong type.
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of the list
     *   after adding objects.
     */
    unshift(...object) {}
}