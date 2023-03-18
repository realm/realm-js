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

/* eslint getter-return: "off" */

/**
 * A Realm instance represents a Realm database.
 *
 * ```js
 * const Realm = require('realm');
 * ```
 *
 */
class Realm {
  /**
   * Indicates if this Realm contains any objects.
   * @type {boolean}
   * @readonly
   * @since 1.10.0
   */
  get isEmpty() {}

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
  get isReadOnly() {}

  /**
   * A normalized representation of the schema provided in the
   * {@link Realm~Configuration Configuration} when this Realm was constructed.
   * @type {Realm~CanonicalObjectSchema[]}
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
   * Indicates if this Realm has been closed.
   * @type {boolean}
   * @readonly
   * @since 2.1.0
   */
  get isClosed() {}

  /**
   * Gets the sync session if this is a synced Realm
   * @type {Session}
   * @readonly
   */
  get syncSession() {}

  /**
   * Get the latest set of flexible sync subscriptions.
   * @type {Realm.App.Sybc.SubscriptionSet}
   * @throws if flexible sync is not enabled for this app
   * @readonly
   */
  get subscriptions() {}

  /**
   * Create a new `Realm` instance using the provided `config`. If a Realm does not yet exist
   * at `config.path` (or {@link Realm.defaultPath} if not provided), then this constructor
   * will create it with the provided `config.schema` (which is _required_ in this case).
   * Otherwise, the instance will access the existing Realm from the file at that path.
   * In this case, `config.schema` is _optional_ or not have changed, unless
   * `config.schemaVersion` is incremented, in which case the Realm will be automatically
   * migrated to use the new schema.
   * In the case of query-based sync, `config.schema` is required. An exception will be
   * thrown if `config.schema` is not defined.
   * @param {Realm~Configuration} [config] - **Required** when first creating the Realm.
   * @throws {Error} If anything in the provided `config` is invalid.
   * @throws {IncompatibleSyncedRealmError} when an incompatible synced Realm is opened
   */
  constructor(config) {}

  /**
   * Open a Realm asynchronously with a promise. If the Realm is synced, it will be fully
   * synchronized before it is available.
   * In the case of query-based sync, `config.schema` is required. An exception will be
   * thrown if `config.schema` is not defined.
   * @param {Realm~Configuration} config - if no config is defined, it will open the default realm
   * @returns {ProgressPromise} - a promise that will be resolved with the Realm instance when it's available.
   * @throws {Error} If anything in the provided `config` is invalid.
   */
  static open(config) {}

  /**
   * Creates a template object for a Realm model class where all optional fields are `undefined` and all required
   * fields have the default value for the given data type, either the value set by the `default` property in the
   * schema or the default value for the datatype if the schema doesn't specify one, i.e. `0`, false and `""`.
   *
   * @param {Realm~ObjectSchema} schema object describing the class
   */
  static createTemplateObject(objectSchema) {}

  /**
   * Closes this Realm so it may be re-opened with a newer schema version.
   * All objects and collections from this Realm are no longer valid after calling this method.
   * The method is idempotent.
   */
  close() {}

  /**
   * Create a new Realm object of the given type and with the specified properties. For object schemas annotated
   * as asymmetric, no object is returned. The API for asymmetric object schema is subject to changes in the future.
   * @param {Realm~ObjectType} type - The type of Realm object to create.
   * @param {Object} properties - Property values for all required properties without a
   *   default value.
   * @param {boolean|string} [updateMode='never'] - Optional update mode. It can be one of the following values
   *     - 'never': Objects are only created. If an existing object exists, an exception is thrown. This is the
   *       default value.
   *     - 'all': If an existing object is found, all properties provided will be updated, any other properties will
   *       remain unchanged.
   *     - 'modified': If an existing object exists, only properties where the value has actually changed will be
   *       updated. This improves notifications and server side performance but also have implications for how changes
   *       across devices are merged. For most use cases, the behaviour will match the intuitive behaviour of how
   *       changes should be merged, but if updating an entire object is considered an atomic operation, this mode
   *       should not be used.
   * @returns {Realm.Object}
   */
  create(type, properties, updateMode) {}

  /**
   * Deletes the provided Realm object, or each one inside the provided collection.
   * @param {Realm.Object|Realm.Object[]|Realm.List|Realm.Results} object
   */
  delete(object) {}

