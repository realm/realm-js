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
     * Indicates if this Realm is in a write transaction.
     * @type {boolean}
     * @readonly
     * @since 1.10.3
     */
    get isInTransaction() {}

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
     * @throws {IncompatibleSyncedRealmError} when an incompatible synced Realm is opened
     */
    constructor(config) {}

    /**
     * Open a Realm asynchronously with a promise. If the Realm is synced, it will be fully
     * synchronized before it is available.
     * @param {Realm~Configuration} config
     * @returns {ProgressPromise} - a promise that will be resolved with the Realm instance when it's available.
     */
    static open(config) {}

    /**
     * Open a Realm asynchronously with a callback. If the Realm is synced, it will be fully
     * synchronized before it is available.
     * @param {Realm~Configuration} config
     * @param  {callback(error, realm)} - will be called when the Realm is ready.
     * @param  {callback(transferred, transferable)} [progressCallback] - an optional callback for download progress notifications
     * @throws {Error} If anything in the provided `config` is invalid
     * @throws {IncompatibleSyncedRealmError} when an incompatible synced Realm is opened
     */
    static openAsync(config, callback, progressCallback) {}

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
     * Deletes a Realm model, including all of its objects.
     * @param {string} name - the model name
     */
    deleteModel(name) {}

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

    /**
     * Initiate a write transaction.
     * @throws {Error} When already in write transaction
     */
    beginTransaction() {}

    /**
     * Commit a write transaction.
     */
    commitTransaction() {}

    /**
     * Cancel a write transaction.
     */
    cancelTransaction() {}

    /**
     * Replaces all string columns in this Realm with a string enumeration column and compacts the
     * database file.
     *
     * Cannot be called from a write transaction.
     *
     * Compaction will not occur if other `Realm` instances exist.
     *
     * While compaction is in progress, attempts by other threads or processes to open the database will
     * wait.
     *
     * Be warned that resource requirements for compaction is proportional to the amount of live data in
     * the database. Compaction works by writing the database contents to a temporary database file and
     * then replacing the database with the temporary one.
     * @returns {true} if compaction succeeds.
     */
    compact() {}

    /**
     * If the Realm is a partially synchronized Realm, fetch and synchronize the objects
     * of a given object type that match the given query (in string format).
     *
     * **Partial synchronization is a tech preview. Its APIs are subject to change.**
     * @param {Realm~ObjectType} type - The type of Realm objects to retrieve.
     * @param {string} query - Query used to filter objects.
     * @return {Promise} - a promise that will be resolved with the Realm.Results instance when it's available.
     */
    subscribeToObjects(className, query, callback) {}
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
 * Delete the Realm file for the given configuration.
 * @param {Realm~Configuration} config
 * @throws {Error} If anything in the provided `config` is invalid.
 */
