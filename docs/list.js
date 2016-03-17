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
 * @extends Realm.Collection
 * @memberof Realm
 */
class List extends Collection {
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
     * Remove the **first** object from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Object|undefined} if the list is empty.
     */
    shift() {}

    /**
     * Changes the contents of the list by removing objects and/or inserting new objects.
     * @see {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice Array.prototype.splice}
     * @param {number} index - The start index. If greater than the length of the list,
     *   the start index will be set to the length instead. If negative, then the start index
     *   will be counted from the end of the list (e.g. `list.length - index`).
     * @param {number} [count] - The number of objects to remove from the list. If not provided,
     *   then all objects from the start index through the end of the list will be removed.
     * @param {...Realm.Object} [object] - Objects to insert into the list starting at `index`.
     * @returns {Realm.Object[]} containing the objects that were removed from the list. The
     *   array is empty if no objects were removed.
     */
    splice(index, count, ...object) {}

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