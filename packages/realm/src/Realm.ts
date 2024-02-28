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

import {
  AnyList,
  AnyRealmObject,
  AnyResults,
  CanonicalObjectSchema,
  ClassHelpers,
  ClassMap,
  Configuration,
  Constructor,
  DefaultObject,
  INTERNAL,
  InitialSubscriptions,
  List,
  LogCategory,
  LogLevel,
  LogOptions,
  LoggerCallback,
  LoggerCallback1,
  LoggerCallback2,
  MigrationCallback,
  ObjectSchema,
  ProgressRealmPromise,
  REALM,
  RealmEvent,
  RealmListenerCallback,
  RealmListeners,
  RealmObject,
  RealmObjectConstructor,
  Results,
  SubscriptionSet,
  SyncSession,
  TypeAssertionError,
  Unmanaged,
  UpdateMode,
  assert,
  binding,
  defaultLogger,
  defaultLoggerLevel,
  extendDebug,
  flags,
  fromBindingLoggerLevelToLogLevel,
  fromBindingRealmSchema,
  fs,
  normalizeObjectSchema,
  normalizeRealmSchema,
  toArrayBuffer,
  toBindingLoggerLevel,
  toBindingSchema,
  toBindingSyncConfig,
  validateConfiguration,
  validateObjectSchema,
  validateRealmSchema,
} from "./internal";

const debug = extendDebug("Realm");

type RealmSchemaExtra = Record<string, ObjectSchemaExtra | undefined>;

type ObjectSchemaExtra = {
  constructor?: RealmObjectConstructor;
  defaults: Record<string, unknown>;
  // objectTypes: Record<string, unknown>;
};

export type RealmEventName = "change" | "schema" | "beforenotify";

/**
 * Asserts the event passed as string is a valid RealmEvent value.
 * @throws A {@link TypeAssertionError} if an unexpected name is passed via {@link name}.
 * @param name - The name of the event.
 * @internal
 */
function assertRealmEvent(name: RealmEventName): asserts name is RealmEvent {
  const values = Object.values(RealmEvent);
  if (!values.includes(name as RealmEvent)) {
    throw new TypeAssertionError("One of " + values.join(", "), name);
  }
}

/** @internal */
type InternalConfig = {
  internal?: binding.Realm;
  schemaExtras?: RealmSchemaExtra;
  realmExists?: boolean;
};

/**
 * The Realm database.
 */
export class Realm {
  public static defaultPath = Realm.normalizePath("default.realm");

  private static internals = new Set<binding.WeakRef<binding.Realm>>();

  /**
   * Sets the log level across all levels.
   * @param level - The log level to be used by the logger. The default value is `info`.
   * @param category - The category/component to set the log level for. If omitted, log level is set for all known categories.
   * @note The log level can be changed during the lifetime of the application.
   * @since 12.0.0
   * @example
   * Realm.setLogLevel("all");
   */
  static setLogLevel(level: LogLevel): void;

  /**
   * Sets the log level for a specific category.
   * @note The log level can be changed during the lifetime of the application.
   * @since 12.0.0
   * @example
   * Realm.setLogLevel({ category: LogCategory.Realm, level: "all" });
   */
  static setLogLevel(options: LogOptions): void;

  static setLogLevel(arg: LogLevel | LogOptions) {
    const setLevel = (category: LogCategory, level: LogLevel) => {
      assert(Object.values(LogCategory).includes(category));
      const ref = binding.LogCategoryRef;
      const c = ref.getCategory(category);
      c.setDefaultLevelThreshold(toBindingLoggerLevel(level));
    };

    // FIXME: don't use `arguments` but find a proper type
    if (arguments.length === 1) {
      // eslint-disable-next-line prefer-rest-params
      const arg = arguments[0];
      if (arg.level) {
        const level = arg.level as LogLevel;
        if (arg.category) {
          const category = arg.category as LogCategory;
          setLevel(category, level);
        } else {
          Object.values(LogCategory).forEach((category) => {
            setLevel(category, level);
          });
        }
      } else {
        const level = arg as LogLevel;
        Object.values(LogCategory).forEach((category) => {
          setLevel(category, level);
        });
      }
    } else {
      throw new Error(`Wrong number of arguments - expected 1, got ${arguments.length}`);
    }
  }

  /**
   * Sets the logger callback.
   * @param loggerCallback - The callback invoked by the logger. The default callback uses `console.log`, `console.warn` and `console.error`, depending on the level of the message.
   * @note The logger callback needs to be setup before opening the first Realm.
   * @since 12.0.0
   * @example
   * Realm.setLogger(({ category, level, message }) => {
   *   console.log(`[${category} - ${level}] ${message}`);
   * });
   */
  static setLogger(loggerCallback: LoggerCallback) {
    let logger: binding.Logger;

    // This is a hack to check which of the two logger callbacks which are used
    // It only works as the two callback type have different number of arguments, and it will
    // probably produce odd error messages if the logger is set by `setLogger((...args) => console.log(args))`.
    if (loggerCallback.length === 2) {
      const cb = loggerCallback as LoggerCallback1;
      logger = binding.Helpers.makeLogger((_category, level, message) => {
        cb(fromBindingLoggerLevelToLogLevel(level), message);
      });
    } else {
      const cb = loggerCallback as LoggerCallback2;
      logger = binding.Helpers.makeLogger((category, level, message) => {
        cb({ category: category as LogCategory, level: fromBindingLoggerLevelToLogLevel(level), message });
      });
    }
    binding.Logger.setDefaultLogger(logger);
  }

  /**
   * Clears the state by closing and deleting any Realm in the default directory and logout all users.
   * NOTE: Not a part of the public API and it's primarily used from the library's tests.
   * @private
   */
  public static clearTestState(): void {
    assert(flags.ALLOW_CLEAR_TEST_STATE, "Set the flags.ALLOW_CLEAR_TEST_STATE = true before calling this.");
    // Close any realms not already closed
    for (const realmRef of Realm.internals) {
      const realm = realmRef.deref();
      if (realm && !realm.isClosed) {
        realm.close();
      }
    }
    Realm.internals.clear();
    binding.RealmCoordinator.clearAllCaches();
    binding.App.clearCachedApps();
    ProgressRealmPromise.cancelAll();

    // Delete all Realm files in the default directory
    const defaultDirectoryPath = fs.getDefaultDirectoryPath();
    fs.removeRealmFilesFromDirectory(defaultDirectoryPath);
  }