Realm.deleteFile = function(config) {};

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
 * @property {boolean} [deleteRealmIfMigrationNeeded=false] - Specifies if this Realm should be deleted
 *   if a migration is needed.
 * @property {callback(number, number)} [shouldCompactOnLaunch] - The function called when opening
 *   a Realm for the first time during the life of a process to determine if it should be compacted
 *   before being returned to the user. The function takes two arguments:
 *     - `totalSize` - The total file size (data + free space)
 *     - `unusedSize` - The total bytes used by data in the file.
 *   It returns `true` to indicate that an attempt to compact the file should be made. The compaction
 *   will be skipped if another process is accessing it.
 * @property {string} [path={@link Realm.defaultPath}] - The path to the file where the
 *   Realm database should be stored.
 * @property {boolean} [inMemory=false] - Specifies if this Realm should be opened in-memory. This
 *    still requires a path (can be the default path) to identify the Realm so other processes can
 *    open the same Realm. The file will also be used as swap space if the Realm becomes bigger than
 *    what fits in memory, but it is not persistent and will be removed when the last instance
 *    is closed.
 * @property {boolean} [readOnly=false] - Specifies if this Realm should be opened as read-only.
 * @property {Array<Realm~ObjectClass|Realm~ObjectSchema>} [schema] - Specifies all the
 *   object types in this Realm. **Required** when first creating a Realm at this `path`.
 *   If omitted, the schema will be read from the existing Realm file.
 * @property {number} [schemaVersion] - **Required** (and must be incremented) after
 *   changing the `schema`.
 * @property {Object} [sync] - Sync configuration parameters with the following
 *   child properties:
 *   - `user` - A `User` object obtained by calling `Realm.Sync.User.login`
 *   - `url` - A `string` which contains a valid Realm Sync url
 *   - `error` - A callback function which is called in error situations.
 *        The `error` callback can take up to four optional arguments: `message`, `isFatal`,
 *        `category`, and `code`.
 *   - `validate_ssl` - Indicating if SSL certificates must be validated
 *   - `ssl_trust_certificate_path` - A path where to find trusted SSL certificates
 *   - `open_ssl_verify_callback` - A callback function used to accept or reject the server's
 *        SSL certificate. open_ssl_verify_callback is called with an object of type
 *        <code>
 *          {
 *            serverAddress: String,
 *            serverPort: Number,
 *            pemCertificate: String,
 *            acceptedByOpenSSL: Boolean,
 *            depth: Number
 *          }
 *        </code>
 *        The return value of open_ssl_verify_callback decides whether the certificate is accepted (true)
 *        or rejected (false). The open_ssl_verify_callback function is only respected on platforms where
 *        OpenSSL is used for the sync client, e.g. Linux. The open_ssl_verify_callback function is not
 *        allowed to throw exceptions. If the operations needed to verify the certificate lead to an exception,
 *        the exception must be caught explicitly before returning. The return value would typically be false
 *        in case of an exception.
 *
 *        When the sync client has received the server's certificate chain, it presents every certificate in
 *        the chain to the open_ssl_verify_callback function. The depth argument specifies the position of the
 *        certificate in the chain. depth = 0 represents the actual server certificate. The root
 *        certificate has the highest depth. The certificate of highest depth will be presented first.
 *
 *        acceptedByOpenSSL is true if OpenSSL has accepted the certificate, and false if OpenSSL has rejected it.
 *        It is generally safe to return true when acceptedByOpenSSL is true. If acceptedByOpenSSL is false, an
 *        independent verification should be made.
 *
 *        One possible way of using the open_ssl_verify_callback function is to embed the known server certificate
 *        in the client and accept the presented certificate if and only if it is equal to the known certificate.
 *
 *        The purpose of open_ssl_verify_callback is to enable custom certificate handling and to solve cases where
 *        OpenSSL erroneously rejects valid certificates possibly because OpenSSL doesn't have access to the
 *        proper trust certificates.
 *   - `partial` - Whether this Realm should be opened in 'partial synchronization' mode.
 *        Partial synchronisation only synchronizes those objects that match the query specified in contrast
 *        to the normal mode of operation that synchronises all objects in a remote Realm.
 *        **Partial synchronization is a tech preview. Its APIs are subject to change.**
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
 *
 * @example
 * let MyClassSchema = {
 *     name: 'MyClass',
 *     primaryKey: 'pk',
 *     properties: {
 *         pk: 'int',
 *         optionalFloatValue: 'float?' // or {type: 'float', optional: true}
 *         listOfStrings: 'string[]',
 *         listOfOptionalDates: 'date?[]',
 *         indexedInt: {type: 'int', indexed: true}
 *
 *         linkToObject: 'MyClass',
 *         listOfObjects: 'MyClass[]', // or {type: 'list', objectType: 'MyClass'}
 *         objectsLinkingToThisObject: {type: 'linkingObjects', objectType: 'MyClass', property: 'linkToObject'}
 *     }
 * };
 */

/**
 * @typedef Realm~ObjectSchemaProperty
 * @type {Object}
 * @property {Realm~PropertyType} type - The type of this property.
 * @property {Realm~PropertyType} [objectType] - **Required**  when `type` is `"list"` or `"linkingObjects"`,
 *   and must match the type of an object in the same schema, or, for `"list"`
 *   only, any other type which may be stored as a Realm property.
 * @property {string} [property] - **Required** when `type` is `"linkingObjects"`, and must match
 *   the name of a property on the type specified in `objectType` that links to the type this property belongs to.
 * @property {any} [default] - The default value for this property on creation when not
 *   otherwise specified.
 * @property {boolean} [optional] - Signals if this property may be assigned `null` or `undefined`.
 *   For `"list"` properties of non-object types, this instead signals whether the values inside the list may be assigned `null` or `undefined`.
 *   This is not supported for `"list"` properties of object types and `"linkingObjects"` properties.
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
 * A property type may be specified as one of the standard builtin types, or as
 * an object type inside the same schema.
 *
 * When specifying property types in an {@linkplain Realm~ObjectSchema object schema}, you
 * may append `?` to any of the property types to indicate that it is optional
 * (i.e. it can be `null` in addition to the normal values) and `[]` to
 * indicate that it is instead a list of that type. For example,
 * `optionalIntList: 'int?[]'` would declare a property which is a list of
 * nullable integers. The property types reported by {@linkplain Realm.Collection
 * collections} and in a Realm's schema will never
 * use these forms.
 *
 * @typedef Realm~PropertyType
 * @type {("bool"|"int"|"float"|"double"|"string"|"date"|"data"|"list"|"linkingObjects"|"<ObjectType>")}
 *
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
