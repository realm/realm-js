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
 * Instances of this class are typically **live** collections returned by
 * {@link Realm#objects objects()} that will update as new objects are either
 * added to or deleted from the Realm that match the underlying query. Results returned by
 * {@link Realm.Results#snapshot snapshot()}, however, are will **not** live update.
 * @memberof Realm
 */
class Results {
    /**
     * The number of objects in the results.
     * @type {number}
     * @readonly
     */
    get length() {}

    /**
     * Returns new results that are filtered by the provided query.
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
     * Returns new results that are sorted by the provided property (or properties) of each object.
     * @param {string|Realm.Results~SortDescriptor[]} descriptor - The property name(s) to sort
     *   results by.
     * @param {boolean} [reverse=false] - May only be provided if `descriptor` is a string.
     * @throws {Error} If a specified property does not exist.
     * @returns {Realm.Results} sorted according to the arguments passed in
     */
    sorted(descriptor, reverse) {}

    /**
     * Create a frozen snapshot of the results. This means changes to the list will not be
     * reflected in the results returned by this method. However, deleted objects will become
     * `null` at their respective indices.
     * @returns {Realm.Results} which will **not** live update.
     */
    snapshot() {}
}

/**
 * The sort descriptors may either just be a string representing the property name, **or** an
 * array with two items: `[propertyName, reverse]`
 * @typedef Realm.Results~SortDescriptor
 * @type {string|Array}
 */
