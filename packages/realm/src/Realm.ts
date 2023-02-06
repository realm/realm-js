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
  ApiKey,
  ApiKeyAuth,
  App,
  AppChangeCallback,
  AppConfiguration,
  BSON,
  BaseConfiguration,
  BaseObjectSchema,
  BaseSubscriptionSet,
  BaseSyncConfiguration,
  CanonicalObjectSchema,
  CanonicalObjectSchemaProperty,
  CanonicalPropertiesTypes,
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
  Configuration,
  ConfigurationWithSync,
  ConfigurationWithoutSync,
  ConnectionNotificationCallback,
  ConnectionState,
  Constructor,
  Credentials,
  DefaultFunctionsFactory,
  DefaultObject,
  DefaultUserProfileData,
  Dictionary,
  DictionaryChangeCallback,
  DictionaryChangeSet,
  EmailPasswordAuth,
  ErrorCallback,
  FlexibleSyncConfiguration,
  INTERNAL,
  InitialSubscriptions,
  List,
  LocalAppConfiguration,
  LogLevel,
  MigrationCallback,
  MongoClient,
  NumericLogLevel,
  ObjectChangeCallback,
  ObjectChangeSet,
  ObjectSchema,
  ObjectSchemaProperty,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  OrderedCollection,
  PartitionSyncConfiguration,
  PartitionValue,
  PrimaryKey,
  ProgressDirection,
  ProgressMode,
  ProgressNotificationCallback,
  ProgressRealmPromise,
  PropertiesTypes,
  PropertySchema,
  PropertySchemaShorthand,
  ProviderType,
  PushClient,
  RealmEvent,
  RealmFunction,
  RealmInsertionModel,
  RealmListenerCallback,
  RealmListeners,
  RealmObject,
  RealmObjectConstructor,
  RealmSet,
  Results,
  SessionState,
  SessionStopPolicy,
  SortDescriptor,
  Subscription,
  SubscriptionOptions,
  SubscriptionSet,
  SubscriptionsState,
  SyncConfiguration,
  SyncError,
  SyncSession,
  TypeAssertionError,
  Types,
  UpdateMode,
  User,
  UserChangeCallback,
  UserState,
  assert,
  binding,
  extendDebug,
  fromBindingRealmSchema,
  fs,
  normalizeObjectSchema,
  normalizeRealmSchema,
  toArrayBuffer,
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

