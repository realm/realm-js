////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
 * Instances of this class will be returned when accessing object properties whose type is `"Set"`
 * (see {@linkplain Realm~ObjectSchemaProperty ObjectSchemaProperty}).
 *

 * Sets mostly behave like normal JavaScript Sets, with a few exceptions:
 * They can only store values of a single type (indicated by the `type` 
 * and `optional` properties of the Set).
 * They can only be modified inside a {@linkplain Realm#write write} transaction.
 * Unlike JavaScript's Set, Realm~Set does NOT make any guarantees about the 
 * traversal order of `values()`, `entries()`, `keys()`, or `forEach` iterations.
 *
 * @extends Realm.Collection
 * @memberof Realm
 */
class Set extends Collection {
    /**
     * Remove a value from the Set
     * @param {T} value Value to delete from the Set
     * @throws {Error} If not inside a write transaction.
     * @returns {boolean}: true if the value existed in the Set, false otherwise
     */
     delete(value) { }

    /**
     * Remove all values from the Set
     * @throws {Error} If not inside a write transaction.
     * @returns {void} 
     */
     clear() { }

     /**
     * Add a value to the Set
     *
     * @param {T} value Value to add to the Set
     * @throws {TypeError} If a `value` is not of a type which can be stored in
     *   the Set, or if an object being added to the Set does not match the
     *   {@linkcode Realm~ObjectSchema object schema} for the Set.
     *
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Set}: The Set itself, after adding the element
     */
     add(value) { }

     /**
     * Check for the existence of a value in the Set
     *
     * @param {T} value Value to to search for in the Set
     * @throws {TypeError} If a `value` is not of a type which can be stored in
     *   the Set, or if an object being added to the Set does not match the
     *   {@linkcode Realm~ObjectSchema object schema} for the Set.
     *
     * @returns {boolean}: True if the value exists in the Set, false otherwise
     */
     has(value) { }
}
