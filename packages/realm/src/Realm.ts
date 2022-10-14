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

import * as binding from "./binding";
import { BSON } from "./bson";

import { getInternal } from "./internal";
import {
  fromBindingSchema,
  toBindingSchema,
  CanonicalObjectSchema,
  DefaultObject,
  normalizeRealmSchema,
  ObjectSchema,
  Constructor,
  RealmObjectConstructor,
} from "./schema";
import { fs } from "./platform";

import { Object as RealmObject, UpdateMode } from "./Object";
import { Results } from "./Results";
import { RealmInsertionModel } from "./InsertionModel";
import { Configuration } from "./Configuration";
import { ClassMap } from "./ClassMap";
import { List } from "./List";
import { App } from "./App";
import { validateConfiguration, validateObjectSchema, validateRealmSchema } from "./validation/configuration";
import { Collection } from "./Collection";
import { Dictionary } from "./Dictionary";
import { Set as RealmSet } from "./Set";
import { assert } from "./assert";
import { ClassHelpers } from "./ClassHelpers";
import { OrderedCollection } from "./OrderedCollection";
import { SchemaMode } from "./binding";
import { normalizeObjectSchema } from "./schema/normalize";

type RealmSchemaExtra = Record<string, ObjectSchemaExtra | undefined>;

type ObjectSchemaExtra = {
  constructor?: RealmObjectConstructor;
  defaults: Record<string, unknown>;
  // objectTypes: Record<string, unknown>;
};

// Using a set of weak refs to avoid prevention of garbage collection
const RETURNED_REALMS = new Set<WeakRef<binding.Realm>>();
const NOT_VERSIONED = 18446744073709551615n;

export class Realm {
  public static Object = RealmObject;
  public static Collection = Collection;
  public static OrderedCollection = OrderedCollection;
  public static Results = Results;
  public static List = List;
  public static Dictionary = Dictionary;
  public static Set = RealmSet;
  public static App = App;
  public static UpdateMode = UpdateMode;
  public static BSON = BSON;

  public static get defaultPath() {
    // We can't simply initialize a `public static defaultPath = Realm.normalizePath("default.realm")`
    // since the platform utils aren't injected when this class is created.
    return Realm.defaultPathOverride || Realm.normalizePath("default.realm");
  }

  public static set defaultPath(path: string) {
    Realm.defaultPathOverride = path;
  }

  public static clearTestState(): void {
    // Close any realms not already closed
    for (const weakRealm of RETURNED_REALMS) {
      const realm = weakRealm.deref();
      if (realm && !realm.isClosed) {
        realm.close();
      }
    }
    RETURNED_REALMS.clear();
    // Delete all Realm files in the default directory
    const defaultDirectoryPath = fs.getDefaultDirectoryPath();
    for (const dirent of fs.readDirectory(defaultDirectoryPath)) {
      const direntPath = fs.joinPaths(defaultDirectoryPath, dirent.name);
      if (dirent.isDirectory() && dirent.name.endsWith(".realm.management")) {
        fs.removeDirectory(direntPath);
      } else if (
        dirent.name.endsWith(".realm") ||
        dirent.name.endsWith(".realm.note") ||
        dirent.name.endsWith(".realm.lock") ||
        dirent.name.endsWith(".realm.log")
      ) {
        fs.removeFile(direntPath);
      }
    }
  }

  public static deleteFile(config: Configuration): void {
    const path = Realm.determinePath(config);
    fs.removeFile(path);
    fs.removeFile(path + ".lock");
    fs.removeFile(path + ".note");
    fs.removeDirectory(path + ".management");
  }

  public static exists(arg: Configuration | string = {}): boolean {
    const config = typeof arg === "string" ? { path: arg } : arg;
    validateConfiguration(config);
    const path = Realm.determinePath(config);
    return fs.exists(path);
  }

  public static async open(arg: Configuration | string = {}) {
    const config = typeof arg === "string" ? { path: arg } : arg;
    validateConfiguration(config);
    if (!config.sync) {
      return new Realm(config);
    }
    throw new Error("Not yet supported");
  }

