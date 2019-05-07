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
 * {@link Realm.Results#snapshot snapshot()}, however, will **not** live update
 * (and listener callbacks added through {@link Realm.Results#addListener addListener()}
 * will thus never be called).
 *
 * @extends Realm.Collection
 * @memberof Realm
 */
class Results extends Collection {
    /**
     * Bulk update objects in the collection.
     * @param {string} property - The name of the property.
     * @param {string} value - The updated property value.
     * @throws {Error} If no property with the name exists.
     * @since 2.0.0-rc20
     */
    update(property, value) { }
}
