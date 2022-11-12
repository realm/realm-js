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

// The "Object" name clash with the built-in class of the same name. We don't care since this is just documentation.
/* eslint-disable no-redeclare */

/**
 * Realm objects will automatically inherit from this class unless a {@link Realm~ObjectClass}
 * was specified that does **not** inherit from this class.
 * @memberof Realm
 * @since 0.12.0
 */
class Object {
  /**
   * Checks if this object has not been deleted and is part of a valid Realm.
   * @returns {boolean} indicating if the object can be safely accessed.
   * @since 0.12.0
   */
  isValid() {}

  /**
   * Returns the schema for the type this object belongs to.
   * @returns {Realm~ObjectSchema} the schema that describes this object.
   * @since 1.8.1
   */
  objectSchema() {}

  /**
   * Returns all the objects that link to this object in the specified relationship.
   * @param {string} objectType - The type of the objects that link to this object's type.
   * @param {string} property - The name of the property that references objects of this object's type.
   * @throws {Error} If the relationship is not valid.
   * @returns {Realm.Results} the objects that link to this object.
   * @since 1.9.0
   */
  linkingObjects(objectType, property) {}

  /**
   * Returns the total count of incoming links to this object
   * @returns {number} number of links to this object.
   * @since 2.6.0
   */
  linkingObjectsCount() {}

  /**
   * Add a listener `callback` which will be called when a **live** object instance changes.
   * @param {function(obj, changes)} callback - A function to be called when changes occur.
   *   The callback function is called with two arguments:
   *   - `obj`: the object that changed,
   *   - `changes`: a dictionary with keys `deleted`, and `changedProperties`. `deleted` is true
   *       if the object has been deleted. `changedProperties` is an array of properties that have changed
   *       their value.
   * @throws {Error} If `callback` is not a function.
   * @since 2.23.0
   * @example
   * wine.addListener((obj, changes) => {
   *  // obj === wine
   *  console.log(`object is deleted: ${changes.deleted}`);
   *  console.log(`${changes.changedProperties.length} properties have been changed:`);
   *  changes.changedProperties.forEach(prop => {
   *      console.log(` ${prop}`);
   *   });
   * })
   */
  addListener(callback) {}

  /**
   * Remove the listener `callback`
   * @param {function(obj, changes)} callback - A function previously added as listener
   * @since 2.23.0
   */
  removeListener(callback) {}

  /**
   * Remove all listeners.
   * @since 2.23.0
   */
  removeAllListeners() {}

  /**
   * Get underlying type of a property value.
   * @param {string} propertyName - The name of the property to retrieve the type of.
   * @returns {string} Underlying type of the property value.
   * @throws {Error} If property does not exist.
   * @since 10.8.0
   */
  getPropertyType(propertyName) {}
}
