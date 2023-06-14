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
  AggregatePipelineStage,
  AnyRealmObject,
  ApiKey,
  ApiKeyAuth,
  App,
  AppChangeCallback,
  AppConfiguration,
  BSON,
  BaseChangeEvent,
  BaseConfiguration,
  BaseObjectSchema,
  BaseSubscriptionSet,
  BaseSyncConfiguration,
  CanonicalGeoPoint,
  CanonicalGeoPolygon,
  CanonicalObjectSchema,
  CanonicalObjectSchemaProperty,
  CanonicalPropertiesTypes,
  CanonicalPropertySchema,
  ChangeEvent,
  ChangeEventId,
  ClassHelpers,
  ClassMap,
  ClientResetAfterCallback,
  ClientResetBeforeCallback,
  ClientResetConfig,
  ClientResetDiscardUnsyncedChangesConfiguration,
  ClientResetFallbackCallback,
  ClientResetManualConfiguration,
  ClientResetMode,
  ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
  ClientResetRecoverUnsyncedChangesConfiguration,
  Collection,
  CollectionChangeCallback,
  CollectionChangeSet,
  CollectionPropertyTypeName,
  CompensatingWriteError,
  CompensatingWriteInfo,
  Configuration,
  ConfigurationWithSync,
  ConfigurationWithoutSync,
  ConnectionNotificationCallback,
  ConnectionState,
  Constructor,
  CountOptions,
  Credentials,
  DefaultFunctionsFactory,
  DefaultObject,
  DefaultUserProfileData,
  DeleteEvent,
  DeleteResult,
  Dictionary,
  DictionaryChangeCallback,
  DictionaryChangeSet,
  Document,
  DocumentKey,
  DocumentNamespace,
  DropDatabaseEvent,
  DropEvent,
  EmailPasswordAuth,
  ErrorCallback,
  Filter,
  FindOneAndModifyOptions,
  FindOneOptions,
  FindOptions,
  FlexibleSyncConfiguration,
  GeoBox,
  GeoCircle,
  GeoPoint,
  GeoPolygon,
  GeoPosition,
  INTERNAL,
  IndexDecorator,
  InitialSubscriptions,
  InsertEvent,
  InsertManyResult,
  InsertOneResult,
  InvalidateEvent,
  List,
  LocalAppConfiguration,
  LogLevel,
  LoggerCallback,
  MapToDecorator,
  MigrationCallback,
  MongoDB,
  MongoDBCollection,
  MongoDBDatabase,
  MutableSubscriptionSet,
  NewDocument,
  NumericLogLevel,
  ObjectChangeCallback,
  ObjectChangeSet,
  ObjectSchema,
  ObjectSchemaProperty,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  OperationType,
  OrderedCollection,
  PartitionSyncConfiguration,
  PartitionValue,
  PrimaryKey,
  PrimitivePropertyTypeName,
  ProgressDirection,
  ProgressMode,
  ProgressNotificationCallback,
  ProgressRealmPromise,
  PropertiesTypes,
  PropertySchema,
  PropertySchemaParseError,
  PropertySchemaShorthand,
  PropertySchemaStrict,
  PropertyTypeName,
  ProviderType,
  PushClient,
  REALM,
  RealmEvent,
  RealmFunction,
  RealmInsertionModel,
  RealmListenerCallback,
  RealmListeners,
  RealmObject,
  RealmObjectConstructor,
  RealmSet,
  RelationshipPropertyTypeName,
  RenameEvent,
  ReplaceEvent,
  Results,
  SSLConfiguration,
  SSLVerifyCallback,
  SSLVerifyObject,
  SchemaParseError,
  SessionState,
  SessionStopPolicy,
  SortDescriptor,
  Subscription,
  SubscriptionOptions,
  SubscriptionSet,
  SubscriptionSetState,
  SyncConfiguration,
  SyncError,
  SyncSession,
  TypeAssertionError,
  Types,
  Update,
  UpdateDescription,
  UpdateEvent,
  UpdateMode,
  UpdateOptions,
  UpdateResult,
  User,
  UserChangeCallback,
  UserState,
  WaitForSync,
  assert,
  binding,
  defaultLogger,
  defaultLoggerLevel,
  extendDebug,
  flags,
  fromBindingLoggerLevelToLogLevel,
  fromBindingRealmSchema,
  fs,
  index,
  kmToRadians,
  mapTo,
  miToRadians,
  normalizeObjectSchema,
  normalizeRealmSchema,
  safeGlobalThis,
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
 * @throws {@link TypeAssertionError} If an unexpected name is passed via {@link name}.
 * @param name The name of the event.
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

