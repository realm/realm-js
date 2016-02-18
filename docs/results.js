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
     * Create a frozen snapshot of the list. This means changes to the list will not be
     * reflected in the results returned by this method. However, deleted objects will become
     * `null` at their respective indices.
     * @returns {Realm.Results} which will **not** live update.
     */
    snapshot() {}

    /**
     * Modifies this collection to be sorted by the provided property of each object.
     * @param {string} name - The property name to sort results by.
     * @param {boolean} [ascending=true]
     * @throws {Error} If the specified property does not exist.
     */
    sortByProperty(name, ascending) {}
}
