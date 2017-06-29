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
}
