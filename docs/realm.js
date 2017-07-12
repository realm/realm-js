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
    * Indicates if this Realm contains any objects.
    * @type {boolean}
    * @readonly
    * @since 1.10.0
    */
    get empty() {}

    /**
     * The path to the file where this Realm is stored.
     * @type {string}
     * @readonly
     * @since 0.12.0
     */
    get path() {}

    /**
     * Indicates if this Realm was opened as read-only.
     * @type {boolean}
     * @readonly
     * @since 0.12.0
     */
    get readOnly() {}

    /**
     * A normalized representation of the schema provided in the
     * {@link Realm~Configuration Configuration} when this Realm was constructed.
     * @type {Realm~ObjectSchema[]}
     * @readonly
     * @since 0.12.0
     */
    get schema() {}

   /**
    * The current schema version of this Realm.
    * @type {number}
    * @readonly
    * @since 0.12.0
    */
    get schemaVersion() {}

    /**
     * Gets the sync session if this is a synced Realm
     * @type {Session}
     */
    get syncSession() {}

    /**
     * Create a new `Realm` instance using the provided `config`. If a Realm does not yet exist
     * at `config.path` (or {@link Realm.defaultPath} if not provided), then this constructor
     * will create it with the provided `config.schema` (which is _required_ in this case).
     * Otherwise, the instance will access the existing Realm from the file at that path.
     * In this case, `config.schema` is _optional_ or not have changed, unless
     * `config.schemaVersion` is incremented, in which case the Realm will be automatically
     * migrated to use the new schema.
     * @param {Realm~Configuration} [config] - **Required** when first creating the Realm.
     * @throws {Error} If anything in the provided `config` is invalid.
     */
    constructor(config) {}

    /**
     * Open a realm asynchronously with a promise. If the realm is synced, it will be fully 
     * synchronized before it is available.
     * @param {Realm~Configuration} config 
     * @returns {Promise} - a promise that will be resolved with the realm instance when it's available.
     */
    static open(config) {}

    /**
     * Open a realm asynchronously with a callback. If the realm is synced, it will be fully 
     * synchronized before it is available.
     * @param {Realm~Configuration} config 
     * @param  {callback(error, realm)} - will be called when the realm is ready.
     * @throws {Error} If anything in the provided `config` is invalid.
     */
    static openAsync(config, callback) {}

    /**
     * Closes this Realm so it may be re-opened with a newer schema version.
     * All objects and collections from this Realm are no longer valid after calling this method.
     */
    close() {}

    /**
     * Create a new Realm object of the given type and with the specified properties.
     * @param {Realm~ObjectType} type - The type of Realm object to create.
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
     * Returns all objects of the given `type` in the Realm.
     * @param {Realm~ObjectType} type - The type of Realm objects to retrieve.
     * @throws {Error} If type passed into this method is invalid.
     * @returns {Realm.Results} that will live-update as objects are created and destroyed.
     */
    objects(type) {}

    /**
     * Searches for a Realm object by its primary key.
     * @param {Realm~ObjectType} type - The type of Realm object to search for.
     * @param {number|string} key - The primary key value of the object to search for.
     * @throws {Error} If type passed into this method is invalid or if the object type did
     *   not have a `primaryKey` specified in its {@link Realm~ObjectSchema ObjectSchema}.
     * @returns {Realm.Object|undefined} if no object is found.
     * @since 0.14.0
     */
    objectForPrimaryKey(type, key) {}

    /**
     * Add a listener `callback` for the specified event `name`.
     * @param {string} name - The name of event that should cause the callback to be called.
     *   _Currently, only the "change" event supported_.
     * @param {callback(Realm, string)} callback - Function to be called when the event occurs.
     *   Each callback will only be called once per event, regardless of the number of times
     *   it was added.
     * @throws {Error} If an invalid event `name` is supplied, or if `callback` is not a function.
     */
    addListener(name, callback) {}

   /**
    * Remove the listener `callback` for the specfied event `name`.
    * @param {string} name - The event name.
    *   _Currently, only the "change" event supported_.
    * @param {callback(Realm, string)} callback - Function that was previously added as a
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
 * Get the current schema version of the Realm at the given path.
 * @param {string} path - The path to the file where the
 *   Realm database is stored.
 * @param {ArrayBuffer|ArrayBufferView} [encryptionKey] - Required only when
 *   accessing encrypted Realms.
 * @throws {Error} When passing an invalid or non-matching encryption key.
 * @returns {number} version of the schema, or `-1` if no Realm exists at `path`.
 */
Realm.schemaVersion = function(path, encryptionKey) {};