  /**
   * Get the current schema version of the Realm at the given path.
   * @param  {string} path
   * @param  {any} encryptionKey?
   * @returns number
   */
  public static schemaVersion(path: string, encryptionKey?: ArrayBuffer | ArrayBufferView): number {
    const config: Configuration = { path };
    if (encryptionKey) {
      throw new Error("Not yet supported");
    }
    const absolutePath = Realm.determinePath(config);
    const schemaVersion = binding.Realm.getSchemaVersion({ path: absolutePath });
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
   * @param {Realm.ObjectSchema} objectSchema Schema describing the object that should be created.
   */
  public static createTemplateObject<T extends Record<string, unknown>>(objectSchema: Realm.ObjectSchema): T {
    validateObjectSchema(objectSchema);
    const normalizedSchema = normalizeObjectSchema(objectSchema);
    const result: Record<string, unknown> = {};

    for (const [key, property] of Object.entries(normalizedSchema.properties)) {
      // if optional is set, it wil take precedence over any `?` set on the type parameter
      if (property.optional) {
        continue;
      }

      // If a default value is explicitly set, always set the property
      if (typeof property.default !== "undefined") {
        result[key] = property.default;
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

  private static defaultPathOverride?: string;

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
    return Realm.normalizePath(config.path);
  }

  private static extractSchemaExtras(schemas: CanonicalObjectSchema[]): RealmSchemaExtra {
    return Object.fromEntries(
      schemas.map((schema) => {
        const defaults = Object.fromEntries(
          Object.entries(schema.properties).map(([name, property]) => {
            return [name, property.default];
          }),
        );
        return [schema.name, { defaults, constructor: schema.constructor }];
      }),
    );
  }

  /**
   * The Realms's representation in the binding.
   * @internal
   */
  public internal!: binding.Realm;

  private schemaExtras: RealmSchemaExtra;
  private classes: ClassMap;

  constructor();
  constructor(path: string);
  constructor(config: Configuration);
  constructor(arg: Configuration | string = {}) {
    const config = typeof arg === "string" ? { path: arg } : arg;
    validateConfiguration(config);

    const normalizedSchema = config.schema && normalizeRealmSchema(config.schema);
    const bindingSchema = normalizedSchema && toBindingSchema(normalizedSchema);
    this.schemaExtras = Realm.extractSchemaExtras(normalizedSchema || []);

    const { fifoFilesFallbackPath, shouldCompactOnLaunch, inMemory, readOnly } = config;

    const path = Realm.determinePath(config);
    const internal = binding.Realm.getSharedRealm({
      path,
      fifoFilesFallbackPath,
      schema: bindingSchema,
      inMemory: inMemory === true,
      schemaMode: readOnly === true ? SchemaMode.Immutable : undefined,
      schemaVersion: config.schema
        ? typeof config.schemaVersion === "number"
          ? BigInt(config.schemaVersion)
          : 0n
        : undefined,
      shouldCompactOnLaunchFunction: shouldCompactOnLaunch
        ? (totalBytes, usedBytes) => {
            return shouldCompactOnLaunch(Number(totalBytes), Number(usedBytes));
          }
        : undefined,
    });

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
        value: internal,
      },
    });

    RETURNED_REALMS.add(new WeakRef(internal));
    this.classes = new ClassMap(this, internal.schema, this.schema);
  }

  get empty(): boolean {
    // ObjectStore::is_empty(realm->read_group())
    throw new Error("Not yet implemented");
  }

  get path(): string {
    return this.internal.config.path;
  }

  get readOnly(): boolean {
    return this.internal.config.schemaMode === binding.SchemaMode.Immutable;
  }

  get inMemory(): boolean {
    return this.internal.config.inMemory;
  }