  /**
   * Deletes a Realm model, including all of its objects.
   * If called outside a migration function, {@link Realm#schema schema} and {@link Realm#schemaVersion schemaVersion} are updated.
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
   * @throws {Error} If type passed into this method is invalid or if the type is marked embedded or asymmetric.
   * @returns {Realm.Results} that will live-update as objects are created and destroyed.
   */
  objects(type) {}

  /**
   * Searches for a Realm object by its primary key.
   * @param {Realm~ObjectType} type - The type of Realm object to search for.
   * @param {number|string} key - The primary key value of the object to search for.
   * @throws {Error} If type passed into this method is invalid or if the object type did
   *   not have a `primaryKey` specified in its {@link Realm~ObjectSchema ObjectSchema}.
   * @returns {Realm.Object|null} if no object is found.
   * @since 0.14.0
   */
  objectForPrimaryKey(type, key) {}

  /**
   * Add a listener `callback` for the specified event `name`.
   * @param {string} name - The name of event that should cause the callback to be called.
   *   _Currently, only the "change" and "schema" events are supported_.
   * @param {callback(Realm, string)|callback(Realm, string, Schema)} callback - Function to be called when a change event occurs.
   *   Each callback will only be called once per event, regardless of the number of times
   *   it was added.
   * @throws {Error} If an invalid event `name` is supplied, or if `callback` is not a function.
   */
  addListener(name, callback) {}

  /**
   * Remove the listener `callback` for the specfied event `name`.
   * @param {string} name - The event name.
   *   _Currently, only the "change" and "schema" events are supported_.
   * @param {callback(Realm, string)|callback(Realm, string, Schema)} callback - Function that was previously added as a
   *   listener for this event through the {@link Realm#addListener addListener} method.
   * @throws {Error} If an invalid event `name` is supplied, or if `callback` is not a function.
   */
  removeListener(name, callback) {}

  /**
   * Remove all event listeners (restricted to the event `name`, if provided).
   * @param {string} [name] - The name of the event whose listeners should be removed.
   *   _Currently, only the "change" and "schema" events are supported_.
   * @throws {Error} When invalid event `name` is supplied
   */
  removeAllListeners(name) {}

  /**
   * Synchronously call the provided `callback` inside a write transaction. If an exception happens inside a transaction,
   * you’ll lose the changes in that transaction, but the Realm itself won’t be affected (or corrupted).
   * More precisely, {@link Realm#beginTransaction beginTransaction()} and {@link Realm#commitTransaction commitTransaction()} will be called
   * automatically. If any exception is thrown during the transaction {@link Realm#cancelTransaction cancelTransaction()} will
   * be called instead of {@link Realm#commitTransaction commitTransaction()} and the exception will be re-thrown to the caller of `write()`.
   *
   * Nested transactions (calling `write()` within `write()`) is not possible.
   * @param {function()} callback
   * @returns {*} Returned value from the callback.
   */
  write(callback) {}

  /**
   * Initiate a write transaction.
   *
   * When doing a transaction, it is highly recommended to do error handling.
   * If you don't handle errors, your data might become inconsistent. Error handling
   * will often involve canceling the transaction.
   *
   * @example
   * realm.beginTransaction();
   * try {
   *   realm.create('Person', { name: 'Arthur Dent',  origin: 'Earth' });
   *   realm.create('Person', { name: 'Ford Prefect', origin: 'Betelgeuse Five' });
   *   realm.commitTransaction();
   * } catch (e) {
   *   realm.cancelTransaction();
   *   throw e;
   * }
   * @throws {Error} When already in write transaction
   * @see {@link Realm#cancelTransaction cancelTransaction()}
   * @see {@link Realm#commitTransaction commitTransaction()}
   */
  beginTransaction() {}

  /**
   * Commit a write transaction.
   *
   * @see {@link Realm#beginTransaction beginTransaction()}
   */
  commitTransaction() {}