  /**
   * Delete the Realm file for the given configuration.
   * @param config - The configuration for the Realm being deleted.
   * @throws An {@link Error} if anything in the provided {@link config} is invalid.
   */
  public static deleteFile(config: Configuration): void {
    validateConfiguration(config);
    const path = Realm.determinePath(config);
    fs.removeFile(path);
    fs.removeFile(path + ".lock");
    fs.removeFile(path + ".fresh.lock");
    fs.removeFile(path + ".note");
    fs.removeDirectory(path + ".management");
  }

  /**
   * Checks if the Realm already exists on disk.
   * @param path - The path for a Realm.
   * @throws An {@link Error} if anything in the provided {@link path} is invalid.
   * @returns `true` if the Realm exists on the device, `false` if not.
   */
  public static exists(path: string): boolean;
  /**
   * Checks if the Realm already exists on disk.
   * @param config - The configuration of a Realm.
   * @throws An {@link Error} if anything in the provided {@link config} is invalid.
   * @returns `true` if the Realm exists on the device, `false` if not.
   */
  public static exists(config: Configuration): boolean;
  public static exists(arg: Configuration | string = {}): boolean {
    const config = typeof arg === "string" ? { path: arg } : arg;
    validateConfiguration(config);
    const path = Realm.determinePath(config);
    return fs.exists(path);
  }

  /**
   * Open the default Realm asynchronously with a promise.
   * @returns A promise that will be resolved with the Realm instance when it's available.
   */
  public static open(): ProgressRealmPromise;

  /**
   * Open a Realm asynchronously with a promise. If the Realm is synced, it will be fully
   * synchronized before it is available.
   * @param path - The path for the Realm.
   * @returns A promise that will be resolved with the Realm instance when it's available.
   */
  public static open(path: string): ProgressRealmPromise;

  /**
   * Open a Realm asynchronously with a promise. If the Realm is synced, it will be fully
   * synchronized before it is available.
   * In the case of query-based sync, {@link Configuration.schema} is required. An exception will be
   * thrown if {@link Configuration.schema} is not defined.
   * @param config - The configuration for the Realm.
   * @returns A promise that will be resolved with the Realm instance when it's available.
   * @throws An {@link Error} if anything in the provided {@link config} is invalid.
   */
  public static open(config: Configuration): ProgressRealmPromise;

  public static open(arg: Configuration | string = {}): ProgressRealmPromise {
    const config = typeof arg === "string" ? { path: arg } : arg;
    return new ProgressRealmPromise(config);
  }

  /**
   * Get the current schema version of the Realm at the given path.
   * @param path - The path to the file where the Realm database is stored.
   * @param encryptionKey - Required only when accessing encrypted Realms.
   * @throws An {@link Error} if passing an invalid or non-matching encryption key.
   * @returns Version of the schema as an integer, or `-1` if no Realm exists at {@link path}.
   * @since 0.11.0
   */
  public static schemaVersion(path: string, encryptionKey?: ArrayBuffer | ArrayBufferView): number {
    const notFound = "18446744073709551615"; // std::numeric_limit<uint64_t>::max() = 0xffffffffffffffff as string
    const config: Configuration = { path };
    const absolutePath = Realm.determinePath(config);
    const schemaVersion = binding.Realm.getSchemaVersion({
      path: absolutePath,
      encryptionKey: Realm.determineEncryptionKey(encryptionKey),
    });
    // no easy way to compare uint64_t in TypeScript
    return notFound === schemaVersion.toString() ? -1 : binding.Int64.intToNum(schemaVersion);
  }

  /**
   * Creates a template object for a Realm model class where all optional fields are undefined
   * and all required fields have the default value for the given data type, either the value
   * set by the default property in the schema or the default value for the datatype if the schema
   * doesn't specify one, i.e. 0, false and "".
   * @param objectSchema - Schema describing the object that should be created.
   */
  public static createTemplateObject<T extends Record<string, unknown>>(objectSchema: ObjectSchema): T {
    validateObjectSchema(objectSchema);
    const normalizedSchema = normalizeObjectSchema(objectSchema);
    const result: Record<string, unknown> = {};

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
    return result as T;
  }

  /**
   * Copy any Realm files  (i.e. `*.realm`) bundled with the application from the application
   * directory into the application's documents directory, so that they can be opened and used
   * by Realm. If the file already exists in the documents directory, it will not be
   * overwritten, so this can safely be called multiple times.
   *
   * This should be called before opening the Realm, in order to move the bundled Realm
   * files into a place where they can be written to.
   * @example
   * ```
   * // Given a bundled file, example.realm, this will copy example.realm (and any other .realm files)
   * // from the app bundle into the app's documents directory. If the file already exists, it will
   * // not be overwritten, so it is safe to call this every time the app starts.
   * Realm.copyBundledRealmFiles();
   *
   * const realm = await Realm.open({
   * // This will open example.realm from the documents directory, with the bundled data in.
   * path: "example.realm"
   * });
   * ```
   *
   * This is only implemented for React Native.
   * @throws an {@link Error} If an I/O error occurred or method is not implemented.
   */
  public static copyBundledRealmFiles() {
    fs.copyBundledRealmFiles();
  }

  /**
   * TODO: Consider breaking this by ensuring a ".realm" suffix (coordinating with other SDK teams in the process)
   */
  private static normalizePath(path: string | undefined): string {
    if (typeof path === "undefined") {
      return Realm.defaultPath;
    } else if (path.length === 0) {
      throw new Error("Unexpected empty path");
    } else if (fs.isAbsolutePath(path)) {
      return path;
    } else {
      return fs.joinPaths(fs.getDefaultDirectoryPath(), path);
    }
  }