export class Realm {
  public static App = App;
  public static Auth = { EmailPasswordAuth, ApiKeyAuth };
  public static BSON = BSON;
  public static ClientResetMode = ClientResetMode;
  public static Collection = Collection;
  public static CompensatingWriteError = CompensatingWriteError;
  public static ConnectionState = ConnectionState;
  public static Credentials = Credentials;
  public static Dictionary = Dictionary;
  public static flags = flags;
  public static index = index;
  public static List = List;
  public static mapTo = mapTo;
  public static NumericLogLevel = NumericLogLevel;
  public static Object = RealmObject;
  public static OpenRealmBehaviorType = OpenRealmBehaviorType;
  public static OpenRealmTimeOutBehavior = OpenRealmTimeOutBehavior;
  public static OrderedCollection = OrderedCollection;
  public static ProgressDirection = ProgressDirection;
  public static ProgressMode = ProgressMode;
  public static PropertySchemaParseError = PropertySchemaParseError;
  public static ProviderType = ProviderType;
  public static Results = Results;
  public static SchemaParseError = SchemaParseError;
  public static SessionState = SessionState;
  public static SessionStopPolicy = SessionStopPolicy;
  public static Set = RealmSet;
  public static SubscriptionSetState = SubscriptionSetState;
  public static SyncError = SyncError;
  public static Types = Types;
  public static UpdateMode = UpdateMode;
  public static User = User;
  public static UserState = UserState;
  public static WaitForSync = WaitForSync;

  public static kmToRadians = kmToRadians;
  public static miToRadians = miToRadians;

  public static defaultPath = Realm.normalizePath("default.realm");

  private static internals = new Set<binding.WeakRef<binding.Realm>>();

  /**
   * Sets the log level.
   * @param level The log level to be used by the logger. The default value is `info`.
   * @note The log level can be changed during the lifetime of the application.
   * @since v12.0.0
   */
  static setLogLevel(level: LogLevel) {
    const bindingLoggerLevel = toBindingLoggerLevel(level);
    binding.Logger.setDefaultLevelThreshold(bindingLoggerLevel);
  }

  /**
   * Sets the logger callback.
   * @param loggerCallback The callback invoked by the logger. The default callback uses `console.log`, `console.warn` and `console.error`, depending on the level of the message.
   * @note The logger callback needs to be setup before opening the first realm.
   * @since v12.0.0
   */
  static setLogger(loggerCallback: LoggerCallback) {
    const logger = binding.Helpers.makeLogger((level, message) => {
      loggerCallback(fromBindingLoggerLevelToLogLevel(level), message);
    });
    binding.Logger.setDefaultLogger(logger);
  }

