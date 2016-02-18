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
 * A Realm instance represents a Realm database.
 * ```js
 * const Realm = require('realm');
 * ```
 */
class Realm {
    /**
     * Create a new `Realm` instance using the provided `config`. If a Realm does not yet exist
     * at `config.path` (or {@link Realm.defaultPath} if not provided), then this constructor
     * will create it with the provided `config.schema` (which is _required_ in this case).
     * Otherwise, the instance will access the existing realm from the file at that path.
     * In this case, `config.schema` is _optional_ or not have changed, unless
     * `config.schemaVersion` is incremented, in which case the realm will be automatically
     * migrated to use the new schema.
     * @param {Realm~Configuration} [config] - **Required** when first creating the Realm.
     */
    constructor(config) {}

    /**
     * Create a new Realm object of the given type and with the specified properties.
     * @param {string} type - The type of object as specified by its `name` in the
     *   {@link Realm~ObjectSchema ObjectSchema} definition.
     * @param {Object} properties - Property values for all required properties without a
     *   default value.
     * @param {boolean} [update=false] - Signals that an existing object with matching primary key
     *   should be updated. Only the primary key property and properties which should be updated
     *   need to be specified. All missing property values will remain unchanged.
     * @returns {Realm.Object}
     */
    create(type, properties, update) {}

    /**
     * Deletes the provided Realm object, or each one inside the provided collection.
     * @param {Realm.Object|Realm.Object[]|Realm.List|Realm.Results} object
     */
    delete(object) {}

    /**
     * **WARNING:** This will delete **all** objects in the Realm!
     */
    deleteAll() {}

    /**
     * Returns all objects of the given `type` in the Realm, optionally filtered by the provided
     * `query`.
     * ```js
     * let merlots = realm.objects('Wine', 'varietal == "Merlot" && vintage <= $0', maxYear);
     * ```
     * @param {string} type - The type of object as specified by its `name` in the
     *   {@link Realm~ObjectSchema ObjectSchema} definition.
     * @param {string} [query] - Query used to filter results.
     * @param {...any} [arg] - Each subsequent argument is used by the placeholders
     *   (e.g. `$0`, `$1`, `$2`, …) in the query.
     * @throws {Error} If type, query, or any other argument passed into this method is invalid.
     * @returns {Realm.Results}
     */
    objects(type, query, ...arg) {}

    /**
     * Add a listener `callback` for the specified event `name`.
     * @param {string} name - The name of event that should cause the callback to be called.
     *   _Currently, only the "change" event supported_.
     * @param {function(Realm, string)} callback - Function to be called when the event occurs.
     *   Each callback will only be called once per event, regardless of the number of times
     *   it was added.
     * @throws {Error} If an invalid event `name` is supplied, or if `callback` is not a function.
     */
    addListener(name, callback) {}

   /**
    * Remove the listener `callback` for the specfied event `name`.
    * @param {string} name - The event name.
    *   _Currently, only the "change" event supported_.
    * @param {function(Realm, string)} callback - Function that was previously added as a
    *   listener for this event through the {@link Realm#addListener addListener} method.
    * @throws {Error} If an invalid event `name` is supplied, or if `callback` is not a function.
    */
    removeListener(name, callback) {}

   /**
    * Remove all event listeners (restricted to the event `name`, if provided).
    * @param {string} [name] - The name of the event whose listeners should be removed.
    *   _Currently, only the "change" event supported_.
    * @throws {Error} When invalid event `name` is supplied
    */
    removeAllListeners(name) {}

   /**
    * Synchronously call the provided `callback` inside a write transaction.
    * @param {function()} callback
    */
    write(callback) {}
}

/**
 * The default path where to create and access the Realm file.
 * @type {string}
 */
Realm.defaultPath;

/**
 * This describes the different options used to create a {@link Realm} instance.
 * @typedef Realm~Configuration
 * @type {Object}
 * @property {string} [path={@link Realm.defaultPath}] - The path to the file where the
 *   Realm database should be stored.
 * @property {Realm~ObjectSchema[]} [schema] - Specifies all the object types in the realm.
 *   **Required** when first creating realm at this `path`.
 * @property {number} [schemaVersion] - **Required** (and must be incremented) after
 *   changing the `schema`.
 */

/**
 * @typedef Realm~ObjectSchema
 * @type {Object}
 * @property {string} name - Represents the object type.
 * @property {string} [primaryKey] - The name of a `"string"` or `"int"` property
 *   that must be unique across all objects of this type within the same Realm.
 * @property {Object<string, (Realm~PropertyType|Realm~ObjectSchemaProperty)>} properties -
 *   An object where the keys are property names and the values represent the property type.
 */

/**
 * @typedef Realm~ObjectSchemaProperty
 * @type {Object}
 * @property {Realm~PropertyType} type - The type of this property.
 * @property {string} [objectType] - **Required**  when `type` is `"list"`, and must match the
 *   type of an object in the same schema.
 * @property {any} [default] - The default value for this property on creation when not
 *   otherwise specified.
 * @property {boolean} [optional] - Signals if this property may be assigned `null` or `undefined`.
 */

/**
 * A property type may be specified as one of the standard builtin types, or as an object type
 * inside the same schema.
 * @typedef Realm~PropertyType
 * @type {("bool"|"int"|"float"|"double"|"string"|"date"|"data"|"list"|"<ObjectType>")}
 * @property {boolean} "bool" - Property value may either be `true` or `false`.
 * @property {number} "int" - Property may be assigned any number, but will be stored as a
 *   round integer, meaning anything after the decimal will be truncated.
 * @property {number} "float" - Property may be assigned any number, but will be stored as a
 *   `float`, which may result in a loss of precision.
 * @property {number} "double" - Property may be assigned any number, and will have no loss
 *   of precision.
 * @property {string} "string" - Property value may be any arbitrary string.
 * @property {Date} "date" - Property may be assigned any `Date` instance, but will be stored
 *   with second-level precision (a fix for this is in progress).
 * @property {ArrayBuffer} "data" - Property may either be assigned an `ArrayBuffer`
 *   or `ArrayBufferView` (e.g. `DataView`, `Int8Array`, `Float32Array`, etc.) instance,
 *   but will always be returned as an `ArrayBuffer`.
 * @property {Realm.List} "list" - Property may be assigned any ordered collection
 *   (e.g. `Array`, {@link Realm.List}, {@link Realm.Results}) of objects all matching the
 *   `objectType` specified in the {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Object} "<ObjectType>" - A string that matches the `name` of an object in the
 *   same schema (see {@link Realm~ObjectSchema ObjectSchema}) – this property may be assigned
 *   any object of this type from inside the same Realm, and will always be _optional_
 *   (meaning it may also be assigned `null` or `undefined`).
 */
