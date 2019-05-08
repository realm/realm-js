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
 *
 * Lists mostly behave like normal Javascript Arrays, except for that they can
 * only store values of a single type (indicated by the `type` and `optional`
 * properties of the List), and can only be modified inside a {@linkplain
 * Realm#write write} transaction.
 *
 * @extends Realm.Collection
 * @memberof Realm
 */
class List extends Collection {
    /**
     * Remove the **last** value from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {T|undefined} if the list is empty.
     */
    pop() { }

    /**
     * Add one or more values to the _end_ of the list.
     *
     * @param {...T} value - Values to add to the list.
     * @throws {TypeError} If a `value` is not of a type which can be stored in
     *   the list, or if an object being added to the list does not match the
     *   {@linkcode Realm~ObjectSchema object schema} for the list.
     *
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of
     *          the list after adding the values.
     */
    push(...value) { }

    /**
     * Remove the **first** value from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {T|undefined} if the list is empty.
     */
    shift() { }

    /**
     * Changes the contents of the list by removing value and/or inserting new value.
     *
     * @see {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice Array.prototype.splice}
     * @param {number} index - The start index. If greater than the length of the list,
     *   the start index will be set to the length instead. If negative, then the start index
     *   will be counted from the end of the list (e.g. `list.length - index`).
     * @param {number} [count] - The number of values to remove from the list.
     *   If not provided, then all values from the start index through the end of
     *   the list will be removed.
     * @param {...T} [value] - Values to insert into the list starting at `index`.
     * @returns {T[]} containing the value that were removed from the list. The
     *   array is empty if no value were removed.
     */
    splice(index, count, ...object) { }

    /**
     * Add one or more values to the _beginning_ of the list.
     *
     * @param {...T} value - Values to add to the list.
     * @throws {TypeError} If a `value` is not of a type which can be stored in
     *   the list, or if an object being added to the list does not match the
     *   {@linkcode Realm~ObjectSchema object schema} for the list.
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of
     *          the list after adding the values.
     */
    unshift(...object) { }
}