/**
 * The default path where to create and access the Realm file.
 * @type {string}
 */
Realm.defaultPath;

/**
 * This describes the different options used to create a {@link Realm} instance.
 * @typedef Realm~Configuration
 * @type {Object}
 * @property {ArrayBuffer|ArrayBufferView} [encryptionKey] - The 512-bit (64-byte) encryption
 *   key used to encrypt and decrypt all data in the Realm.
 * @property {callback(Realm, Realm)} [migration] - The function to run if a migration is needed.
 *   This function should provide all the logic for converting data models from previous schemas
 *   to the new schema.
 *   This function takes two arguments:
 *   - `oldRealm` - The Realm before migration is performed.
 *   - `newRealm` - The Realm that uses the latest `schema`, which should be modified as necessary.
 * @property {string} [path={@link Realm.defaultPath}] - The path to the file where the
 *   Realm database should be stored.
 * @property {boolean} [readOnly=false] - Specifies if this Realm should be opened as read-only.
 * @property {Array<Realm~ObjectClass|Realm~ObjectSchema>} [schema] - Specifies all the
 *   object types in this Realm. **Required** when first creating a Realm at this `path`.
 * @property {number} [schemaVersion] - **Required** (and must be incremented) after
 *   changing the `schema`.
 * @property {Object} [sync] - Sync configuration parameters with the following 
 *   child properties:
 *   - `user` - A `User` object obtained by calling `Realm.Sync.User.login`
 *   - `url` - A `string` which contains a valid Realm Sync url   
 */

/**
 * Realm objects will inherit methods, getters, and setters from the `prototype` of this
 * constructor. It is **highly recommended** that this constructor inherit from
 * {@link Realm.Object}.
 * @typedef Realm~ObjectClass
 * @type {Class}
 * @property {Realm~ObjectSchema} schema - Static property specifying object schema information.
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
 * @property {string} [objectType] - **Required**  when `type` is `"list"` or `"linkingObjects"`,
 *   and must match the type of an object in the same schema.
 * @property {string} [property] - **Required** when `type` is `"linkingObjects"`, and must match
 *   the name of a property on the type specified in `objectType` that links to the type this property belongs to.
 * @property {any} [default] - The default value for this property on creation when not
 *   otherwise specified.
 * @property {boolean} [optional] - Signals if this property may be assigned `null` or `undefined`.
 * @property {boolean} [indexed] - Signals if this property should be indexed. Only supported for
 *   `"string"`, `"int"`, and `"bool"` properties. 
 */

/**
 * The type of an object may either be specified as a string equal to the `name` in a
 * {@link Realm~ObjectSchema ObjectSchema} definition, **or** a constructor that was specified
 * in the {@link Realm~Configuration configuration} `schema`.
 * @typedef Realm~ObjectType
 * @type {string|Realm~ObjectClass}
 */

/**
 * A property type may be specified as one of the standard builtin types, or as an object type
 * inside the same schema.
 * @typedef Realm~PropertyType
 * @type {("bool"|"int"|"float"|"double"|"string"|"date"|"data"|"list"|"linkingObjects"|"<ObjectType>")}
 * @property {boolean} "bool" - Property value may either be `true` or `false`.
 * @property {number} "int" - Property may be assigned any number, but will be stored as a
 *   round integer, meaning anything after the decimal will be truncated.
 * @property {number} "float" - Property may be assigned any number, but will be stored as a
 *   `float`, which may result in a loss of precision.
 * @property {number} "double" - Property may be assigned any number, and will have no loss
 *   of precision.
 * @property {string} "string" - Property value may be any arbitrary string.
 * @property {Date} "date" - Property may be assigned any `Date` instance.
 * @property {ArrayBuffer} "data" - Property may either be assigned an `ArrayBuffer`
 *   or `ArrayBufferView` (e.g. `DataView`, `Int8Array`, `Float32Array`, etc.) instance,
 *   but will always be returned as an `ArrayBuffer`.
 * @property {Realm.List} "list" - Property may be assigned any ordered collection
 *   (e.g. `Array`, {@link Realm.List}, {@link Realm.Results}) of objects all matching the
 *   `objectType` specified in the {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Results} "linkingObjects" - Property is read-only and always returns a {@link Realm.Results}
 *   of all the objects matching the `objectType` that are linking to the current object
 *   through the `property` relationship specified in {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Object} "<ObjectType>" - A string that matches the `name` of an object in the
 *   same schema (see {@link Realm~ObjectSchema ObjectSchema}) – this property may be assigned
 *   any object of this type from inside the same Realm, and will always be _optional_
 *   (meaning it may also be assigned `null` or `undefined`).
 */