// Using a set of weak refs to avoid prevention of garbage collection
const RETURNED_REALMS = new Set<binding.WeakRef<binding.Realm>>();
const NOT_VERSIONED = 18446744073709551615n;

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
  /** @deprecated Please use named imports */
  public static App = App;
  /** @deprecated Please use named imports */
  public static Auth = { EmailPasswordAuth, ApiKeyAuth };
  /** @deprecated Please use named imports */
  public static BSON = BSON;
  /** @deprecated Please use named imports */
  public static ClientResetMode = ClientResetMode;
  /** @deprecated Please use named imports */
  public static Collection = Collection;
  /** @deprecated Please use named imports */
  public static ConnectionState = ConnectionState;
  /** @deprecated Please use named imports */
  public static Dictionary = Dictionary;
  /** @deprecated Please use named imports */
  public static List = List;
  // TODO: Decide if we want to deprecate this as well
  public static Object = RealmObject;
  /** @deprecated Please use named imports */
  public static OrderedCollection = OrderedCollection;
  /** @deprecated Please use named imports */
  public static OpenRealmBehaviorType = OpenRealmBehaviorType;
  /** @deprecated Please use named imports */
  public static OpenRealmTimeOutBehavior = OpenRealmTimeOutBehavior;
  /** @deprecated Please use named imports */
  public static ProgressDirection = ProgressDirection;
  /** @deprecated Please use named imports */
  public static ProgressMode = ProgressMode;
  /** @deprecated Please use named imports */
  public static ProviderType = ProviderType;
  /** @deprecated Please use named imports */
  public static Results = Results;
  /** @deprecated Please use named imports */
  public static SessionState = SessionState;
  /** @deprecated Please use named imports */
  public static SessionStopPolicy = SessionStopPolicy;
  /** @deprecated Please use named imports */
  public static Set = RealmSet;
  /** @deprecated Please use named imports */
  public static SyncError = SyncError;
  /** @deprecated Please use named imports */
  public static Types = Types;
  /** @deprecated Please use named imports */
  public static UpdateMode = UpdateMode;
  /** @deprecated Please use named imports */
  public static User = User;
  /** @deprecated Please use named imports */
  public static UserState = UserState;

  public static defaultPath = Realm.normalizePath("default.realm");

  /**
   * Clears the state by closing and deleting any Realm in the default directory and logout all users.
   * @private Not a part of the public API: It's primarily used from the library's tests.
   */
  public static clearTestState(): void {
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
    fs.removeRealmFilesFromDirectory(defaultDirectoryPath);

    binding.App.clearCachedApps();
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
    if (schemaVersion === NOT_VERSIONED) {
      return -1;
    } else {
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

  private static determinePath(config: Configuration): string {
    if (config.path || !config.sync || config.openSyncedRealmLocally) {
      return Realm.normalizePath(config.path);
    } else {
      // TODO: Determine if it's okay to get the syncManager through the app instead of the user:
      // return user->m_user->sync_manager()->path_for_realm(*(config.sync_config));
      const bindingSyncConfig = toBindingSyncConfig(config.sync);
      return config.sync.user.app.internal.syncManager.pathForRealm(bindingSyncConfig);
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

      this.internal = internalConfig.internal ?? binding.Realm.getSharedRealm(bindingConfig);

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
      RETURNED_REALMS.add(new binding.WeakRef(this.internal));
    } else {
      const { internal, schemaExtras } = internalConfig;
      assert.instanceOf(internal, binding.Realm, "internal");
      this.internal = internal;
      this.schemaExtras = schemaExtras || {};
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
    this.syncSession?.resetInternal();
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
  create<T = DefaultObject>(type: string, values: RealmInsertionModel<T>, mode?: UpdateMode.Never): RealmObject<T> & T;
  create<T = DefaultObject>(
    type: string,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode: UpdateMode.All | UpdateMode.Modified | boolean,
  ): RealmObject<T> & T;
  create<T extends RealmObject>(type: Constructor<T>, values: RealmInsertionModel<T>, mode?: UpdateMode.Never): T;
  create<T extends RealmObject>(
    type: Constructor<T>,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode: UpdateMode.All | UpdateMode.Modified | boolean,
  ): T;
  create<T extends RealmObject>(
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
  delete(subject: RealmObject | RealmObject[] | List | Results): void {
    assert.inTransaction(this, "Can only delete objects within a transaction.");
    assert.object(subject, "subject");
    if (subject instanceof RealmObject) {
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
      this.internal.updateSchema(newSchema, this.internal.schemaVersion + 1n, null, null, true);
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
  objectForPrimaryKey<T extends RealmObject = RealmObject & DefaultObject>(
    type: Constructor<T>,
    primaryKey: T[keyof T],
  ): T | null;
  objectForPrimaryKey<T extends RealmObject>(type: string | Constructor<T>, primaryKey: unknown): T | null {
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

    const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
    try {
      const objKey = binding.stringToObjKey(objectKey);
      const obj = table.tryGetObject(objKey);
      const result = wrapObject(obj) as T;
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
  objects<T extends RealmObject = RealmObject & DefaultObject>(type: Constructor<T>): Results<T>;
  objects<T extends RealmObject>(type: string | Constructor<T>): Results<T> {
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
      throw assert.never(eventName, "eventName");
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
    this.internal.updateSchema(bindingSchema, this.internal.schemaVersion + 1n, null, null, true);
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

type AppType = App;
type BSONType = typeof BSON;
type ClientResetModeType = ClientResetMode;
type CollectionType<
  KeyType = unknown,
  ValueType = unknown,
  EntryType = [KeyType, ValueType],
  T = ValueType,
  ChangeCallbackType = unknown,
> = Collection<KeyType, ValueType, EntryType, T, ChangeCallbackType>;
type ConnectionStateType = ConnectionState;
type CredentialsType = Credentials;
type DictionaryType<T> = Dictionary<T>;
type ListType<T> = List<T>;
type Mixed = unknown;
type ObjectType = string | RealmObjectConstructor;
type OpenRealmBehaviorTypeType = OpenRealmBehaviorType;
type OpenRealmTimeOutBehaviorType = OpenRealmTimeOutBehavior;
type ProgressDirectionType = ProgressDirection;
type ProgressModeType = ProgressMode;
type ProviderTypeType = ProviderType;
type ResultsType<T> = Results<T>;
type SessionStateType = SessionState;
type SessionStopPolicyType = SessionStopPolicy;
type SetType<T> = RealmSet<T>;
type SyncErrorType = SyncError;
type TypesType = typeof Types;
type UpdateModeType = UpdateMode;
type UserType = User;
type UserStateType = UserState;

type BaseSubscriptionSetType = BaseSubscriptionSet;
type LogLevelType = LogLevel;
type NumericLogLevelType = NumericLogLevel;
type PartitionValueType = PartitionValue;
type SubscriptionOptionsType = SubscriptionOptions;
type SubscriptionSetType = SubscriptionSet;
type SubscriptionsStateType = SubscriptionsState;
type SubscriptionType = Subscription;
type SyncSessionType = SyncSession;

type ObjectIdType = BSON.ObjectId;
type Decimal128Type = BSON.Decimal128;
type UUIDType = BSON.UUID;

type ApiKeyType = ApiKey;
type EmailPasswordAuthType = EmailPasswordAuth;
type ApiKeyAuthType = ApiKeyAuth;

type GlobalDate = Date;

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Realm {
  // TODO: Decide if we want to deprecate this as well
  export type Object<T = DefaultObject> = RealmObject<T>;
  export {
    // Pure type exports below
    /** @deprecated Please use named imports */
    AppType as App,
    /** @deprecated Please use named imports */
    AppChangeCallback,
    /** @deprecated Please use named imports */
    AppConfiguration,
    /** @deprecated Please use named imports */
    BaseConfiguration,
    /** @deprecated Please use named imports */
    BaseObjectSchema,
    /** @deprecated Please use named imports */
    BaseSyncConfiguration,
    /** @deprecated Please use named imports */
    BSONType as BSON,
    /** @deprecated Please use named imports */
    CanonicalObjectSchemaProperty,
    /** @deprecated Please use named imports */
    CanonicalPropertiesTypes,
    /** @deprecated Please use named imports */
    ClientResetModeType as ClientResetMode,
    /** @deprecated Please use named imports */
    ClientResetFallbackCallback,
    /** @deprecated Please use named imports */
    ClientResetBeforeCallback,
    /** @deprecated Please use named imports */
    ClientResetAfterCallback,
    /** @deprecated Please use named imports */
    ClientResetManualConfiguration,
    /** @deprecated Please use named imports */
    ClientResetDiscardUnsyncedChangesConfiguration,
    /** @deprecated Please use named imports */
    ClientResetRecoverUnsyncedChangesConfiguration,
    /**
     * This type got renamed to {@link ClientResetRecoverUnsyncedChangesConfiguration}
     * @deprecated Please use named imports
     */
    ClientResetRecoverUnsyncedChangesConfiguration as ClientResetRecoveryConfiguration,
    /** @deprecated Please use named imports */
    ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
    /** @deprecated Please use named imports */
    ClientResetConfig,
    /** @deprecated Please use named imports */
    CollectionChangeCallback,
    /** @deprecated Please use named imports */
    CollectionChangeSet,
    /** @deprecated Please use named imports */
    CollectionType as Collection,
    /** @deprecated Please use named imports */
    ConfigurationWithoutSync,
    /** @deprecated Please use named imports */
    ConfigurationWithSync,
    /** @deprecated Please use named imports */
    Configuration,
    /** @deprecated Please use named imports */
    ConnectionNotificationCallback,
    /** @deprecated Please use named imports */
    ConnectionStateType as ConnectionState,
    /** @deprecated Please use named imports */
    DefaultFunctionsFactory,
    /** @deprecated Please use named imports */
    DefaultUserProfileData,
    /** @deprecated Please use named imports */
    DictionaryType as Dictionary,
    /** @deprecated Please use named imports */
    DictionaryChangeCallback,
    /** @deprecated Please use named imports */
    DictionaryChangeSet,
    /** @deprecated Please use named imports */
    ErrorCallback,
    /** @deprecated Please use named imports */
    FlexibleSyncConfiguration,
    /** @deprecated Please use named imports */
    ListType as List,
    /** @deprecated Please use named imports */
    LocalAppConfiguration,
    /** @deprecated Please use named imports */
    MigrationCallback,
    /** @deprecated Please use named imports */
    Mixed,
    /** @deprecated Please use named imports */
    RealmFunction,
    /** @deprecated Please use named imports */
    RealmObjectConstructor,
    /**
     * This type got renamed to RealmObjectConstructor
     * @deprecated Please use named imports
     */
    RealmObjectConstructor as ObjectClass,
    /** @deprecated Please use named imports */
    ObjectChangeCallback,
    /** @deprecated Please use named imports */
    ObjectChangeSet,
    /** @deprecated Please use named imports */
    ObjectSchema,
    /**
     * @deprecated Will be removed in v13.0.0. Please use {@link PropertySchema}.
     */
    ObjectSchemaProperty,
    /** @deprecated Please use named imports */
    ObjectType,
    /** @deprecated Please use named imports */
    OpenRealmBehaviorConfiguration,
    /** @deprecated Please use named imports */
    OpenRealmBehaviorTypeType as OpenRealmBehaviorType,
    /** @deprecated Please use named imports */
    OpenRealmTimeOutBehaviorType as OpenRealmTimeOutBehavior,

    /** @deprecated Please use named imports */
    PartitionSyncConfiguration,
    /** @deprecated Please use named imports */
    PrimaryKey,
    /** @deprecated Please use named imports */
    ProgressDirectionType as ProgressDirection,
    /** @deprecated Please use named imports */
    ProgressModeType as ProgressMode,
    /** @deprecated Please use named imports */
    ProgressNotificationCallback,
    /** @deprecated Please use named imports */
    PropertiesTypes,
    /** @deprecated Please use named imports */
    PropertySchema,
    /** @deprecated Please use named imports */
    PropertySchemaShorthand,
    /** @deprecated Please use named imports */
    ProviderTypeType as ProviderType,
    /** @deprecated Please use named imports */
    ResultsType as Results,
    /** @deprecated Please use named imports */
    SessionStateType as SessionState,
    /** @deprecated Please use named imports */
    SessionStopPolicyType as SessionStopPolicy,
    /** @deprecated Please use named imports */
    SetType as Set,
    // TODO: Add these once we've implemented the SSL config for the sync client
    // SSLVerifyObject,
    // SSLVerifyCallback,
    // SSLConfiguration,
    /** @deprecated Please use named imports */
    SortDescriptor,
    /** @deprecated Please use named imports */
    SyncConfiguration,
    /** @deprecated Please use named imports */
    SyncErrorType as SyncError,
    /** @deprecated Please use named imports */
    TypesType as Types,
    /** @deprecated Please use named imports */
    UpdateModeType as UpdateMode,
    /** @deprecated Please use named imports */
    UserType as User,
    /** @deprecated Please use named imports */
    UserChangeCallback,
    /** @deprecated Please use named imports */
    UserStateType as UserState,
  };

  /** @deprecated Please use named imports */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace App {
    /** @deprecated Please use named imports */
    export type Credentials = CredentialsType;
    /** @deprecated Please use named imports */
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Sync {
      /** @deprecated Please use named imports */
      export type BaseSubscriptionSet = BaseSubscriptionSetType;
      /** @deprecated Please use named imports */
      export type LogLevel = LogLevelType;
      /** @deprecated Please use named imports */
      export type NumericLogLevel = NumericLogLevelType;
      /** @deprecated Please use named imports */
      export type PartitionValue = PartitionValueType;
      /** @deprecated Please use named imports */
      export type SubscriptionOptions = SubscriptionOptionsType;
      /** @deprecated Please use named imports */
      export type SubscriptionSet = SubscriptionSetType;
      /** @deprecated Please use named imports */
      export type SubscriptionsState = SubscriptionsStateType;
      /** @deprecated Please use named imports */
      export type Subscription = SubscriptionType;
      /** @deprecated Please use named imports */
      export type SyncSession = SyncSessionType;
      /**
       * @deprecated Got renamed to {@SyncSession} and please use named imports
       */
      export type Session = SyncSessionType;
    }
  }

  /** @deprecated Please use named imports */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace BSON {
    /** @deprecated Please use named imports */
    export type ObjectId = ObjectIdType;
    /** @deprecated Please use named imports */
    export type Decimal128 = Decimal128Type;
    /** @deprecated Please use named imports */
    export type UUID = UUIDType;
  }

  /** @deprecated Please use named imports */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Auth {
    /**
     * @deprecated Got renamed to {@link EmailPasswordAuth} and please use named imports
     */
    export type EmailPasswordAuth = EmailPasswordAuthType;
    /** @deprecated Please use named imports */
    export type ApiKey = ApiKeyType;
    /**
     * @deprecated Got renamed to {@link ApiKeyAuth} and please use named imports
     */
    export type ApiKeyAuth = ApiKeyAuthType;
  }

  /** @deprecated Please use named imports */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Services {
    // TODO: Fill in once the MongoDB client has stabilized

    /**
     * @deprecated Got renamed to {@link PushClient} and please use named imports
     */
    export type Push = PushClient;
  }

  /** @deprecated Please use named imports */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Types {
    /** @deprecated Please use named imports */
    export type Bool = boolean;
    /** @deprecated Please use named imports */
    export type String = string;
    /** @deprecated Please use named imports */
    export type Int = number;
    /** @deprecated Please use named imports */
    export type Float = number;
    /** @deprecated Please use named imports */
    export type Double = number;
    /** @deprecated Please use named imports */
    export type Decimal128 = Realm.BSON.Decimal128;
    /** @deprecated Please use named imports */
    export type ObjectId = Realm.BSON.ObjectId;
    /** @deprecated Please use named imports */
    export type UUID = Realm.BSON.UUID;
    /** @deprecated Please use named imports */
    export type Date = GlobalDate;
    /** @deprecated Please use named imports */
    export type Data = ArrayBuffer;
    /** @deprecated Please use named imports */
    export type List<T> = Realm.List<T>;
    /** @deprecated Please use named imports */
    export type Set<T> = Realm.Set<T>;
    /** @deprecated Please use named imports */
    export type Dictionary<T> = Realm.Dictionary<T>;
    /** @deprecated Please use named imports */
    export type Mixed = unknown;
    /** @deprecated Please use named imports */
    export type LinkingObjects<ObjectTypeT, LinkingPropertyName> = Realm.Results<ObjectTypeT>;
  }
}