  get schema(): CanonicalObjectSchema[] {
    const schemas = fromBindingSchema(this.internal.schema);
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

  get schemaVersion(): number {
    return Number(this.internal.schemaVersion);
  }

  get isInTransaction(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isInTransaction;
  }

  get isClosed(): boolean {
    // TODO: Consider keeping a local state in JS for this
    return this.internal.isClosed;
  }

  get syncSession(): any {
    throw new Error("Not yet implemented");
  }

  get subscriptions(): any {
    throw new Error("Not yet implemented");
  }

  close(): void {
    this.internal.close();
  }

  // TODO: Fully support update mode
  // TODO: Support embedded objects and asymmetric sync
  // TODO: Rollback by deleting the object if any property assignment fails (fixing #2638)
  create<T = DefaultObject>(type: string, values: RealmInsertionModel<T>, mode?: UpdateMode.Never): RealmObject<T> & T;
  create<T = DefaultObject>(
    type: string,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode: UpdateMode.All | UpdateMode.Modified,
  ): RealmObject<T> & T;
  create<T extends RealmObject>(type: Constructor<T>, values: RealmInsertionModel<T>, mode?: UpdateMode.Never): T;
  create<T extends RealmObject>(
    type: Constructor<T>,
    values: Partial<T> | Partial<RealmInsertionModel<T>>,
    mode: UpdateMode.All | UpdateMode.Modified,
  ): T;
  create<T extends RealmObject>(
    type: string | Constructor<T>,
    values: DefaultObject,
    mode: UpdateMode = UpdateMode.Never,
  ) {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1260-L1321
    if (values instanceof RealmObject && !getInternal(values)) {
      throw new Error("Cannot create an object from a detached Realm.Object instance");
    }
    if (!Object.values(UpdateMode).includes(mode)) {
      throw new Error("Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.");
    }
    this.internal.verifyOpen();
    const helpers = this.classes.getHelpers(type);
    return RealmObject.create(this, values, mode, { helpers });
  }

  delete(subject: RealmObject | RealmObject[] | List | Results): void {
    if (subject instanceof RealmObject) {
      const { objectSchema } = this.classes.getHelpers(subject);
      const obj = getInternal(subject);
      const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
      table.removeObject(obj.key);
    } else {
      throw new Error("Not yet implemented");
    }
  }

  deleteModel(): void {
    throw new Error("Not yet implemented");
  }

  deleteAll(): void {
    assert.inTransaction(this);
    for (const objectSchema of this.internal.schema) {
      const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
      table.clear();
    }
  }

  objectForPrimaryKey<T>(type: string, primaryKey: T[keyof T]): RealmObject<T> & T;
  objectForPrimaryKey<T extends RealmObject>(type: Constructor<T>, primaryKey: T[keyof T]): T;
  objectForPrimaryKey<T extends RealmObject>(type: string | Constructor<T>, primaryKey: string[]): T {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1240-L1258
    const { objectSchema, properties, wrapObject } = this.classes.getHelpers(type);
    if (!objectSchema.primaryKey) {
      throw new Error(`Expected a primary key on "${objectSchema.name}"`);
    }
    const table = binding.Helpers.getTable(this.internal, objectSchema.tableKey);
    const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey, undefined);
    try {
      const obj = table.getObjectWithPrimaryKey(value);
      return wrapObject(obj) as T;
    } catch (err) {
      // TODO: Match on something else than the error message, when exposed by the binding
      if (err instanceof Error && err.message.startsWith("No object with key")) {
        throw new Error(`No '${objectSchema.name}' with key '${primaryKey}'`);
      } else {
        throw err;
      }
    }
  }

  objects<T>(type: string): Results<RealmObject & T>;
  objects<T extends RealmObject = RealmObject>(type: Constructor<T>): Results<T>;
  objects<T extends RealmObject = RealmObject>(type: string | Constructor<T>): Results<T> {
    const { objectSchema, wrapObject } = this.classes.getHelpers(type);
    if (objectSchema.tableType === binding.TableType.Embedded) {
      throw new Error("You cannot query an embedded object.");
    } else if (objectSchema.tableType === binding.TableType.TopLevelAsymmetric) {
      throw new Error("You cannot query an asymmetric class.");
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
        return getInternal(value);
      },
    });
  }

  addListener(): unknown {
    throw new Error("Not yet implemented");
  }

  removeListener(): unknown {
    throw new Error("Not yet implemented");
  }

  removeAllListeners(): unknown {
    throw new Error("Not yet implemented");
  }

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

  beginTransaction(): void {
    this.internal.beginTransaction();
  }

  commitTransaction(): void {
    this.internal.commitTransaction();
  }

  cancelTransaction(): void {
    this.internal.cancelTransaction();
  }

  compact(): boolean {
    throw new Error("Not yet implemented");
  }

  writeCopyTo(): unknown {
    throw new Error("Not yet implemented");
  }

  _updateSchema(schema: Realm.ObjectSchema[]): void {
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
}

// Declare the Realm namespace for backwards compatibility

// We need this alias because of https://github.com/Swatinem/rollup-plugin-dts/issues/223
type CollectionType<T> = Collection<T>;
type OrderedCollectionType<T> = OrderedCollection<T>;
type ResultsType<T> = Results<T>;
type ListType<T> = List<T>;
type DictionaryType<T> = Dictionary<T>;
type SetType<T> = RealmSet<T>;
type AppType = App;
type UpdateModeType = UpdateMode;
type ObjectSchemaType = ObjectSchema;
type BSONType = typeof BSON;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Realm {
  export type Object<T = DefaultObject> = RealmObject<T>;
  export type Collection<T = unknown> = CollectionType<T>;
  export type OrderedCollection<T = unknown> = OrderedCollectionType<T>;
  export type Results<T = unknown> = ResultsType<T>;
  export type List<T = unknown> = ListType<T>;
  export type Dictionary<T = unknown> = DictionaryType<T>;
  export type Set<T = unknown> = SetType<T>;
  export type App = AppType;
  export type UpdateMode = UpdateModeType;
  export type ObjectSchema = ObjectSchemaType;
  export type Mixed = unknown;
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace BSON {
    export type ObjectId = InstanceType<BSONType["ObjectId"]>;
    export type Decimal128 = InstanceType<BSONType["Decimal128"]>;
    export type UUID = InstanceType<BSONType["UUID"]>;
  }
}