  /**
   * @note When the path is relative and the config contains a sync object, Core will replace any existing file extension
   * or add the ".realm" suffix.
   */
  private static determinePath(config: Configuration): string {
    if (config.sync && !config.openSyncedRealmLocally) {
      if (config.path && fs.isAbsolutePath(config.path)) {
        return Realm.normalizePath(config.path);
      } else {
        const bindingSyncConfig = toBindingSyncConfig(config.sync);
        return config.sync.user.internal.syncManager.pathForRealm(bindingSyncConfig, config.path);
      }
    } else {
      return Realm.normalizePath(config.path);
    }
  }

  private static determineEncryptionKey(encryptionKey: Configuration["encryptionKey"]): ArrayBuffer | undefined {
    if (typeof encryptionKey === "undefined") {
      return encryptionKey;
    } else {
      return toArrayBuffer(encryptionKey, false);
    }
  }

  private static extractSchemaExtras(schemas: CanonicalObjectSchema[]): RealmSchemaExtra {
    return Object.fromEntries(
      schemas.map((schema) => {
        const defaults = Object.fromEntries(
          Object.entries(schema.properties).map(([name, property]) => {
            return [name, property.default];
          }),
        );
        return [schema.name, { defaults, constructor: schema.ctor }];
      }),
    );
  }