  /**
   * Cancel a write transaction.
   *
   * @see {@link Realm#beginTransaction beginTransaction()}
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
   * Writes a compacted copy of the Realm with the given output configuration:
   *   * Input Realms may be local or partition-based synced, encrypted or non-encrypted
   *   * Output Realms will be local or partition-based synced, encrypted or non-encrypted, depending on the configuration passed to the function
   *
   * The destination Realm path cannot already exist.
   *
   * Note that if this method is called from within a write transaction, the current data is written,
   * not the data from the point when the previous write transaction was committed.
   * @param {@link Realm~Configuration | Configuration} config that describes the output Realm.
   */
  writeCopyTo(config) {}

  /**
   * Get the current schema version of the Realm at the given path.
   * @param {string} path - The path to the file where the
   *   Realm database is stored.
   * @param {ArrayBuffer|ArrayBufferView} [encryptionKey] - Required only when
   *   accessing encrypted Realms.
   * @throws {Error} When passing an invalid or non-matching encryption key.
   * @returns {number} version of the schema, or `-1` if no Realm exists at `path`.
   */
  static schemaVersion(path, encryptionKey) {}

  /**
   * Delete the Realm file for the given configuration.
   * @param {Realm~Configuration} config
   * @throws {Error} If anything in the provided `config` is invalid.
   */
  static deleteFile(config) {}

  /**
   * Checks if the Realm already exists on disk.
   * @param {Realm~Configuration} config The configuration for the Realm.
   * @throws {Error} if anything in the provided `config` is invalid.
   * @returns {boolean} returns `true` if the Realm exists on the device, `false` if not.
   */
  static exists(config) {}

  /**
   * Copy any Realm files  (i.e. `*.realm`) bundled with the application from the application
   * directory into the application's documents directory, so that they can be opened and used
   * by Realm. If the file already exists in the documents directory, it will not be
   * overwritten, so this can safely be called multiple times.
   *
   * This should be called before opening the Realm, in order to move the bundled Realm
   * files into a place where they can be written to, for example:
   *
   * ```
   * // Given a bundled file, example.realm, this will copy example.realm (and any other .realm files)
   * // from the app bundle into the app's documents directory. If the file already exists, it will
   * // not be overwritten, so it is safe to call this every time the app starts.
   * Realm.copyBundledRealmFiles();
   *
   * const realm = await Realm.open({
   *   // This will open example.realm from the documents directory, with the bundled data in.
   *   path: "example.realm"
   * });
   * ```
   *
   * This is only implemented for React Native.
   *
   * @throws {Error} If an I/O error occured or method is not implemented.
   */
  static copyBundledRealmFiles() {}
}
/**
 * This describes the different options used to create a {@link Realm} instance.
 *
 * See {@tutorial http-proxy} for details on how use an HTTP forward proxy with this library.
 *
 * @typedef Realm~Configuration
 * @type {Object}
 * @property {ArrayBuffer|ArrayBufferView} [encryptionKey] - The 512-bit (64-byte) encryption
 *   key used to encrypt and decrypt all data in the Realm.
 * @property {callback(Realm, Realm)} [onMigration] - The function to run if a migration is needed.
 *   This function should provide all the logic for converting data models from previous schemas
 *   to the new schema. This option is incompatible with `sync`.
 *   This function takes two arguments:
 *   - `oldRealm` - The Realm before migration is performed.
 *   - `newRealm` - The Realm that uses the latest `schema`, which should be modified as necessary.
 * @property {boolean} [deleteRealmIfMigrationNeeded=false] - Specifies if this Realm should be deleted
 *   if a migration is needed.
 *   This option is not available on synced realms.
 * @property {callback(number, number)} [shouldCompact] - The function called when opening
 *   a Realm for the first time during the life of a process to determine if it should be compacted
 *   before being returned to the user. The function takes two arguments:
 *     - `totalSize` - The total file size (data + free space)
 *     - `usedSize` - The total bytes used by data in the file.
 *   It returns `true` to indicate that an attempt to compact the file should be made. The compaction
 *   will be skipped if another process is accessing it.
 * @property {callback(realm)} [onFirstOpen] - The function called when opening a Realm for
 *   the first time. The function can populate the Realm prior to opening it. When calling the callback,
 *   the Realm will be in a write transaction. The callback takes one argument:
 *     - `realm` - The Realm
 * @property {string} [path={@link Realm.defaultPath}] - The path to the file where the
 *   Realm database should be stored. For synced Realms, a relative path is used together with app id and
 *   user id in order to avoid collisions with other apps or users. An absolute path is left untouched
 *   and on some platforms (iOS and Android) the app might not have permissions to create or open
 *   the file - permissions are not validated. If a relative path is specified, it is relative to
 *   {@link Realm.App~AppConfiguration.syncRootDirectory}.
 * @property {string} [fifoFilesFallbackPath] - Opening a Realm creates a number of FIFO special files in order to
 * coordinate access to the Realm across threads and processes. If the Realm file is stored in a location
 * that does not allow the creation of FIFO special files (e.g. FAT32 filesystems), then the Realm cannot be opened.
 * In that case Realm needs a different location to store these files and this property defines that location.
 * The FIFO special files are very lightweight and the main Realm file will still be stored in the location defined
 * by the `path` property. This property is ignored if the directory defined by `path` allow FIFO special files.
 * @property {boolean} [inMemory=false] - Specifies if this Realm should be opened in-memory. This
 *    still requires a path (can be the default path) to identify the Realm so other processes can
 *    open the same Realm. The file will also be used as swap space if the Realm becomes bigger than
 *    what fits in memory, but it is not persistent and will be removed when the last instance
 *    is closed. This option is incompatible with `sync`.
 * @property {boolean} [readOnly=false] - Specifies if this Realm should be opened as read-only.
 * @property {boolean} [disableFormatUpgrade=false] - Specifies if this Realm's file format should
 *    be automatically upgraded if it was created with an older version of the Realm library.
 *    If set to `true` and a file format upgrade is required, an error will be thrown instead.
 * @property {Array<Realm~ObjectClass|Realm~ObjectSchema>} [schema] - Specifies all the
 *   object types in this Realm. **Required** when first creating a Realm at this `path`.
 *   If omitted, the schema will be read from the existing Realm file.
 * @property {number} [schemaVersion] - **Required** (and must be incremented) after
 *   changing the `schema`.
 * @property {Realm.App.Sync~SyncConfiguration} [sync] - Sync configuration parameters.
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
 * @property {boolean} [embedded] - True if the object type is embedded. An embedded object
 *   can be linked to by at most one parent object. Default value: false.
 * @property {boolean} [asymmetric] - True if the object type is for asymmetric sync only. This implies
 *   that objects of the types are not stored locally and cannot be accessed locally.
 * @property {Object<string, (Realm~PropertyType|Realm~ObjectSchemaProperty|Realm~ObjectSchema)>} properties -
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
 *
 *         setOfStrings: 'string<>',
 *         setOfOptionalStrings: 'string?<>', // or {type: 'set', objectType: 'string'}
 *     }
 * };
 */