  /**
   * Clears the state by closing and deleting any Realm in the default directory and logout all users.
   * @private Not a part of the public API: It's primarily used from the library's tests.
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
   * @param config The configuration for the Realm
   * @throws {@link Error} If anything in the provided {@link config} is invalid.
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
   * @param arg The configuration for the Realm or the path to it.
   * @throws {@link Error} If anything in the provided {@link config} is invalid.
   * @returns `true` if the Realm exists on the device, `false` if not.
   */
  public static exists(arg: Configuration | string = {}): boolean {
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
  public static open(arg: Configuration | string = {}): ProgressRealmPromise {
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
  public static schemaVersion(path: string, encryptionKey?: ArrayBuffer | ArrayBufferView): number {
    const config: Configuration = { path };
    const absolutePath = Realm.determinePath(config);
    const schemaVersion = binding.Realm.getSchemaVersion({
      path: absolutePath,
      encryptionKey: Realm.determineEncryptionKey(encryptionKey),
    });
    return binding.Int64.intToNum(schemaVersion);
  }

  /**
   * Creates a template object for a Realm model class where all optional fields are undefined
   * and all required fields have the default value for the given data type, either the value
   * set by the default property in the schema or the default value for the datatype if the schema
   * doesn't specify one, i.e. 0, false and "".
   *
   * @param objectSchema Schema describing the object that should be created.
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
   * @throws {@link Error} If an I/O error occurred or method is not implemented.
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

  /**
   * Create a new {@link Realm} instance, at the default path.
   * @throws {@link Error} When an incompatible synced Realm is opened.
   */
  constructor();
  /**
   * Create a new {@link Realm} instance at the provided {@link path}.
   * @param path Required when first creating the Realm.
   * @throws {@link Error} If the Realm cannot be opened at the provided {@link path}.
   * @throws {@link Error} When an incompatible synced Realm is opened.
   */
  constructor(path: string);
  /**
   * Create a new {@link Realm} instance using the provided {@link config}. If a Realm does not yet exist
   * at {@link Configuration.path | config.path} (or {@link defaultPath} if not provided), then this constructor
   * will create it with the provided {@link Configuration.schema | config.schema} (which is _required_ in this case).
   * Otherwise, the instance will access the existing Realm from the file at that path.
   * In this case, {@link Configuration.schema | config.schema} is _optional_ or not have changed, unless
   * {@link Configuration.schemaVersion | config.schemaVersion} is incremented, in which case the Realm will be automatically
   * migrated to use the new schema.
   * In the case of query-based sync, {@link Configuration.schema | config.schema} is required. An exception will be
   * thrown if {@link Configuration.schema | config.schema} is not defined.
   * @param config Required when first creating the Realm.
   * @throws {@link Error} If anything in the provided {@link config} is invalid.
   * @throws {@link Error} When an incompatible synced Realm is opened.
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
   * @readonly
   * @since 1.10.0
   */
  get isEmpty(): boolean {
    return binding.Helpers.isEmptyRealm(this.internal);
  }

  /**
   * The path to the file where this Realm is stored.
   * @readonly
   * @since 0.12.0
   */
  get path(): string {
    return this.internal.config.path;
  }

  /**
   * Indicates if this Realm was opened as read-only.
   * @readonly
   * @since 0.12.0
   */
  get isReadOnly(): boolean {
    return this.internal.config.schemaMode === binding.SchemaMode.Immutable;
  }

  /**
   * Indicates if this Realm was opened in-memory.
   * @readonly
   */
  get isInMemory(): boolean {
    return this.internal.config.inMemory;
  }

  /**
   * A normalized representation of the schema provided in the {@link Configuration} when this Realm was constructed.
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
   * @readonly
   * @since 0.12.0
   */
  get schemaVersion(): number {
    return Number(this.internal.schemaVersion);
  }

  /**
   * Indicates if this Realm is in a write transaction.
   * @readonly
   * @since 1.10.3
   */
  get isInTransaction(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isInTransaction;
  }

  /**
   * Indicates if this Realm has been closed.
   * @readonly
   * @since 2.1.0
   */
  get isClosed(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isClosed;
  }

  /**
   * The latest set of flexible sync subscriptions.
   * @throws {@link Error} If flexible sync is not enabled for this app.
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
   * @param type The type of Realm object to create.
   * @param values Property values for all required properties without a
   *   default value.
   * @param mode Optional update mode. It can be one of the following values
   *     - UpdateMode.Never: Objects are only created. If an existing object exists, an exception is thrown. This is the
   *       default value.
   *     - UpdateMode.All: If an existing object is found, all properties provided will be updated, any other properties will
   *       remain unchanged.
   *     - UpdateMode.Modified: If an existing object exists, only properties where the value has actually changed will be
   *       updated. This improves notifications and server side performance but also have implications for how changes
   *       across devices are merged. For most use cases, the behavior will match the intuitive behavior of how
   *       changes should be merged, but if updating an entire object is considered an atomic operation, this mode
   *       should not be used.
   * @returns A {@link RealmObject} or `undefined` if the object is asymmetric.
   */
  create<T = DefaultObject>(
    type: string,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode?: UpdateMode.Never | UpdateMode.All | UpdateMode.Modified | boolean,
  ): RealmObject<T> & T;
  create<T extends AnyRealmObject>(
    type: Constructor<T>,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode?: UpdateMode.Never | UpdateMode.All | UpdateMode.Modified | boolean,
  ): T;
  create<T extends AnyRealmObject>(
    type: string | Constructor<T>,
    values: DefaultObject,
    mode: UpdateMode | boolean = UpdateMode.Never,
  ) {
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
      throw new Error("Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.");
    }
    this.internal.verifyOpen();
    const helpers = this.classes.getHelpers(type);
    const realmObject = RealmObject.create(this, values, mode, { helpers });

    return isAsymmetric(helpers.objectSchema) ? undefined : realmObject;
  }

  /**
   * Deletes the provided Realm object, or each one inside the provided collection.
   */
  delete(subject: AnyRealmObject | AnyRealmObject[] | List | Results): void {
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
   * @param name The model name
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
   * @param type The type of Realm object to search for.
   * @param primaryKey The primary key value of the object to search for.
   * @throws {@link Error} If type passed into this method is invalid, or if the object type did
   *  not have a {@link primaryKey} specified in the schema, or if it was marked asymmetric.
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
    const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey, undefined);
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
   * @param type The type of Realm object to search for.
   * @param objectKey The object key of the Realm object to search for.
   * @throws {@link Error} If type passed into this method is invalid or if the type is marked embedded or asymmetric.
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
   * @param type The type of Realm objects to retrieve.
   * @throws {@link Error} If type passed into this method is invalid or if the type is marked embedded or asymmetric.
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
   * @param eventName The name of event that should cause the callback to be called.
   * @param callback Function to be called when a change event occurs.
   *   Each callback will only be called once per event, regardless of the number of times
   *   it was added.
   * @throws {@link Error} If an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
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
   * @param eventName The event name.
   * @param callback Function that was previously added as a listener for this event through the {@link addListener} method.
   * @throws {@link Error} If an invalid event {@link eventName} is supplied, if Realm is closed or if {@link callback} is not a function.
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
   * @param eventName The name of the event whose listeners should be removed.
   * @throws {@link Error} When invalid event {@link eventName} is supplied
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
  beginTransaction(): void {
    this.internal.beginTransaction();
  }

  /**
   * Commit a write transaction.
   *
   * @see {@link beginTransaction}
   */
  commitTransaction(): void {
    this.internal.commitTransaction();
  }

  /**
   * Cancel a write transaction.
   *
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
   * @param config Realm configuration that describes the output realm.
   */
  writeCopyTo(config: Configuration) {
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
    this.classes = new ClassMap(this, this.internal.schema, this.schema);
  }

  /**
   * @internal
   */
  public getClassHelpers<T>(
    arg: string | binding.TableKey | RealmObject<T> | Constructor<RealmObject<T>>,
  ): ClassHelpers {
    return this.classes.getHelpers<T>(arg);
  }

  /**
   * Update subscriptions with the initial subscriptions if needed.
   *
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
 * @param objectSchema The schema of the object.
 * @returns `true` if the object is marked for asymmetric sync, otherwise `false`.
 */
function isAsymmetric(objectSchema: binding.ObjectSchema): boolean {
  return objectSchema.tableType === binding.TableType.TopLevelAsymmetric;
}

/**
 * @param objectSchema The schema of the object.
 * @returns `true` if the object is marked as embedded, otherwise `false`.
 */
function isEmbedded(objectSchema: binding.ObjectSchema): boolean {
  return objectSchema.tableType === binding.TableType.Embedded;
}

// Declare the Realm namespace for backwards compatibility
// This declaration needs to happen in the same file which declares "Realm"
// @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-namespaces-with-classes-functions-and-enums

// We need these type aliases because of https://github.com/Swatinem/rollup-plugin-dts/issues/223
// We cannot move this to a different file and rely on module declarations because of https://github.com/Swatinem/rollup-plugin-dts/issues/168

type AppType<FunctionsFactoryType = DefaultFunctionsFactory, CustomDataType = DefaultObject> = App<
  FunctionsFactoryType,
  CustomDataType
>;
type BSONType = typeof BSON;
type ClientResetModeType = ClientResetMode;
type CollectionType<
  KeyType = unknown,
  ValueType = unknown,
  EntryType = [KeyType, ValueType],
  T = ValueType,
  ChangeCallbackType = unknown,
> = Collection<KeyType, ValueType, EntryType, T, ChangeCallbackType>;
type CompensatingWriteErrorType = CompensatingWriteError;
type ConnectionStateType = ConnectionState;
type CredentialsType = Credentials;
type DictionaryType<T> = Dictionary<T>;
type IndexDecoratorType = IndexDecorator;
type ListType<T = unknown> = List<T>;
type MapToDecoratorType = MapToDecorator;
type Mixed = unknown;
type ObjectType = string | RealmObjectConstructor;
type OpenRealmBehaviorTypeType = OpenRealmBehaviorType;
type OpenRealmTimeOutBehaviorType = OpenRealmTimeOutBehavior;
type ProgressDirectionType = ProgressDirection;
type ProgressModeType = ProgressMode;
type PropertySchemaParseErrorType = PropertySchemaParseError;
type ProviderTypeType = ProviderType;
type ResultsType<T = unknown> = Results<T>;
type SchemaParseErrorType = SchemaParseError;
type SessionStateType = SessionState;
type SessionStopPolicyType = SessionStopPolicy;
type SetType<T = unknown> = RealmSet<T>;
type SSLConfigurationType = SSLConfiguration;
type SSLVerifyCallbackType = SSLVerifyCallback;
type SSLVerifyObjectType = SSLVerifyObject;
type SyncErrorType = SyncError;
type SyncSessionType = SyncSession;
type TypesType = typeof Types;
type UpdateModeType = UpdateMode;
type UserStateType = UserState;
type UserType<
  FunctionsFactoryType = DefaultFunctionsFactory,
  CustomDataType = DefaultObject,
  UserProfileDataType = DefaultUserProfileData,
> = User<FunctionsFactoryType, CustomDataType, UserProfileDataType>;

type BaseSubscriptionSetType = BaseSubscriptionSet;
type LogLevelType = LogLevel;
type NumericLogLevelType = NumericLogLevel;
type MutableSubscriptionSetType = MutableSubscriptionSet;
type PartitionValueType = PartitionValue;
type SubscriptionOptionsType = SubscriptionOptions;
type SubscriptionSetType = SubscriptionSet;
type SubscriptionSetStateType = SubscriptionSetState;
type SubscriptionType = Subscription;

type ObjectIdType = BSON.ObjectId;
type Decimal128Type = BSON.Decimal128;
type UUIDType = BSON.UUID;

type ApiKeyType = ApiKey;
type EmailPasswordAuthType = EmailPasswordAuth;
type ApiKeyAuthType = ApiKeyAuth;

type AggregatePipelineStageType = AggregatePipelineStage;
type BaseChangeEventType<T extends OperationType> = BaseChangeEvent<T>;
type ChangeEventType<T extends Document> = ChangeEvent<T>;
type ChangeEventIdType = ChangeEventId;
type CountOptionsType = CountOptions;
type DeleteEventType<T extends Document> = DeleteEvent<T>;
type DeleteResultType = DeleteResult;
type DocumentType<IdType> = Document<IdType>;
type DocumentKeyType<IdType> = DocumentKey<IdType>;
type DocumentNamespaceType = DocumentNamespace;
type DropDatabaseEventType = DropDatabaseEvent;
type DropEventType = DropEvent;
type FilterType = Filter;
type FindOneAndModifyOptionsType = FindOneAndModifyOptions;
type FindOneOptionsType = FindOneOptions;
type FindOptionsType = FindOptions;
type InsertEventType<T extends Document> = InsertEvent<T>;
type InsertManyResultType<IdType> = InsertManyResult<IdType>;
type InsertOneResultType<IdType> = InsertOneResult<IdType>;
type InvalidateEventType = InvalidateEvent;
type MongoDBType = MongoDB;
type MongoDBCollectionType<T extends Document> = MongoDBCollection<T>;
type MongoDBDatabaseType = MongoDBDatabase;
type NewDocumentType<T extends Document> = NewDocument<T>;
type OperationTypeType = OperationType;
type RenameEventType = RenameEvent;
type ReplaceEventType<T extends Document> = ReplaceEvent<T>;
type UpdateType = Update;
type UpdateDescriptionType = UpdateDescription;
type UpdateEventType<T extends Document> = UpdateEvent<T>;
type UpdateOptionsType = UpdateOptions;
type UpdateResultType<IdType> = UpdateResult<IdType>;
type WaitForSyncType = WaitForSync;

type GlobalDate = Date;

// IMPORTANT: This needs to match the namespace below!
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Realm {
  // TODO: Decide if we want to deprecate this as well
  export type Object<T = DefaultObject> = RealmObject<T>;
  export {
    // Pure type exports below
    AppType as App,
    AppChangeCallback,
    AppConfiguration,
    BaseConfiguration,
    BaseObjectSchema,
    BaseSyncConfiguration,
    BSONType as BSON,
    CanonicalObjectSchema,
    /** @deprecated Will be removed in v13.0.0. Please use {@link CanonicalPropertySchema} */
    CanonicalObjectSchemaProperty,
    CanonicalPropertySchema,
    CanonicalPropertiesTypes,
    ClientResetModeType as ClientResetMode,
    ClientResetFallbackCallback,
    ClientResetBeforeCallback,
    ClientResetAfterCallback,
    ClientResetManualConfiguration,
    ClientResetDiscardUnsyncedChangesConfiguration,
    ClientResetRecoverUnsyncedChangesConfiguration,
    /** @deprecated Will be removed in v13.0.0. Please use {@link ClientResetRecoverUnsyncedChangesConfiguration} */
    ClientResetRecoverUnsyncedChangesConfiguration as ClientResetRecoveryConfiguration,
    ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
    ClientResetConfig,
    CollectionChangeCallback,
    CollectionChangeSet,
    CollectionPropertyTypeName,
    CollectionType as Collection,
    CompensatingWriteErrorType as CompensatingWriteError,
    CompensatingWriteInfo,
    ConfigurationWithoutSync,
    ConfigurationWithSync,
    Configuration,
    ConnectionNotificationCallback,
    ConnectionStateType as ConnectionState,
    CredentialsType as Credentials,
    DefaultFunctionsFactory,
    DefaultUserProfileData,
    DictionaryType as Dictionary,
    DictionaryChangeCallback,
    DictionaryChangeSet,
    ErrorCallback,
    FlexibleSyncConfiguration,
    IndexDecoratorType as IndexDecorator,
    ListType as List,
    LocalAppConfiguration,
    MapToDecoratorType as MapToDecorator,
    MigrationCallback,
    Mixed,
    NumericLogLevelType as NumericLogLevel,
    ObjectChangeCallback,
    ObjectChangeSet,
    ObjectSchema,
    /** @deprecated Will be removed in v13.0.0. Please use {@link PropertySchema} */
    ObjectSchemaProperty,
    ObjectType,
    OpenRealmBehaviorConfiguration,
    OpenRealmBehaviorTypeType as OpenRealmBehaviorType,
    OpenRealmTimeOutBehaviorType as OpenRealmTimeOutBehavior,
    PartitionSyncConfiguration,
    PrimaryKey,
    PrimitivePropertyTypeName,
    ProgressDirectionType as ProgressDirection,
    ProgressModeType as ProgressMode,
    ProgressNotificationCallback,
    PropertiesTypes,
    PropertySchema,
    PropertySchemaParseErrorType as PropertySchemaParseError,
    PropertySchemaShorthand,
    PropertySchemaStrict,
    PropertyTypeName,
    ProviderTypeType as ProviderType,
    RealmFunction,
    RealmObjectConstructor,
    /** @deprecated Will be removed in v13.0.0. Please use {@link RealmObjectConstructor} */
    RealmObjectConstructor as ObjectClass,
    RelationshipPropertyTypeName,
    ResultsType as Results,
    SchemaParseErrorType as SchemaParseError,
    SessionStateType as SessionState,
    SessionStopPolicyType as SessionStopPolicy,
    SetType as Set,
    SortDescriptor,
    SSLConfigurationType as SSLConfiguration,
    SSLVerifyCallbackType as SSLVerifyCallback,
    SSLVerifyObjectType as SSLVerifyObject,
    SubscriptionSetStateType as SubscriptionSetState,
    SyncConfiguration,
    SyncErrorType as SyncError,
    TypesType as Types,
    UpdateModeType as UpdateMode,
    UserChangeCallback,
    UserStateType as UserState,
    UserType as User,
    WaitForSyncType as WaitForSync,
    GeoBox,
    GeoCircle,
    GeoPoint,
    GeoPolygon,
    CanonicalGeoPolygon,
    CanonicalGeoPoint,
    GeoPosition,
  };

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace App {
    export type Credentials = CredentialsType;
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Sync {
      export type BaseSubscriptionSet = BaseSubscriptionSetType;
      export type LogLevel = LogLevelType;
      export type NumericLogLevel = NumericLogLevelType;
      export type MutableSubscriptionSet = MutableSubscriptionSetType;
      export type PartitionValue = PartitionValueType;
      export type SubscriptionOptions = SubscriptionOptionsType;
      export type SubscriptionSet = SubscriptionSetType;
      export type SubscriptionSetState = SubscriptionSetStateType;
      /** @deprecated Please use {@link SubscriptionSetState} */
      export type SubscriptionsState = SubscriptionSetStateType;
      export type Subscription = SubscriptionType;
      export type SyncSession = SyncSessionType;
      /**
       * @deprecated Got renamed to {@SyncSession} and please use named imports
       */
      export type Session = SyncSessionType;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace BSON {
    export type ObjectId = ObjectIdType;
    export type Decimal128 = Decimal128Type;
    export type UUID = UUIDType;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Auth {
    export type EmailPasswordAuth = EmailPasswordAuthType;
    export type ApiKey = ApiKeyType;
    export type ApiKeyAuth = ApiKeyAuthType;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Services {
    export type MongoDB = MongoDBType;
    export type MongoDBDatabase = MongoDBDatabaseType;
    /** @deprecated Please read {@link https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/} */
    export type Push = PushClient;
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace MongoDB {
      export type AggregatePipelineStage = AggregatePipelineStageType;
      export type BaseChangeEvent<T extends OperationType> = BaseChangeEventType<T>;
      export type ChangeEvent<T extends Document> = ChangeEventType<T>;
      export type ChangeEventId = ChangeEventIdType;
      export type CountOptions = CountOptionsType;
      export type DeleteEvent<T extends Document> = DeleteEventType<T>;
      export type DeleteResult = DeleteResultType;
      export type Document<IdType = any> = DocumentType<IdType>;
      export type DocumentKey<IdType> = DocumentKeyType<IdType>;
      export type DocumentNamespace = DocumentNamespaceType;
      export type DropDatabaseEvent = DropDatabaseEventType;
      export type DropEvent = DropEventType;
      export type Filter = FilterType;
      export type FindOneAndModifyOptions = FindOneAndModifyOptionsType;
      export type FindOneOptions = FindOneOptionsType;
      export type FindOptions = FindOptionsType;
      export type InsertEvent<T extends Document> = InsertEventType<T>;
      export type InsertManyResult<IdType> = InsertManyResultType<IdType>;
      export type InsertOneResult<IdType> = InsertOneResultType<IdType>;
      export type InvalidateEvent = InvalidateEventType;
      export type MongoDBCollection<T extends Document> = MongoDBCollectionType<T>;
      export type NewDocument<T extends Document> = NewDocumentType<T>;
      export type OperationType = OperationTypeType;
      export type RenameEvent = RenameEventType;
      export type ReplaceEvent<T extends Document> = ReplaceEventType<T>;
      export type Update = UpdateType;
      export type UpdateDescription = UpdateDescriptionType;
      export type UpdateEvent<T extends Document> = UpdateEventType<T>;
      export type UpdateOptions = UpdateOptionsType;
      export type UpdateResult<IdType> = UpdateResultType<IdType>;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Types {
    export type Bool = boolean;
    export type String = string;
    export type Int = number;
    export type Float = number;
    export type Double = number;
    export type Decimal128 = Realm.BSON.Decimal128;
    export type ObjectId = Realm.BSON.ObjectId;
    export type UUID = Realm.BSON.UUID;
    export type Date = GlobalDate;
    export type Data = ArrayBuffer;
    export type List<T> = Realm.List<T>;
    export type Set<T> = Realm.Set<T>;
    export type Dictionary<T> = Realm.Dictionary<T>;
    export type Mixed = unknown;
    export type LinkingObjects<ObjectTypeT, LinkingPropertyName> = Realm.Results<ObjectTypeT>;
  }
}

// Exporting a deprecated global for backwards compatibility
const RealmConstructor = Realm;
declare global {
  /** @deprecated Will be removed in v13.0.0. Please use an import statement. */
  export class Realm extends RealmConstructor {}
  // IMPORTANT: This needs to match the namespace above!
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Realm {
    // TODO: Decide if we want to deprecate this as well
    export type Object<T = DefaultObject> = RealmObject<T>;
    export {
      // Pure type exports below
      AppType as App,
      AppChangeCallback,
      AppConfiguration,
      BaseConfiguration,
      BaseObjectSchema,
      BaseSyncConfiguration,
      BSONType as BSON,
      CanonicalObjectSchema,
      /** @deprecated Will be removed in v13.0.0. Please use {@link CanonicalPropertySchema} */
      CanonicalObjectSchemaProperty,
      CanonicalPropertySchema,
      CanonicalPropertiesTypes,
      ClientResetModeType as ClientResetMode,
      ClientResetFallbackCallback,
      ClientResetBeforeCallback,
      ClientResetAfterCallback,
      ClientResetManualConfiguration,
      ClientResetDiscardUnsyncedChangesConfiguration,
      ClientResetRecoverUnsyncedChangesConfiguration,
      /** @deprecated Will be removed in v13.0.0. Please use {@link ClientResetRecoverUnsyncedChangesConfiguration} */
      ClientResetRecoverUnsyncedChangesConfiguration as ClientResetRecoveryConfiguration,
      ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
      ClientResetConfig,
      CollectionChangeCallback,
      CollectionChangeSet,
      CollectionPropertyTypeName,
      CollectionType as Collection,
      CompensatingWriteErrorType as CompensatingWriteError,
      CompensatingWriteInfo,
      ConfigurationWithoutSync,
      ConfigurationWithSync,
      Configuration,
      ConnectionNotificationCallback,
      ConnectionStateType as ConnectionState,
      CredentialsType as Credentials,
      DefaultFunctionsFactory,
      DefaultUserProfileData,
      DictionaryType as Dictionary,
      DictionaryChangeCallback,
      DictionaryChangeSet,
      ErrorCallback,
      FlexibleSyncConfiguration,
      IndexDecoratorType as IndexDecorator,
      ListType as List,
      LocalAppConfiguration,
      MapToDecoratorType as MapToDecorator,
      MigrationCallback,
      Mixed,
      NumericLogLevelType as NumericLogLevel,
      ObjectChangeCallback,
      ObjectChangeSet,
      ObjectSchema,
      /** @deprecated Will be removed in v13.0.0. Please use {@link PropertySchema} */
      ObjectSchemaProperty,
      ObjectType,
      OpenRealmBehaviorConfiguration,
      OpenRealmBehaviorTypeType as OpenRealmBehaviorType,
      OpenRealmTimeOutBehaviorType as OpenRealmTimeOutBehavior,
      PartitionSyncConfiguration,
      PrimaryKey,
      PrimitivePropertyTypeName,
      ProgressDirectionType as ProgressDirection,
      ProgressModeType as ProgressMode,
      ProgressNotificationCallback,
      PropertiesTypes,
      PropertySchema,
      PropertySchemaParseErrorType as PropertySchemaParseError,
      PropertySchemaShorthand,
      PropertySchemaStrict,
      PropertyTypeName,
      ProviderTypeType as ProviderType,
      RealmFunction,
      RealmObjectConstructor,
      /** @deprecated Will be removed in v13.0.0. Please use {@link RealmObjectConstructor} */
      RealmObjectConstructor as ObjectClass,
      RelationshipPropertyTypeName,
      ResultsType as Results,
      SchemaParseErrorType as SchemaParseError,
      SessionStateType as SessionState,
      SessionStopPolicyType as SessionStopPolicy,
      SetType as Set,
      SortDescriptor,
      SSLConfigurationType as SSLConfiguration,
      SSLVerifyCallbackType as SSLVerifyCallback,
      SSLVerifyObjectType as SSLVerifyObject,
      SubscriptionSetStateType as SubscriptionSetState,
      SyncConfiguration,
      SyncErrorType as SyncError,
      TypesType as Types,
      UpdateModeType as UpdateMode,
      UserChangeCallback,
      UserStateType as UserState,
      GeoBox,
      GeoCircle,
      GeoPoint,
      GeoPolygon,
      CanonicalGeoPolygon,
      CanonicalGeoPoint,
      GeoPosition,
      UserType as User,
      WaitForSyncType as WaitForSync,
    };

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace App {
      export type Credentials = CredentialsType;
      // eslint-disable-next-line @typescript-eslint/no-namespace
      export namespace Sync {
        export type BaseSubscriptionSet = BaseSubscriptionSetType;
        export type LogLevel = LogLevelType;
        export type NumericLogLevel = NumericLogLevelType;
        export type MutableSubscriptionSet = MutableSubscriptionSetType;
        export type PartitionValue = PartitionValueType;
        export type SubscriptionOptions = SubscriptionOptionsType;
        export type SubscriptionSet = SubscriptionSetType;
        export type SubscriptionSetState = SubscriptionSetStateType;
        /** @deprecated Please use {@link SubscriptionSetState} */
        export type SubscriptionsState = SubscriptionSetStateType;
        export type Subscription = SubscriptionType;
        export type SyncSession = SyncSessionType;
        /**
         * @deprecated Got renamed to {@SyncSession} and please use named imports
         */
        export type Session = SyncSessionType;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace BSON {
      export type ObjectId = ObjectIdType;
      export type Decimal128 = Decimal128Type;
      export type UUID = UUIDType;
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Auth {
      export type EmailPasswordAuth = EmailPasswordAuthType;
      export type ApiKey = ApiKeyType;
      export type ApiKeyAuth = ApiKeyAuthType;
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Services {
      export type MongoDB = MongoDBType;
      export type MongoDBDatabase = MongoDBDatabaseType;
      /** @deprecated Please read {@link https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/} */
      export type Push = PushClient;
      // eslint-disable-next-line @typescript-eslint/no-namespace
      export namespace MongoDB {
        export type AggregatePipelineStage = AggregatePipelineStageType;
        export type BaseChangeEvent<T extends OperationType> = BaseChangeEventType<T>;
        export type ChangeEvent<T extends Document> = ChangeEventType<T>;
        export type ChangeEventId = ChangeEventIdType;
        export type CountOptions = CountOptionsType;
        export type DeleteEvent<T extends Document> = DeleteEventType<T>;
        export type DeleteResult = DeleteResultType;
        export type Document<IdType = any> = DocumentType<IdType>;
        export type DocumentKey<IdType> = DocumentKeyType<IdType>;
        export type DocumentNamespace = DocumentNamespaceType;
        export type DropDatabaseEvent = DropDatabaseEventType;
        export type DropEvent = DropEventType;
        export type Filter = FilterType;
        export type FindOneAndModifyOptions = FindOneAndModifyOptionsType;
        export type FindOneOptions = FindOneOptionsType;
        export type FindOptions = FindOptionsType;
        export type InsertEvent<T extends Document> = InsertEventType<T>;
        export type InsertManyResult<IdType> = InsertManyResultType<IdType>;
        export type InsertOneResult<IdType> = InsertOneResultType<IdType>;
        export type InvalidateEvent = InvalidateEventType;
        export type MongoDBCollection<T extends Document> = MongoDBCollectionType<T>;
        export type NewDocument<T extends Document> = NewDocumentType<T>;
        export type OperationType = OperationTypeType;
        export type RenameEvent = RenameEventType;
        export type ReplaceEvent<T extends Document> = ReplaceEventType<T>;
        export type Update = UpdateType;
        export type UpdateDescription = UpdateDescriptionType;
        export type UpdateEvent<T extends Document> = UpdateEventType<T>;
        export type UpdateOptions = UpdateOptionsType;
        export type UpdateResult<IdType> = UpdateResultType<IdType>;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Types {
      export type Bool = boolean;
      export type String = string;
      export type Int = number;
      export type Float = number;
      export type Double = number;
      export type Decimal128 = Realm.BSON.Decimal128;
      export type ObjectId = Realm.BSON.ObjectId;
      export type UUID = Realm.BSON.UUID;
      export type Date = GlobalDate;
      export type Data = ArrayBuffer;
      export type List<T> = Realm.List<T>;
      export type Set<T> = Realm.Set<T>;
      export type Dictionary<T> = Realm.Dictionary<T>;
      export type Mixed = unknown;
      export type LinkingObjects<ObjectTypeT, LinkingPropertyName> = Realm.Results<ObjectTypeT>;
    }
  }
}

//Set default logger and log level.
Realm.setLogger(defaultLogger);
Realm.setLogLevel(defaultLoggerLevel);

// Patch the global at runtime
let warnedAboutGlobalRealmUse = false;
Object.defineProperty(safeGlobalThis, "Realm", {
  get() {
    if (flags.THROW_ON_GLOBAL_REALM) {
      throw new Error(
        "Accessed global Realm, please update your code to ensure you import Realm via a named import:\nimport { Realm } from 'realm';",
      );
    } else if (!warnedAboutGlobalRealmUse) {
      // eslint-disable-next-line no-console
      console.warn(
        "Your app is relying on a Realm global, which will be removed in realm-js v13, please update your code to ensure you import Realm via a named import:\n\n",
        'import { Realm } from "realm"; // For ES Modules\n',
        'const { Realm } = require("realm"); // For CommonJS\n\n',
        "To determine where, put this in the top of your index file:\n",
        `import { flags } from "realm";\n`,
        `flags.THROW_ON_GLOBAL_REALM = true`,
      );
      warnedAboutGlobalRealmUse = true;
    }
    return RealmConstructor;
  },
  configurable: false,
});
