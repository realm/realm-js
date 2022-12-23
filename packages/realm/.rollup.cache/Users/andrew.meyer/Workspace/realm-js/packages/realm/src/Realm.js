////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { ApiKeyAuthClient, App, BSON, ClassMap, Collection, Credentials, Dictionary, EmailPasswordAuthClient, INTERNAL, List, OrderedCollection, ProgressRealmPromise, RealmEvent, RealmListeners, RealmObject, RealmSet, Results, SyncSession, TypeAssertionError, Types, UpdateMode, User, assert, binding, extendDebug, fromBindingRealmSchema, fs, normalizeObjectSchema, normalizeRealmSchema, toArrayBuffer, toBindingSchema, toBindingSyncConfig, validateConfiguration, validateObjectSchema, validateRealmSchema, } from "./internal";
const debug = extendDebug("Realm");
// Using a set of weak refs to avoid prevention of garbage collection
const RETURNED_REALMS = new Set();
const NOT_VERSIONED = 18446744073709551615n;
/**
 * Asserts the event passed as string is a valid RealmEvent value.
 * @throws {@link TypeAssertionError} If an unexpected name is passed via {@link name}.
 * @param name The name of the event.
 * @internal
 */
function assertRealmEvent(name) {
    const values = Object.values(RealmEvent);
    if (!values.includes(name)) {
        throw new TypeAssertionError("One of " + values.join(", "), name);
    }
}
export class Realm {
    static Object = RealmObject;
    static Collection = Collection;
    static OrderedCollection = OrderedCollection;
    static Results = Results;
    static List = List;
    static Dictionary = Dictionary;
    static Set = RealmSet;
    static App = App;
    static UpdateMode = UpdateMode;
    static BSON = BSON;
    static Types = Types;
    static User = User;
    static Credentials = Credentials;
    static Auth = { EmailPasswordAuth: EmailPasswordAuthClient, ApiKeyAuth: ApiKeyAuthClient };
    static defaultPath = Realm.normalizePath("default.realm");
    /**
     * Clears the state by closing and deleting any Realm in the default directory and logout all users.
     * @private Not a part of the public API: It's primarily used from the library's tests.
     */
    static clearTestState() {
        // Close any realms not already closed
        for (const weakRealm of RETURNED_REALMS) {
            const realm = weakRealm.deref();
            if (realm && !realm.isClosed) {
                realm.close();
            }
        }
        RETURNED_REALMS.clear();
        binding.RealmCoordinator.clearAllCaches();
        // Delete all Realm files in the default directory
        const defaultDirectoryPath = fs.getDefaultDirectoryPath();
        for (const dirent of fs.readDirectory(defaultDirectoryPath)) {
            const direntPath = fs.joinPaths(defaultDirectoryPath, dirent.name);
            if (dirent.isDirectory() && dirent.name.endsWith(".realm.management")) {
                fs.removeDirectory(direntPath);
            }
            else if (dirent.name.endsWith(".realm") ||
                dirent.name.endsWith(".realm.note") ||
                dirent.name.endsWith(".realm.lock") ||
                dirent.name.endsWith(".realm.log")) {
                fs.removeFile(direntPath);
            }
        }
        binding.App.clearCachedApps();
    }
    /**
     * Delete the Realm file for the given configuration.
     * @param config The configuration for the Realm
     * @throws {@link Error} If anything in the provided {@link config} is invalid.
     */
    static deleteFile(config) {
        const path = Realm.determinePath(config);
        fs.removeFile(path);
        fs.removeFile(path + ".lock");
        fs.removeFile(path + ".note");
        fs.removeDirectory(path + ".management");
    }
    /**
     * Checks if the Realm already exists on disk.
     * @param arg The configuration for the Realm or the path to it.
     * @throws {@link Error} If anything in the provided {@link config} is invalid.
     * @returns `true` if the Realm exists on the device, `false` if not.
     */
    static exists(arg = {}) {
        const config = typeof arg === "string" ? { path: arg } : arg;
        validateConfiguration(config);
        const path = Realm.determinePath(config);
        return fs.exists(path);
    }
    /**
     * Open a Realm asynchronously with a promise. If the Realm is synced, it will be fully
     * synchronized before it is available.
     * In the case of query-based sync, {@link Configuration.scheme | config.schema} is required. An exception will be
     * thrown if {@link Configuration.scheme | config.schema} is not defined.
     * @param arg The configuration for the Realm or the path to it.
     * @returns A promise that will be resolved with the Realm instance when it's available.
     * @throws {@link Error} If anything in the provided {@link arg} is invalid.
     */
    static open(arg = {}) {
        const config = typeof arg === "string" ? { path: arg } : arg;
        return new ProgressRealmPromise(config);
    }
    /**
     * Get the current schema version of the Realm at the given path.
     * @param path The path to the file where the
     *   Realm database is stored.
     * @param encryptionKey Required only when
     *   accessing encrypted Realms.
     * @throws {@link Error} If passing an invalid or non-matching encryption key.
     * @returns Version of the schema, or `-1` if no Realm exists at {@link path}.
     */
    static schemaVersion(path, encryptionKey) {
        const config = { path };
        const absolutePath = Realm.determinePath(config);
        const schemaVersion = binding.Realm.getSchemaVersion({
            path: absolutePath,
            encryptionKey: Realm.determineEncryptionKey(encryptionKey),
        });
        if (schemaVersion === NOT_VERSIONED) {
            return -1;
        }
        else {
            return Number(schemaVersion);
        }
    }
    /**
     * Creates a template object for a Realm model class where all optional fields are undefined
     * and all required fields have the default value for the given data type, either the value
     * set by the default property in the schema or the default value for the datatype if the schema
     * doesn't specify one, i.e. 0, false and "".
     *
     * @param objectSchema Schema describing the object that should be created.
     */
    static createTemplateObject(objectSchema) {
        validateObjectSchema(objectSchema);
        const normalizedSchema = normalizeObjectSchema(objectSchema);
        const result = {};
        for (const [key, property] of Object.entries(normalizedSchema.properties)) {
            // If a default value is explicitly set, always set the property
            if (typeof property.default !== "undefined") {
                result[key] = property.default;
                continue;
            }
            // if optional is set, it wil take precedence over any `?` set on the type parameter
            if (property.optional) {
                continue;
            }
            // Set the default value for all required primitive types.
            // Lists are always treated as empty if not specified and references to objects are always optional
            switch (property.type) {
                case "bool":
                    result[key] = false;
                    break;
                case "int":
                    result[key] = 0;
                    break;
                case "float":
                    result[key] = 0.0;
                    break;
                case "double":
                    result[key] = 0.0;
                    break;
                case "string":
                    result[key] = "";
                    break;
                case "data":
                    result[key] = new ArrayBuffer(0);
                    break;
                case "date":
                    result[key] = new Date(0);
                    break;
            }
        }
        return result;
    }
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
     * @throws {@link Error} If an I/O error occured or method is not implemented.
     */
    static copyBundledRealmFiles() {
        fs.copyBundledRealmFiles();
    }
    static normalizePath(path) {
        if (typeof path === "undefined") {
            return Realm.defaultPath;
        }
        else if (path.length === 0) {
            throw new Error("Unexpected empty path");
        }
        else if (fs.isAbsolutePath(path)) {
            return path;
        }
        else {
            return fs.joinPaths(fs.getDefaultDirectoryPath(), path);
        }
    }
    static determinePath(config) {
        if (config.path || !config.sync) {
            return Realm.normalizePath(config.path);
        }
        else {
            // TODO: Determine if it's okay to get the syncManager through the app instead of the user:
            // return user->m_user->sync_manager()->path_for_realm(*(config.sync_config));
            const bindingSyncConfig = toBindingSyncConfig(config.sync);
            return config.sync.user.app.internal.syncManager.pathForRealm(bindingSyncConfig);
        }
    }
    static determineEncryptionKey(encryptionKey) {
        if (typeof encryptionKey === "undefined") {
            return encryptionKey;
        }
        else {
            return toArrayBuffer(encryptionKey, false);
        }
    }
    static extractSchemaExtras(schemas) {
        return Object.fromEntries(schemas.map((schema) => {
            const defaults = Object.fromEntries(Object.entries(schema.properties).map(([name, property]) => {
                return [name, property.default];
            }));
            return [schema.name, { defaults, constructor: schema.constructor }];
        }));
    }
    /** @internal */
    static transformConfig(config) {
        const normalizedSchema = config.schema && normalizeRealmSchema(config.schema);
        const schemaExtras = Realm.extractSchemaExtras(normalizedSchema || []);
        const path = Realm.determinePath(config);
        const { fifoFilesFallbackPath, shouldCompact, inMemory } = config;
        const bindingSchema = normalizedSchema && toBindingSchema(normalizedSchema);
        return {
            schemaExtras,
            bindingConfig: {
                path,
                cache: true,
                fifoFilesFallbackPath,
                schema: bindingSchema,
                inMemory: inMemory === true,
                schemaMode: Realm.determineSchemaMode(config),
                schemaVersion: config.schema
                    ? typeof config.schemaVersion === "number"
                        ? BigInt(config.schemaVersion)
                        : 0n
                    : undefined,
                migrationFunction: config.onMigration ? Realm.wrapMigration(schemaExtras, config.onMigration) : undefined,
                shouldCompactOnLaunchFunction: shouldCompact
                    ? (totalBytes, usedBytes) => {
                        return shouldCompact(Number(totalBytes), Number(usedBytes));
                    }
                    : undefined,
                disableFormatUpgrade: config.disableFormatUpgrade,
                encryptionKey: Realm.determineEncryptionKey(config.encryptionKey),
                syncConfig: config.sync ? toBindingSyncConfig(config.sync) : undefined,
            },
        };
    }
    static determineSchemaMode(config) {
        const { readOnly, deleteRealmIfMigrationNeeded, onMigration, sync } = config;
        assert(!readOnly || !deleteRealmIfMigrationNeeded, "Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.");
        assert(!onMigration || !deleteRealmIfMigrationNeeded, "Cannot set 'deleteRealmIfMigrationNeeded' when 'onMigration' is set.");
        if (readOnly) {
            return 1 /* binding.SchemaMode.Immutable */;
        }
        else if (deleteRealmIfMigrationNeeded) {
            return 3 /* binding.SchemaMode.SoftResetFile */;
        }
        else if (sync) {
            return 6 /* binding.SchemaMode.AdditiveExplicit */;
        }
        else {
            return undefined;
        }
    }
    static wrapMigration(schemaExtras, onMigration) {
        return (oldRealmInternal, newRealmInternal) => {
            try {
                const oldRealm = new Realm(oldRealmInternal, schemaExtras);
                const newRealm = new Realm(newRealmInternal, schemaExtras);
                onMigration(oldRealm, newRealm);
            }
            finally {
                oldRealmInternal.close();
                oldRealmInternal.$resetSharedPtr();
                newRealmInternal.$resetSharedPtr();
            }
        };
    }
    /**
     * The Realms's representation in the binding.
     * @internal
     */
    internal;
    /**
     * The sync session if this is a synced Realm
     */
    syncSession;
    schemaExtras = {};
    classes;
    changeListeners = new RealmListeners(this, RealmEvent.Change);
    beforeNotifyListeners = new RealmListeners(this, RealmEvent.BeforeNotify);
    schemaListeners = new RealmListeners(this, RealmEvent.Schema);
    constructor(arg = {}, secondArg) {
        if (arg instanceof binding.Realm) {
            this.schemaExtras = (secondArg ?? {});
            this.internal = arg;
        }
        else {
            const config = typeof arg === "string" ? { path: arg } : arg;
            validateConfiguration(config);
            const { bindingConfig, schemaExtras } = Realm.transformConfig(config);
            debug("open", bindingConfig);
            this.schemaExtras = schemaExtras;
            assert(!secondArg || secondArg instanceof binding.Realm, "The realm constructor only takes a single argument");
            this.internal = secondArg ?? binding.Realm.getSharedRealm(bindingConfig);
            binding.Helpers.setBindingContext(this.internal, {
                didChange: (r) => {
                    r.verifyOpen();
                    this.changeListeners.callback();
                },
                schemaDidChange: (r) => {
                    r.verifyOpen();
                    this.schemaListeners.callback();
                },
                beforeNotify: (r) => {
                    r.verifyOpen();
                    this.beforeNotifyListeners.callback();
                },
            });
            RETURNED_REALMS.add(new WeakRef(this.internal));
        }
        Object.defineProperties(this, {
            classes: {
                enumerable: false,
                configurable: false,
                writable: true,
            },
            internal: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
        });
        this.classes = new ClassMap(this, this.internal.schema, this.schema);
        const syncSession = this.internal.syncSession;
        this.syncSession = syncSession ? new SyncSession(syncSession) : null;
    }
    /**
     * Indicates if this Realm contains any objects.
     * @readonly
     * @since 1.10.0
     */
    get isEmpty() {
        return binding.Helpers.isEmptyRealm(this.internal);
    }
    /**
     * The path to the file where this Realm is stored.
     * @readonly
     * @since 0.12.0
     */
    get path() {
        return this.internal.config.path;
    }
    /**
     * Indicates if this Realm was opened as read-only.
     * @readonly
     * @since 0.12.0
     */
    get isReadOnly() {
        return this.internal.config.schemaMode === 1 /* binding.SchemaMode.Immutable */;
    }
    /**
     * Indicates if this Realm was opened in-memory.
     * @readonly
     */
    get isInMemory() {
        return this.internal.config.inMemory;
    }
    /**
     * A normalized representation of the schema provided in the {@link Configuration} when this Realm was constructed.
     * @readonly
     * @since 0.12.0
     */
    get schema() {
        const schemas = fromBindingRealmSchema(this.internal.schema);
        // Stitch in the constructors and defaults stored in this.schemaExtras
        for (const objectSchema of schemas) {
            const extras = this.schemaExtras[objectSchema.name];
            if (extras) {
                objectSchema.constructor = extras.constructor;
            }
            for (const property of Object.values(objectSchema.properties)) {
                property.default = extras ? extras.defaults[property.name] : undefined;
            }
        }
        return schemas;
    }
    /**
     * The current schema version of the Realm.
     * @readonly
     * @since 0.12.0
     */
    get schemaVersion() {
        return Number(this.internal.schemaVersion);
    }
    /**
     * Indicates if this Realm is in a write transaction.
     * @readonly
     * @since 1.10.3
     */
    get isInTransaction() {
        // TODO: Consider keeping a local state in JS for this
        return this.internal.isInTransaction;
    }
    /**
     * Indicates if this Realm has been closed.
     * @readonly
     * @since 2.1.0
     */
    get isClosed() {
        // TODO: Consider keeping a local state in JS for this
        return this.internal.isClosed;
    }
    /**
     * The latest set of flexible sync subscriptions.
     * @throws {@link Error} If flexible sync is not enabled for this app
     */
    get subscriptions() {
        throw new Error("Not yet implemented");
    }
    /**
     * Closes this Realm so it may be re-opened with a newer schema version.
     * All objects and collections from this Realm are no longer valid after calling this method.
     * The method is idempotent.
     */
    close() {
        this.internal.close();
        this.syncSession?.resetInternal();
    }
    create(type, values, mode = UpdateMode.Never) {
        // Supporting a boolean overload for mode
        if (mode === true) {
            mode = UpdateMode.All;
        }
        else if (mode === false) {
            mode = UpdateMode.Never;
        }
        // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1260-L1321
        if (values instanceof RealmObject && !values[INTERNAL]) {
            throw new Error("Cannot create an object from a detached Realm.Object instance");
        }
        if (!Object.values(UpdateMode).includes(mode)) {
            throw new Error("Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.");
        }
        this.internal.verifyOpen();
        const helpers = this.classes.getHelpers(type);
        return RealmObject.create(this, values, mode, { helpers });
    }
    /**
     * Deletes the provided Realm object, or each one inside the provided collection.
     */
    delete(subject) {
        assert.inTransaction(this, "Can only delete objects within a transaction.");
        assert.object(subject, "subject");
        if (subject instanceof RealmObject) {
            const { objectSchema } = this.classes.getHelpers(subject);
            const obj = subject[INTERNAL];
            assert.isValid(obj, "Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.");
            const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
            table.removeObject(obj.key);
        }
        else if (subject instanceof List) {
            subject.internal.deleteAll();
        }
        else if (subject instanceof Results) {
            subject.internal.clear();
        }
        else if (Array.isArray(subject) || Symbol.iterator in subject) {
            for (const object of subject) {
                assert.instanceOf(object, RealmObject);
                const { objectSchema } = this.classes.getHelpers(object);
                const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
                table.removeObject(object[INTERNAL].key);
            }
        }
        else {
            throw new Error("Can only delete objects, lists and results.");
        }
    }
    /**
     * Deletes a Realm model, including all of its objects.
     * If called outside a migration function, {@link schema} and {@link schemaVersion} are updated.
     * @param name The model name
     */
    deleteModel(name) {
        assert.inTransaction(this, "Can only delete objects within a transaction.");
        binding.Helpers.deleteDataForObject(this.internal, name);
        if (!this.internal.isInMigration) {
            const newSchema = this.internal.schema.filter((objectSchema) => objectSchema.name !== name);
            this.internal.updateSchema(newSchema, this.internal.schemaVersion + 1n, null, null, true);
        }
    }
    /**
     * **WARNING:** This will delete **all** objects in the Realm!
     */
    deleteAll() {
        assert.inTransaction(this, "Can only delete objects within a transaction.");
        for (const objectSchema of this.internal.schema) {
            const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
            table.clear();
        }
    }
    objectForPrimaryKey(type, primaryKey) {
        // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1240-L1258
        const { objectSchema, properties, wrapObject } = this.classes.getHelpers(type);
        if (!objectSchema.primaryKey) {
            throw new Error(`Expected a primary key on '${objectSchema.name}'`);
        }
        const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
        const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey, undefined);
        try {
            const objKey = table.findPrimaryKey(value);
            // This relies on the JS represenation of an ObjKey being a bigint
            if (binding.isEmptyObjKey(objKey)) {
                return null;
            }
            else {
                const obj = table.getObject(objKey);
                return wrapObject(obj);
            }
        }
        catch (err) {
            // TODO: Match on something else than the error message, when exposed by the binding
            if (err instanceof Error && err.message.startsWith("No object with key")) {
                throw new Error(`No '${objectSchema.name}' with key '${primaryKey}'`);
            }
            else {
                throw err;
            }
        }
    }
    _objectForObjectKey(type, objectKey) {
        const { objectSchema, wrapObject } = this.classes.getHelpers(type);
        const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
        try {
            const objKey = binding.stringToObjKey(objectKey);
            const obj = table.tryGetObject(objKey);
            const result = wrapObject(obj);
            return result === null ? undefined : result;
        }
        catch (err) {
            if (err instanceof binding.InvalidObjKey) {
                return undefined;
            }
            else {
                throw err;
            }
        }
    }
    objects(type) {
        const { objectSchema, wrapObject } = this.classes.getHelpers(type);
        if (objectSchema.tableType === 1 /* binding.TableType.Embedded */) {
            throw new Error("You cannot query an embedded object.");
        }
        else if (objectSchema.tableType === 2 /* binding.TableType.TopLevelAsymmetric */) {
            throw new Error("You cannot query an asymmetric class.");
        }
        const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
        const results = binding.Results.fromTable(this.internal, table);
        return new Results(this, results, {
            get(results, index) {
                return results.getObj(index);
            },
            fromBinding: wrapObject,
            toBinding(value) {
                assert.instanceOf(value, RealmObject);
                return value[INTERNAL];
            },
        });
    }
    /**
     * Add a listener {@link callback} for the specified {@link eventName}.
     * @param eventName The name of event that should cause the callback to be called.
     * @param callback Function to be called when a change event occurs.
     *   Each callback will only be called once per event, regardless of the number of times
     *   it was added.
     * @throws {@link Error} If an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
     */
    addListener(eventName, callback) {
        assert.open(this);
        assert.function(callback);
        if (eventName === "change") {
            this.changeListeners.add(callback);
        }
        else if (eventName === "schema") {
            this.schemaListeners.add(callback);
        }
        else if (eventName === "beforenotify") {
            this.beforeNotifyListeners.add(callback);
        }
        else {
            throw new Error(`Unknown event name '${eventName}': only 'change', 'schema' and 'beforenotify' are supported.`);
        }
    }
    /**
     * Remove the listener {@link callback} for the specfied event {@link eventName}.
     * @param eventName The event name.
     * @param callback Function that was previously added as a listener for this event through the {@link addListener} method.
     * @throws {@link Error} If an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
     */
    removeListener(eventName, callback) {
        assert.open(this);
        assert.function(callback);
        assertRealmEvent(eventName);
        if (eventName === RealmEvent.Change) {
            this.changeListeners.remove(callback);
        }
        else if (eventName === RealmEvent.Schema) {
            this.schemaListeners.remove(callback);
        }
        else if (eventName === RealmEvent.BeforeNotify) {
            this.beforeNotifyListeners.remove(callback);
        }
        else {
            throw assert.never(eventName, "eventName");
        }
    }
    /**
     * Remove all event listeners (restricted to the event {@link eventName}, if provided).
     * @param eventName The name of the event whose listeners should be removed.
     * @throws {@link Error} When invalid event {@link eventName} is supplied
     */
    removeAllListeners(eventName) {
        assert.open(this);
        if (typeof eventName === "undefined") {
            this.changeListeners.removeAll();
            this.schemaListeners.removeAll();
            this.beforeNotifyListeners.removeAll();
        }
        else {
            assert.string(eventName, "eventName");
            assertRealmEvent(eventName);
            if (eventName === RealmEvent.Change) {
                this.changeListeners.removeAll();
            }
            else if (eventName === RealmEvent.Schema) {
                this.schemaListeners.removeAll();
            }
            else if (eventName === RealmEvent.BeforeNotify) {
                this.beforeNotifyListeners.removeAll();
            }
            else {
                throw assert.never(eventName, "eventName");
            }
        }
    }
    /**
     * Synchronously call the provided {@link callback} inside a write transaction. If an exception happens inside a transaction,
     * you’ll lose the changes in that transaction, but the Realm itself won’t be affected (or corrupted).
     * More precisely, {@link beginTransaction} and {@link commitTransaction} will be called
     * automatically. If any exception is thrown during the transaction {@link cancelTransaction} will
     * be called instead of {@link commitTransaction} and the exception will be re-thrown to the caller of {@link write}.
     *
     * Nested transactions (calling {@link write} within {@link write}) is not possible.
     * @returns Returned value from the callback.
     */
    write(callback) {
        let result = undefined;
        this.internal.beginTransaction();
        try {
            result = callback();
        }
        catch (err) {
            this.internal.cancelTransaction();
            throw err;
        }
        this.internal.commitTransaction();
        return result;
    }
    /**
     * Initiate a write transaction.
     *
     * When doing a transaction, it is highly recommended to do error handling.
     * If you don't handle errors, your data might become inconsistent. Error handling
     * will often involve canceling the transaction.
     *
     * @throws {@link Error} If already in write transaction
     * @see {@link cancelTransaction}
     * @see {@link commitTransaction}
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
     */
    beginTransaction() {
        this.internal.beginTransaction();
    }
    /**
     * Commit a write transaction.
     *
     * @see {@link beginTransaction}
     */
    commitTransaction() {
        this.internal.commitTransaction();
    }
    /**
     * Cancel a write transaction.
     *
     * @see {@link beginTransaction}
     */
    cancelTransaction() {
        this.internal.cancelTransaction();
    }
    /**
     * Replaces all string columns in this Realm with a string enumeration column and compacts the
     * database file.
     *
     * Cannot be called from a write transaction.
     *
     * Compaction will not occur if other {@link Realm} instances exist.
     *
     * While compaction is in progress, attempts by other threads or processes to open the database will
     * wait.
     *
     * Be warned that resource requirements for compaction is proportional to the amount of live data in
     * the database. Compaction works by writing the database contents to a temporary database file and
     * then replacing the database with the temporary one.
     * @returns `true` if compaction succeeds, `false` if not.
     */
    compact() {
        assert.outTransaction(this, "Cannot compact a Realm within a transaction.");
        return this.internal.compact();
    }
    /**
     * Writes a compacted copy of the Realm with the given configuration.
     *
     * The destination file cannot already exist.
     * All conversions between synced and non-synced Realms are supported, and will be
     * performed according to the {@link config} parameter, which describes the desired output.
     *
     * Note that if this method is called from within a write transaction, the current data is written,
     * not the data from the point when the previous write transaction was committed.
     * @param config Realm configuration that describes the output realm.
     */
    writeCopyTo(config) {
        assert.outTransaction(this, "Can only convert Realms outside a transaction.");
        validateConfiguration(config);
        const { bindingConfig } = Realm.transformConfig(config);
        this.internal.convert(bindingConfig);
    }
    /**
     * Update the schema of the Realm.
     *
     * @param schema The schema which the Realm should be updated to use.
     * @internal Consider passing a {@link schema} when constructing the {@link Realm} instead.
     */
    _updateSchema(schema) {
        validateRealmSchema(schema);
        const normalizedSchema = normalizeRealmSchema(schema);
        const bindingSchema = toBindingSchema(normalizedSchema);
        if (!this.isInTransaction) {
            throw new Error("Can only create object schema within a transaction.");
        }
        this.internal.updateSchema(bindingSchema, this.internal.schemaVersion + 1n, null, null, true);
        this.classes = new ClassMap(this, this.internal.schema, this.schema);
    }
    /**
     * @internal
     */
    getClassHelpers(arg) {
        return this.classes.getHelpers(arg);
    }
}
//# sourceMappingURL=Realm.js.map