/**
 * @typedef Realm~ObjectSchemaProperty
 * @type {Object}
 * @property {Realm~PropertyType} type - The type of this property.
 * @property {Realm~PropertyType} [objectType] - **Required**  when `type` is `"list"`, `"set"`, `"dictionary"` or `"linkingObjects"`,
 *   and must match the type of an object in the same schema, or, for `"list"`, `"set"` or `"dictionary"`,
 *   other type which may be stored as a Realm property.
 * @property {string} [property] - **Required** when `type` is `"linkingObjects"`, and must match
 *   the name of a property on the type specified in `objectType` that links to the type this property belongs to.
 * @property {any} [default] - The default value for this property on creation when not
 *   otherwise specified.
 * @property {boolean} [optional] - Signals if this property may be assigned `null` or `undefined`.
 *   For `"list"`, `"dictionary"` or `"set"` properties of non-object types, this instead signals whether the values inside the list may be assigned `null` or `undefined`.
 *   This is not supported for `"list"` or `"set"` properties of object types and `"linkingObjects"` properties.
 * @property {boolean} [indexed] - Signals if this property should be indexed. Only supported for
 *   `"string"`, `"int"`, and `"bool"` properties.
 * @property {string} [mapTo] - Set this to the name of the underlying property in the Realm file if the Javascript property
 *   name is different than the name used in the Realm file. This can e.g. be used to have different naming convention in
 *   Javascript than what is being used in the Realm file. Reading and writing properties must be done using the public
 *   name. Queries can be done using both the public and the underlying property name.
 */