  /** @internal */
  public static transformConfig(config: Configuration): {
    schemaExtras: RealmSchemaExtra;
    bindingConfig: binding.RealmConfig_Relaxed;
  } {
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
          ? binding.Int64.numToInt(typeof config.schemaVersion === "number" ? config.schemaVersion : 0)
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
        forceSyncHistory: config.openSyncedRealmLocally,
        automaticallyHandleBacklinksInMigrations: config.migrationOptions?.resolveEmbeddedConstraints ?? false,
      },
    };
  }

  private static determineSchemaMode(config: Configuration): binding.SchemaMode | undefined {
    const { readOnly, deleteRealmIfMigrationNeeded, onMigration, sync } = config;
    assert(
      !readOnly || !deleteRealmIfMigrationNeeded,
      "Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.",
    );
    assert(
      !onMigration || !deleteRealmIfMigrationNeeded,
      "Cannot set 'deleteRealmIfMigrationNeeded' when 'onMigration' is set.",
    );
    if (readOnly) {
      return binding.SchemaMode.Immutable;
    } else if (deleteRealmIfMigrationNeeded) {
      return binding.SchemaMode.SoftResetFile;
    } else if (sync) {
      return binding.SchemaMode.AdditiveExplicit;
    } else {
      return undefined;
    }
  }

  private static wrapMigration(
    schemaExtras: RealmSchemaExtra,
    onMigration: MigrationCallback,
  ): binding.RealmConfig_Relaxed["migrationFunction"] {
    return (oldRealmInternal: binding.Realm, newRealmInternal: binding.Realm) => {
      try {
        const oldRealm = new Realm(null, { internal: oldRealmInternal, schemaExtras });
        const newRealm = new Realm(null, { internal: newRealmInternal, schemaExtras });
        onMigration(oldRealm, newRealm);
      } finally {
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
  public readonly internal: binding.Realm;

  /**
   * The sync session if this is a synced Realm
   */
  public readonly syncSession: SyncSession | null;

  private schemaExtras: RealmSchemaExtra = {};
  private classes: ClassMap;
  private changeListeners = new RealmListeners(this, RealmEvent.Change);
  private beforeNotifyListeners = new RealmListeners(this, RealmEvent.BeforeNotify);
  private schemaListeners = new RealmListeners(this, RealmEvent.Schema);
  /** @internal */
  public currentUpdateMode: UpdateMode | undefined;

  /**
   * Create a new {@link Realm} instance, at the default path.
   * @throws An {@link Error} when an incompatible synced Realm is opened.
   */
  constructor();
  /**
   * Create a new {@link Realm} instance at the provided {@link path}.
   * @param path - Required when first creating the Realm.
   * @throws An {@link Error} if the Realm cannot be opened at the provided {@link path}.
   * @throws An {@link Error} when an incompatible synced Realm is opened.
   */
  constructor(path: string);
  /**
   * Create a new {@link Realm} instance using the provided {@link config}. If a Realm does not yet exist
   * at {@link Configuration.path | config.path} (or {@link Realm.defaultPath} if not provided), then this constructor
   * will create it with the provided {@link Configuration.schema | config.schema} (which is _required_ in this case).
   * Otherwise, the instance will access the existing Realm from the file at that path.
   * In this case, {@link Configuration.schema | config.schema} is _optional_ or not have changed, unless
   * {@link Configuration.schemaVersion | config.schemaVersion} is incremented, in which case the Realm will be automatically
   * migrated to use the new schema.
   * In the case of query-based sync, {@link Configuration.schema | config.schema} is required. An exception will be
   * thrown if {@link Configuration.schema | config.schema} is not defined.
   * @param config - Required when first creating the Realm.
   * @throws An {@link Error} if anything in the provided {@link config} is invalid.
   * @throws An {@link Error} when an incompatible synced Realm is opened.
   */
  constructor(config: Configuration);
  /** @internal */
  constructor(config: Configuration | null, internalConfig: InternalConfig);
  constructor(arg?: Configuration | string | null, internalConfig: InternalConfig = {}) {
    const config = typeof arg === "string" ? { path: arg } : arg || {};
    // Calling `Realm.exists()` before `binding.Realm.getSharedRealm()` is necessary to capture
    // the correct value when this constructor was called since `binding.Realm.getSharedRealm()`
    // will open the realm. This is needed when deciding whether to update initial subscriptions.
    const realmExists = internalConfig.realmExists ?? Realm.exists(config);
    if (arg !== null) {
      assert(!internalConfig.schemaExtras, "Expected either a configuration or schemaExtras");
      validateConfiguration(config);
      const { bindingConfig, schemaExtras } = Realm.transformConfig(config);
      debug("open", bindingConfig);
      this.schemaExtras = schemaExtras;

      fs.ensureDirectoryForFile(bindingConfig.path);
      this.internal = internalConfig.internal ?? binding.Realm.getSharedRealm(bindingConfig);
      if (flags.ALLOW_CLEAR_TEST_STATE) {
        Realm.internals.add(new binding.WeakRef(this.internal));
      }

      binding.Helpers.setBindingContext(this.internal, {
        didChange: (r) => {
          r.verifyOpen();
          this.changeListeners.notify();
        },
        schemaDidChange: (r) => {
          r.verifyOpen();
          this.classes = new ClassMap(this, this.internal.schema, this.schema);
          this.schemaListeners.notify(this.schema);
        },
        beforeNotify: (r) => {
          r.verifyOpen();
          this.beforeNotifyListeners.notify();
        },
      });
    } else {
      const { internal, schemaExtras } = internalConfig;
      assert.instanceOf(internal, binding.Realm, "internal");
      this.internal = internal;
      this.schemaExtras = schemaExtras || {};
    }

    Object.defineProperty(this, "classes", {
      enumerable: false,
      configurable: false,
      writable: true,
    });
    Object.defineProperty(this, "internal", {
      enumerable: false,
      configurable: false,
      writable: false,
    });

    this.classes = new ClassMap(this, this.internal.schema, this.schema);

    const syncSession = this.internal.syncSession;
    this.syncSession = syncSession ? new SyncSession(syncSession) : null;

    const initialSubscriptions = config.sync?.initialSubscriptions;
    if (initialSubscriptions && !config.openSyncedRealmLocally) {
      // Do not call `Realm.exists()` here in case the realm has been opened by this point in time.
      this.handleInitialSubscriptions(initialSubscriptions, realmExists);
    }
  }

  /**
   * Indicates if this Realm contains any objects.
   * @returns `true` if empty, `false` otherwise.
   * @readonly
   * @since 1.10.0
   */
  get isEmpty(): boolean {
    return this.internal.isEmpty;
  }

  /**
   * The path to the file where this Realm is stored.
   * @returns A string containing the path to the file where this Realm is stored.
   * @readonly
   * @since 0.12.0
   */
  get path(): string {
    return this.internal.config.path;
  }

  /**
   * Indicates if this Realm was opened as read-only.
   * @returns `true` if this Realm is read-only, `false` otherwise.
   * @readonly
   * @since 0.12.0
   */
  get isReadOnly(): boolean {
    return this.internal.config.schemaMode === binding.SchemaMode.Immutable;
  }

  /**
   * Indicates if this Realm was opened in-memory.
   * @returns `true` if this Realm is in-memory, `false` otherwise.
   * @readonly
   */
  get isInMemory(): boolean {
    return this.internal.config.inMemory;
  }

  /**
   * A normalized representation of the schema provided in the {@link Configuration} when this Realm was constructed.
   * @returns An array of {@link CanonicalObjectSchema} describing all objects in this Realm.
   * @readonly
   * @since 0.12.0
   */
  get schema(): CanonicalObjectSchema[] {
    const schemas = fromBindingRealmSchema(this.internal.schema);
    // Stitch in the constructors and defaults stored in this.schemaExtras
    for (const objectSchema of schemas) {
      const extras = this.schemaExtras[objectSchema.name];
      if (extras) {
        objectSchema.ctor = extras.constructor;
      }
      for (const property of Object.values(objectSchema.properties)) {
        property.default = extras ? extras.defaults[property.name] : undefined;
      }
    }
    return schemas;
  }

  /**
   * The current schema version of the Realm.
   * @returns The schema version of this Realm, as a `number`.
   * @readonly
   * @since 0.12.0
   */
  get schemaVersion(): number {
    return Number(this.internal.schemaVersion);
  }

  /**
   * Indicates if this Realm is in a write transaction.
   * @returns `true` if in a write transaction, `false` otherwise.
   * @readonly
   * @since 1.10.3
   */
  get isInTransaction(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isInTransaction;
  }

  /**
   * Indicates if this Realm is in migration.
   * @returns `true` if in migration, `false` otherwise
   * @readonly
   * @since 12.3.0
   */
  get isInMigration(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isInMigration;
  }

  /**
   * Indicates if this Realm has been closed.
   * @returns `true` if closed, `false` otherwise.
   * @readonly
   * @since 2.1.0
   */
  get isClosed(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isClosed;
  }

  /**
   * The latest set of flexible sync subscriptions.
   * @returns A {@link SubscriptionSet} object.
   * @throws An {@link Error} if flexible sync is not enabled for this app.
   */
  get subscriptions(): SubscriptionSet {
    const { syncConfig } = this.internal.config;
    assert(
      syncConfig,
      "`subscriptions` can only be accessed if flexible sync is enabled, but sync is " +
        "currently disabled for your app. Add a flexible sync config when opening the " +
        "Realm, for example: { sync: { user, flexible: true } }.",
    );
    assert(
      syncConfig.flxSyncRequested,
      "`subscriptions` can only be accessed if flexible sync is enabled, but partition " +
        "based sync is currently enabled for your Realm. Modify your sync config to remove any `partitionValue` " +
        "and enable flexible sync, for example: { sync: { user, flexible: true } }",
    );

    return new SubscriptionSet(this, this.internal.latestSubscriptionSet);
  }

  /**
   * Closes this Realm so it may be re-opened with a newer schema version.
   * All objects and collections from this Realm are no longer valid after calling this method.
   * The method is idempotent.
   */
  close(): void {
    this.internal.close();
  }

  // TODO: Support embedded objects
  // TODO: Rollback by deleting the object if any property assignment fails (fixing #2638)
  /**
   * Create a new {@link RealmObject} of the given type and with the specified properties. For objects marked asymmetric,
   * `undefined` is returned. The API for asymmetric objects is subject to changes in the future.
   * @param type - The type of Realm object to create.
   * @param values - Property values for all required properties without a
   * default value.
   * @param mode Optional update mode. The default is `UpdateMode.Never`.
   * @returns A {@link RealmObject} or `undefined` if the object is asymmetric.
   */
  create<T = DefaultObject>(
    type: string,
    values: Partial<T> | Partial<Unmanaged<T>>,
    mode?: UpdateMode.Never | UpdateMode.All | UpdateMode.Modified | boolean,
  ): RealmObject<T> & T;
  create<T extends AnyRealmObject>(
    type: Constructor<T>,
    values: Partial<T> | Partial<Unmanaged<T>>,
    mode?: UpdateMode.Never | UpdateMode.All | UpdateMode.Modified | boolean,
  ): T;
  create<T extends AnyRealmObject>(
    type: string | Constructor<T>,
    values: DefaultObject,
    mode: UpdateMode | boolean = UpdateMode.Never,
  ): RealmObject<DefaultObject, never> | undefined {
    // Supporting a boolean overload for mode
    if (mode === true) {
      mode = UpdateMode.All;
    } else if (mode === false) {
      mode = UpdateMode.Never;
    }
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1260-L1321
    if (values instanceof RealmObject && !values[INTERNAL]) {
      throw new Error("Cannot create an object from a detached RealmObject instance");
    }
    if (!Object.values(UpdateMode).includes(mode)) {
      throw new Error(
        `Unsupported 'updateMode'. Only '${UpdateMode.Never}', '${UpdateMode.Modified}' or '${UpdateMode.All}' is supported.`,
      );
    }
    this.internal.verifyOpen();
    const helpers = this.classes.getHelpers(type);

    this.currentUpdateMode = mode;
    let realmObject: RealmObject;
    try {
      realmObject = RealmObject.create(this, values, mode, { helpers });
    } finally {
      this.currentUpdateMode = undefined;
    }

    return isAsymmetric(helpers.objectSchema) ? undefined : realmObject;
  }

  //FIXME: any should not be used, but we are staying compatible with previous versions
  /**
   * Deletes the provided Realm object, or each one inside the provided collection.
   * @param subject - The Realm object to delete, or a collection containing multiple Realm objects to delete.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(subject: AnyRealmObject | AnyRealmObject[] | AnyList | AnyResults | any): void {
    assert.inTransaction(this, "Can only delete objects within a transaction.");
    assert.object(subject, "subject");
    if (subject instanceof RealmObject) {
      assert.isSameRealm(subject[REALM].internal, this.internal, "Can't delete an object from another Realm");
      const { objectSchema } = this.classes.getHelpers(subject);
      const obj = subject[INTERNAL];
      assert.isValid(
        obj,
        "Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.",
      );
      const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
      table.removeObject(obj.key);
    } else if (subject instanceof List) {
      subject.internal.deleteAll();
    } else if (subject instanceof Results) {
      subject.internal.clear();
    } else if (Array.isArray(subject) || Symbol.iterator in subject) {
      //@ts-expect-error the above check is good enough
      for (const object of subject) {
        assert.instanceOf(object, RealmObject);
        assert.isSameRealm(object[REALM].internal, this.internal, "Can't delete an object from another Realm");
        const { objectSchema } = this.classes.getHelpers(object);
        const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
        table.removeObject(object[INTERNAL].key);
      }
    } else {
      throw new Error("Can only delete objects, lists and results.");
    }
  }

  /**
   * Deletes a Realm model, including all of its objects.
   * If called outside a migration function, {@link schema} and {@link schemaVersion} are updated.
   * @param name - The model name.
   */
  deleteModel(name: string): void {
    assert.inTransaction(this, "Can only delete objects within a transaction.");
    binding.Helpers.deleteDataForObject(this.internal, name);
    if (!this.internal.isInMigration) {
      const newSchema = this.internal.schema.filter((objectSchema) => objectSchema.name !== name);
      this.internal.updateSchema(
        newSchema,
        binding.Int64.add(this.internal.schemaVersion, binding.Int64.numToInt(1)),
        null,
        null,
        true,
      );
    }
  }

  /**
   * **WARNING:** This will delete **all** objects in the Realm!
   */
  deleteAll(): void {
    assert.inTransaction(this, "Can only delete objects within a transaction.");
    for (const objectSchema of this.internal.schema) {
      const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
      table.clear();
    }
  }

  /**
   * Searches for a Realm object by its primary key.
   * @param type - The type of Realm object to search for.
   * @param primaryKey - The primary key value of the object to search for.
   * @throws An {@link Error} if type passed into this method is invalid, or if the object type did
   * not have a {@link primaryKey} specified in the schema, or if it was marked asymmetric.
   * @returns A {@link RealmObject} or `null` if no object is found.
   * @since 0.14.0
   */
  objectForPrimaryKey<T = DefaultObject>(type: string, primaryKey: T[keyof T]): (RealmObject<T> & T) | null;
  objectForPrimaryKey<T extends AnyRealmObject>(type: Constructor<T>, primaryKey: T[keyof T]): T | null;
  objectForPrimaryKey<T extends AnyRealmObject>(type: string | Constructor<T>, primaryKey: unknown): T | null {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1240-L1258
    const { objectSchema, properties, wrapObject } = this.classes.getHelpers(type);
    if (!objectSchema.primaryKey) {
      throw new Error(`Expected a primary key on '${objectSchema.name}'`);
    }
    if (isAsymmetric(objectSchema)) {
      throw new Error("You cannot query an asymmetric object.");
    }
    const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
    const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey);
    try {
      const objKey = table.findPrimaryKey(value);
      if (binding.isEmptyObjKey(objKey)) {
        return null;
      } else {
        const obj = table.getObject(objKey);
        return wrapObject(obj) as T;
      }
    } catch (err) {
      // TODO: Match on something else than the error message, when exposed by the binding
      if (err instanceof Error && err.message.startsWith("No object with key")) {
        throw new Error(`No '${objectSchema.name}' with key '${primaryKey}'`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Returns all objects of the given {@link type} in the Realm.
   * @param type - The type of Realm object to search for.
   * @param objectKey - The object key of the Realm object to search for.
   * @throws An {@link Error} if type passed into this method is invalid or if the type is marked embedded or asymmetric.
   * @returns A {@link RealmObject} or `undefined` if the object key is not found.
   * @internal
   */
  _objectForObjectKey<T = DefaultObject>(type: string, objectKey: string): (RealmObject<T> & T) | undefined;
  _objectForObjectKey<T extends RealmObject>(type: Constructor<T>, objectKey: string): T | undefined;
  _objectForObjectKey<T extends RealmObject>(type: string | Constructor<T>, objectKey: string): T | undefined {
    const { objectSchema, wrapObject } = this.classes.getHelpers(type);
    if (isEmbedded(objectSchema)) {
      throw new Error("You cannot query an embedded object.");
    } else if (isAsymmetric(objectSchema)) {
      throw new Error("You cannot query an asymmetric object.");
    }

    assert.numericString(objectKey);

    const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
    try {
      const objKey = binding.stringToObjKey(objectKey);
      const obj = table.tryGetObject(objKey);
      const result = obj && (wrapObject(obj) as T);
      return result === null ? undefined : result;
    } catch (err) {
      if (err instanceof binding.InvalidObjKey) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  /**
   * Returns all objects of the given {@link type} in the Realm.
   * @param type - The type of Realm objects to retrieve.
   * @throws An {@link Error} if type passed into this method is invalid or if the type is marked embedded or asymmetric.
   * @returns Results that will live-update as objects are created, modified, and destroyed.
   */
  objects<T = DefaultObject>(type: string): Results<RealmObject<T> & T>;
  objects<T extends AnyRealmObject = RealmObject & DefaultObject>(type: Constructor<T>): Results<T>;
  objects<T extends AnyRealmObject>(type: string | Constructor<T>): Results<T> {
    const { objectSchema, wrapObject } = this.classes.getHelpers(type);
    if (isEmbedded(objectSchema)) {
      throw new Error("You cannot query an embedded object.");
    } else if (isAsymmetric(objectSchema)) {
      throw new Error("You cannot query an asymmetric object.");
    }

    const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
    const results = binding.Results.fromTable(this.internal, table);
    return new Results<T>(this, results, {
      get(results: binding.Results, index: number) {
        return results.getObj(index);
      },
      fromBinding: wrapObject,
      toBinding(value: unknown) {
        assert.instanceOf(value, RealmObject);
        return value[INTERNAL];
      },
    });
  }

  /**
   * Add a listener {@link callback} for the specified {@link eventName}.
   * @param eventName - The name of event that should cause the callback to be called.
   * @param callback - Function to be called when a change event occurs.
   * Each callback will only be called once per event, regardless of the number of times
   * it was added.
   * @throws An {@link Error} if an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
   */
  addListener(eventName: RealmEventName, callback: RealmListenerCallback): void {
    assert.open(this);
    assert.function(callback);
    if (eventName === "change") {
      this.changeListeners.add(callback);
    } else if (eventName === "schema") {
      this.schemaListeners.add(callback);
    } else if (eventName === "beforenotify") {
      this.beforeNotifyListeners.add(callback);
    } else {
      throw new Error(`Unknown event name '${eventName}': only 'change', 'schema' and 'beforenotify' are supported.`);
    }
  }

  /**
   * Remove the listener {@link callback} for the specified event {@link eventName}.
   * @param eventName - The event name.
   * @param callback - Function that was previously added as a listener for this event through the {@link addListener} method.
   * @throws an {@link Error} If an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
   */
  removeListener(eventName: RealmEventName, callback: RealmListenerCallback): void {
    assert.open(this);
    assert.function(callback);
    assertRealmEvent(eventName);
    if (eventName === RealmEvent.Change) {
      this.changeListeners.remove(callback);
    } else if (eventName === RealmEvent.Schema) {
      this.schemaListeners.remove(callback);
    } else if (eventName === RealmEvent.BeforeNotify) {
      this.beforeNotifyListeners.remove(callback);
    } else {
      assert.never(eventName, "eventName");
    }
  }

  /**
   * Remove all event listeners (restricted to the event {@link eventName}, if provided).
   * @param eventName - The name of the event whose listeners should be removed.
   * @throws An {@link Error} when invalid event {@link eventName} is supplied.
   */
  removeAllListeners(eventName?: RealmEventName): void {
    assert.open(this);
    if (typeof eventName === "undefined") {
      this.changeListeners.removeAll();
      this.schemaListeners.removeAll();
      this.beforeNotifyListeners.removeAll();
    } else {
      assert.string(eventName, "eventName");
      assertRealmEvent(eventName);
      if (eventName === RealmEvent.Change) {
        this.changeListeners.removeAll();
      } else if (eventName === RealmEvent.Schema) {
        this.schemaListeners.removeAll();
      } else if (eventName === RealmEvent.BeforeNotify) {
        this.beforeNotifyListeners.removeAll();
      } else {
        assert.never(eventName, "eventName");
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
   * @param callback - Function to be called inside a write transaction.
   * @returns Returned value from the callback.
   */
  write<T>(callback: () => T): T {
    let result = undefined;
    this.internal.beginTransaction();
    try {
      result = callback();
    } catch (err) {
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
   * @throws An {@link Error} if already in write transaction
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
  beginTransaction(): void {
    this.internal.beginTransaction();
  }

  /**
   * Commit a write transaction.
   * @see {@link beginTransaction}
   */
  commitTransaction(): void {
    this.internal.commitTransaction();
  }

  /**
   * Cancel a write transaction.
   * @see {@link beginTransaction}
   */
  cancelTransaction(): void {
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
  compact(): boolean {
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
   * @param config - Realm configuration that describes the output realm.
   */
  writeCopyTo(config: Configuration): void {
    assert.outTransaction(this, "Can only convert Realms outside a transaction.");
    validateConfiguration(config);
    const { bindingConfig } = Realm.transformConfig(config);
    this.internal.convert(bindingConfig);
  }

  /**
   * Update the schema of the Realm.
   * @param schema The schema which the Realm should be updated to use.
   * @internal
   */
  _updateSchema(schema: ObjectSchema[]): void {
    validateRealmSchema(schema);
    const normalizedSchema = normalizeRealmSchema(schema);
    const bindingSchema = toBindingSchema(normalizedSchema);
    if (!this.isInTransaction) {
      throw new Error("Can only create object schema within a transaction.");
    }
    this.internal.updateSchema(
      bindingSchema,
      binding.Int64.add(this.internal.schemaVersion, binding.Int64.numToInt(1)),
      null,
      null,
      true,
    );

    // Note: The schema change listener is fired immediately after the call to
    //       `this.internal.updateSchema()` (thus before `_updateSchema()` has
    //       returned). Therefore, `this.classes` is updated in the `schemaDidChange`
    //       callback and not here.
  }

  /** @internal */
  public getClassHelpers<T>(
    arg: string | binding.TableKey | RealmObject<T> | Constructor<RealmObject<T>>,
  ): ClassHelpers {
    return this.classes.getHelpers<T>(arg);
  }

  /**
   * Update subscriptions with the initial subscriptions if needed.
   * @param initialSubscriptions The initial subscriptions.
   * @param realmExists Whether the realm already exists.
   */
  private handleInitialSubscriptions(initialSubscriptions: InitialSubscriptions, realmExists: boolean): void {
    const shouldUpdateSubscriptions = initialSubscriptions.rerunOnOpen || !realmExists;
    if (shouldUpdateSubscriptions) {
      debug("handling initial subscriptions, %O", { rerunOnOpen: initialSubscriptions.rerunOnOpen, realmExists });
      this.subscriptions.updateNoWait(initialSubscriptions.update);
    }
  }
}

/**
 * @param objectSchema - The schema of the object.
 * @returns `true` if the object is marked for asymmetric sync, otherwise `false`.
 */
function isAsymmetric(objectSchema: binding.ObjectSchema): boolean {
  return objectSchema.tableType === binding.TableType.TopLevelAsymmetric;
}

/**
 * @param objectSchema - The schema of the object.
 * @returns `true` if the object is marked as embedded, otherwise `false`.
 */
function isEmbedded(objectSchema: binding.ObjectSchema): boolean {
  return objectSchema.tableType === binding.TableType.Embedded;
}

// Declare the Realm namespace for backwards compatibility
// This declaration needs to happen in the same file which declares "Realm"
// @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-namespaces-with-classes-functions-and-enums

import * as internal from "./internal";
// Needed to avoid complaints about a self-reference
import RealmItself = Realm;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Realm {
  export import Realm = RealmItself;
  export import flags = internal.flags;

  export import Object = internal.RealmObject;
  export import App = internal.App;
  export import Auth = internal.Auth;
  export import BSON = internal.BSON;
  export import Types = internal.Types;
  export import Services = internal.Services;

  export import index = internal.index;
  export import mapTo = internal.mapTo;
  export import kmToRadians = internal.kmToRadians;
  export import miToRadians = internal.miToRadians;

  export import AnyCollection = internal.AnyCollection;
  export import AnyDictionary = internal.AnyDictionary;
  export import AnyList = internal.AnyList;
  export import AnyRealmObject = internal.AnyRealmObject;
  export import AnyResults = internal.AnyResults;
  export import AnyUser = internal.AnyUser;
  export import ApiKey = internal.ApiKey;
  export import AppChangeCallback = internal.AppChangeCallback;
  export import AssertionError = internal.AssertionError;
  export import AppConfiguration = internal.AppConfiguration;
  export import AppServicesFunction = internal.AppServicesFunction;
  export import BaseConfiguration = internal.BaseConfiguration;
  export import BaseObjectSchema = internal.BaseObjectSchema;
  export import BaseSyncConfiguration = internal.BaseSyncConfiguration;
  export import CanonicalGeoPoint = internal.CanonicalGeoPoint;
  export import CanonicalGeoPolygon = internal.CanonicalGeoPolygon;
  export import CanonicalObjectSchema = internal.CanonicalObjectSchema;
  export import CanonicalPropertiesTypes = internal.CanonicalPropertiesTypes;
  export import CanonicalPropertySchema = internal.CanonicalPropertySchema;
  export import ClientResetAfterCallback = internal.ClientResetAfterCallback;
  export import ClientResetBeforeCallback = internal.ClientResetBeforeCallback;
  export import ClientResetConfig = internal.ClientResetConfig;
  export import ClientResetDiscardUnsyncedChangesConfiguration = internal.ClientResetDiscardUnsyncedChangesConfiguration;
  export import ClientResetFallbackCallback = internal.ClientResetFallbackCallback;
  export import ClientResetManualConfiguration = internal.ClientResetManualConfiguration;
  export import ClientResetMode = internal.ClientResetMode;
  export import ClientResetRecoverOrDiscardUnsyncedChangesConfiguration = internal.ClientResetRecoverOrDiscardUnsyncedChangesConfiguration;
  export import ClientResetRecoverUnsyncedChangesConfiguration = internal.ClientResetRecoverUnsyncedChangesConfiguration;
  export import Collection = internal.Collection;
  export import CollectionChangeCallback = internal.CollectionChangeCallback;
  export import CollectionChangeSet = internal.CollectionChangeSet;
  export import CollectionPropertyTypeName = internal.CollectionPropertyTypeName;
  export import CompensatingWriteError = internal.CompensatingWriteError;
  export import CompensatingWriteInfo = internal.CompensatingWriteInfo;
  export import Configuration = internal.Configuration;
  export import ConfigurationWithoutSync = internal.ConfigurationWithoutSync;
  export import ConfigurationWithSync = internal.ConfigurationWithSync;
  export import ConnectionNotificationCallback = internal.ConnectionNotificationCallback;
  export import ConnectionState = internal.ConnectionState;
  export import Credentials = internal.Credentials;
  export import DefaultFunctionsFactory = internal.DefaultFunctionsFactory;
  export import DefaultUserProfileData = internal.DefaultUserProfileData;
  export import Dictionary = internal.Dictionary;
  export import DictionaryChangeCallback = internal.DictionaryChangeCallback;
  export import DictionaryChangeSet = internal.DictionaryChangeSet;
  export import ErrorCallback = internal.ErrorCallback;
  export import FlexibleSyncConfiguration = internal.FlexibleSyncConfiguration;
  export import GeoBox = internal.GeoBox;
  export import GeoCircle = internal.GeoCircle;
  export import GeoPoint = internal.GeoPoint;
  export import GeoPolygon = internal.GeoPolygon;
  export import GeoPosition = internal.GeoPosition;
  export import IndexDecorator = internal.IndexDecorator;
  export import IndexedType = internal.IndexedType;
  export import InitialSubscriptions = internal.InitialSubscriptions;
  export import List = internal.List;
  export import LocalAppConfiguration = internal.LocalAppConfiguration;
  export import Logger = internal.Logger;
  export import LoggerCallback = internal.LoggerCallback;
  export import MapToDecorator = internal.MapToDecorator;
  export import Metadata = internal.Metadata;
  export import MetadataMode = internal.MetadataMode;
  export import MigrationCallback = internal.MigrationCallback;
  export import MigrationOptions = internal.MigrationOptions;
  export import Mixed = internal.Types.Mixed;
  export import MongoDB = internal.MongoDB;
  export import MongoDBService = internal.MongoDBService;
  export import NumericLogLevel = internal.NumericLogLevel;
  export import ObjectChangeCallback = internal.ObjectChangeCallback;
  export import ObjectChangeSet = internal.ObjectChangeSet;
  export import ObjectSchema = internal.ObjectSchema;
  export import ObjectType = internal.ObjectType;
  export import OpenRealmBehaviorConfiguration = internal.OpenRealmBehaviorConfiguration;
  export import OpenRealmBehaviorType = internal.OpenRealmBehaviorType;
  export import OpenRealmTimeOutBehavior = internal.OpenRealmTimeOutBehavior;
  export import OrderedCollection = internal.OrderedCollection;
  export import PartitionSyncConfiguration = internal.PartitionSyncConfiguration;
  export import PrimaryKey = internal.PrimaryKey;
  export import PrimitivePropertyTypeName = internal.PrimitivePropertyTypeName;
  export import ProgressDirection = internal.ProgressDirection;
  export import ProgressMode = internal.ProgressMode;
  export import ProgressNotificationCallback = internal.ProgressNotificationCallback;
  export import ProgressRealmPromise = internal.ProgressRealmPromise;
  export import PropertiesTypes = internal.PropertiesTypes;
  export import PropertySchema = internal.PropertySchema;
  export import PropertySchemaParseError = internal.PropertySchemaParseError;
  export import PropertySchemaShorthand = internal.PropertySchemaShorthand;
  export import PropertySchemaStrict = internal.PropertySchemaStrict;
  export import PropertyTypeName = internal.PropertyTypeName;
  export import ProviderType = internal.ProviderType;
  export import ProxyType = internal.ProxyType;
  export import RealmEvent = internal.RealmEvent;
  export import RealmEventName = internal.RealmEventName;
  export import RealmListenerCallback = internal.RealmListenerCallback;
  export import RealmObjectConstructor = internal.RealmObjectConstructor;
  export import RelationshipPropertyTypeName = internal.RelationshipPropertyTypeName;
  export import Results = internal.Results;
  export import SchemaParseError = internal.SchemaParseError;
  export import SecretApiKey = internal.SecretApiKey;
  export import SessionState = internal.SessionState;
  export import SessionStopPolicy = internal.SessionStopPolicy;
  export import Set = internal.RealmSet;
  export import SortDescriptor = internal.SortDescriptor;
  export import SSLConfiguration = internal.SSLConfiguration;
  export import SSLVerifyCallback = internal.SSLVerifyCallback;
  export import SSLVerifyObject = internal.SSLVerifyObject;
  export import SubscriptionSetState = internal.SubscriptionSetState;
  export import SyncConfiguration = internal.SyncConfiguration;
  export import SyncError = internal.SyncError;
  export import SyncProxyConfig = internal.SyncProxyConfig;
  export import TypeAssertionError = internal.TypeAssertionError;
  export import Unmanaged = internal.Unmanaged;
  export import UpdateMode = internal.UpdateMode;
  export import User = internal.User;
  export import UserChangeCallback = internal.UserChangeCallback;
  export import UserIdentity = internal.UserIdentity;
  export import UserState = internal.UserState;
  export import WaitForSync = internal.WaitForSync;
  export import WatchOptionsFilter = internal.WatchOptionsFilter;
  export import WatchOptionsIds = internal.WatchOptionsIds;

  // Deprecated exports below
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.AppServicesFunction | AppServicesFunction} */
  export import RealmFunction = internal.AppServicesFunction;
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.CanonicalPropertySchema | CanonicalPropertySchema} */
  export import CanonicalObjectSchemaProperty = internal.CanonicalPropertySchema;
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.ClientResetRecoverUnsyncedChangesConfiguration | ClientResetRecoverUnsyncedChangesConfiguration} */
  export import ClientResetRecoveryConfiguration = internal.ClientResetRecoverUnsyncedChangesConfiguration;
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.PropertySchema | PropertySchema} */
  export import ObjectSchemaProperty = internal.PropertySchema;
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.RealmObjectConstructor | RealmObjectConstructor} */
  export import ObjectClass = internal.RealmObjectConstructor;
  /** @deprecated Will be removed in v13.0.0. Please use {@link internal.PropertyTypeName | PropertyTypeName} */
  export import PropertyType = internal.PropertyTypeName;
  /** @deprecated Use the another {@link internal.ClientResetMode | ClientResetMode} than {@link internal.ClientResetMode.Manual | ClientResetMode.Manual}. */
  export import ClientResetError = internal.ClientResetError;
  /** @deprecated See https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/ */
  export import PushClient = internal.PushClient;
}

//Set default logger and log level.
Realm.setLogger(defaultLogger);
Realm.setLogLevel(defaultLoggerLevel);
