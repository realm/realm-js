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
 * Instances of this class will be returned when accessing object properties whose type is `"Dictionary"`
 * (see {@linkplain Realm~ObjectSchemaProperty ObjectSchemaProperty}).
 *
 * Dictionaries behave mostly like a JavaScript object i.e., as a key/value pair
 * where the key is a string.
 *
 *
 * @memberof Realm
 */

 class Dictionary {
    /**
     * The number of keys.
     * @type {number}
     * @readonly
     * @since 10.6.0
     */
    get length() { }

     /**
      * Remove a key from the dictionary. It is also possible to use the keyword `delete`.
      * @param {string} key The key to be removed.
      * @throws {Error} If not inside a write transaction
      * @since 10.6.0
      */
     remove(key) { }

     /**
      * Add a key with a value or update value if key exists.
      * @param {string} key The key to be added or set
      * @throws {Error} If not inside a write transaction or if value violates type constraints
      * @param {} value The value
      * @since 10.6.0
     */
     set(key, value) { }

     /**
      * Get the keys. It is also possible to use `Object.keys()`.
      * @returns {Array} An array of keys
      * @since 10.6.0
      */
     keys() { }

     /**
      * Check if a key exists.
      * @return {boolean} True if key exists, otherwise false
      * @param {*} key
      * @since 10.6.0
      */
     has(key) { }

   /**
     * Add a listener `callback`.
     * @param {callback(dictionary, changeset)} callback - Function to be called when a change event occurs.
     *   Each callback will only be called once per event, regardless of the number of times
     *   it was added.
     * The callback has two arguments:
     * - dictionary: the dictionary instance that changed
     * - changeset: an object of array of keys changed (`deletions`, `insertions`, and `modifications`)
     * @throws {Error} If `callback` is not a function.
     * @since 10.6.0
     */
    addListener(callback) { }

    /**
     * Remove the listener `callback`.
     * @param {callback(Realm.Dictionary, Realm.Dictionary.Changeset)} callback - Function that was previously added as a
     *   listener through the {@link Realm.Dictionary#addListener addListener} method.
     * @throws {Error} If `callback` is not a function.
     * @since 10.6.0
     */
    removeListener(callback) { }

    /**
     * Remove all event listeners.
     * @since 10.6.0
     */
    removeAllListeners() { }

 }