/**
 * The retreived schema from an open Realm might have a different structure as the input schema.
 * @typedef Realm~CanonicalObjectSchema
 * @type {Object}
 * @property {string} name - Represents the object type.
 * @property {string} [primaryKey] - The name of a `"string"` or `"int"` property
 *   that must be unique across all objects of this type within the same Realm.
 * @property {boolean} [embedded] - True if the object type is embedded. An embedded object
 *   can be linked to by at most one parent object. Default value: false.
 * @property {Object<string, (Realm~PropertyType|Realm~ObjectSchemaProperty|Realm~ObjectSchema)>} properties -
 *   An object where the keys are property names and the values represent the property type.
 */

/**
 * @typedef Realm~CanonicalObjectSchemaProperty
 * @type {Object}
 * @property {string} name - The name of this property.
 * @property {Realm~PropertyType} type - The type of this property.
 * @property {string} [property] - When using `"linkingObjects"` this value will represent the linked property on the linked object
 * @property {boolean} optional - Signals that this property may be assigned `null` or `undefined`.
 *   For `"list"`, `"dictionary"` or `"set"` properties of non-object types, this instead signals whether the values inside the list may be assigned `null` or `undefined`.
 *   This is not supported for `"list"` or `"set"` properties of object types and `"linkingObjects"` properties.
 * @property {boolean} indexed - Signals that this property is indexed. Only supported for
 *   `"string"`, `"int"`, and `"bool"` properties.
 * @property {string} mapTo - The name of the alias this property has been set to.
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
 * (i.e. it can be `null` in addition to the normal values).
 * Given a type, _T_, the following postfix operators may be used:
 *  * _T_ `[]` indicates that the property is a {@linkplain Realm.List} of values with of type _T_
 *  * _T_ `<>` indicated that the property is a {@linkplain Realm.Set} of values with type _T_
 *
 * For example, `optionalIntList: 'int?[]'` declares a property which is a list of
 * nullable integers, while `optionalStringSet: 'string?<>'` declares a set of nullable strings.
 * The property types reported by {@linkplain Realm.Collection collections} and in a Realm's schema will never
 * use these forms.
 *
 * @typedef Realm~PropertyType
 * @type {("bool"|"int"|"float"|"double"|"string"|"decimal128"|"objectId"|"date"|"data"|"list"|"set"|"linkingObjects"|"<ObjectType>")}
 *
 * @property {boolean} "bool" - Property value may either be `true` or `false`.
 * @property {number} "int" - Property may be assigned any number, but will be stored as a
 *   round integer, meaning anything after the decimal will be truncated.
 * @property {number} "float" - Property may be assigned any number, but will be stored as a
 *   `float`, which may result in a loss of precision.
 * @property {number} "double" - Property may be assigned any number, and will have no loss
 *   of precision.
 * @property {string} "string" - Property value may be any arbitrary string.
 * @property {Decimal128} "decimal128" - Property value may be a `Decimal128` object (see `bson` for details).
 * @property {ObjectId} "objectId" - Property valye may be an `ObjectId` object (see `bson` for details).
 * @property {Date} "date" - Property may be assigned any `Date` instance.
 * @property {ArrayBuffer} "data" - Property may either be assigned an `ArrayBuffer`
 *   or `ArrayBufferView` (e.g. `DataView`, `Int8Array`, `Float32Array`, etc.) instance,
 *   but will always be returned as an `ArrayBuffer`.
 * @property {Realm.List} "list" - Property may be assigned any ordered collection
 *   (e.g. `Array`, {@link Realm.List}, {@link Realm.Results}) of objects all matching the
 *   `objectType` specified in the {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Set} "set" - Property may be assigned an array (e.g., `Array`) of objects all matching the
 *   `objectType` specified in the {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Dictionary} "dictionary" - Properties may be assigned to a key/value pair.
 * @property {Realm.Results} "linkingObjects" - Property is read-only and always returns a {@link Realm.Results}
 *   of all the objects matching the `objectType` that are linking to the current object
 *   through the `property` relationship specified in {@link Realm~ObjectSchemaProperty ObjectSchemaProperty}.
 * @property {Realm.Object} "<ObjectType>" - A string that matches the `name` of an object in the
 *   same schema (see {@link Realm~ObjectSchema ObjectSchema}) – this property may be assigned
 *   any object of this type from inside the same Realm, and will always be _optional_
 *   (meaning it may also be assigned `null` or `undefined`).
 */
