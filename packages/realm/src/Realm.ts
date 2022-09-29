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

import { INTERNAL, getInternal } from "./internal";
import {
  fromBindingSchema,
  toBindingSchema,
  CanonicalObjectSchema,
  DefaultObject,
  normalizeRealmSchema,
  ObjectSchema,
  Constructor,
} from "./schema";
import { fs } from "./platform";

import { Object as RealmObject } from "./Object";
import { Results } from "./Results";
import { RealmInsertionModel } from "./InsertionModel";
import { Configuration } from "./Configuration";
import { ClassMap, RealmSchemaExtra } from "./ClassMap";
import { List } from "./List";
import { App } from "./App";
import { validateConfiguration } from "./validation/configuration";
import { Collection } from "./Collection";
import { ClassHelpers } from "./ClassHelpers";
import { Dictionary } from "./Dictionary";

export enum UpdateMode {
  Never = "never",
  Modified = "modified",
  All = "all",
}

// Using a set of weak refs to avoid prevention of garbage collection
const RETURNED_REALMS = new Set<WeakRef<binding.Realm>>();

export class Realm {
  public static Object = RealmObject;
  public static Collection = Collection;
  public static Results = Results;
  public static List = List;
  public static Dictionary = Dictionary;
  public static App = App;
  public static UpdateMode = UpdateMode;
  public static BSON = BSON;

  public static get defaultPath() {
    return Realm.normalizePath("default.realm");
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
  public [INTERNAL]!: binding.Realm;

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

    const path = Realm.determinePath(config);
    const internal = binding.Realm.getSharedRealm({
      path,
      fifoFilesFallbackPath: config.fifoFilesFallbackPath,
      schema: bindingSchema,
      inMemory: config.inMemory === true,
      schemaVersion: config.schema
        ? typeof config.schemaVersion === "number"
          ? BigInt(config.schemaVersion)
          : 0n
        : undefined,
    });
    // console.log("Did open!");

    Object.defineProperties(this, {
      classes: {
        enumerable: false,
        configurable: false,
        writable: true,
      },
      [INTERNAL]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
    });

    RETURNED_REALMS.add(new WeakRef(internal));
    this.classes = new ClassMap(this, internal.schema, this.schemaExtras);
  }

  get empty(): boolean {
    // ObjectStore::is_empty(realm->read_group())
    throw new Error("Not yet implemented");
  }

  get path(): string {
    return this[INTERNAL].config.path;
  }

  get readOnly(): boolean {
    // schema_mode == SchemaMode::Immutable
    throw new Error("Not yet implemented");
  }

  // TODO: Stitch in the defaults and constructors stored in this.schemaExtras
  get schema(): CanonicalObjectSchema[] {
    return fromBindingSchema(this[INTERNAL].schema);
  }

  get schemaVersion(): number {
    return Number(this[INTERNAL].schemaVersion);
  }

  get isInTransaction(): boolean {
    return this[INTERNAL].isInTransaction;
  }

  get isClosed(): boolean {
    return this[INTERNAL].isClosed;
  }

  get syncSession(): any {
    throw new Error("Not yet implemented");
  }

  get subscriptions(): any {
    throw new Error("Not yet implemented");
  }

  close(): void {
    this[INTERNAL].close();
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
    this[INTERNAL].verifyOpen();
    const helpers = this.classes.getHelpers(type);

    // Create the underlying object
    const obj = this.createObj(helpers, values, mode);
    const result = helpers.wrapObject(obj) as unknown as DefaultObject;

    // Persist any values provided
    // TODO: Consider using the `converters` directly to improve performance
    for (const property of helpers.objectSchema.persistedProperties) {
      if (property.isPrimary) {
        continue; // Skip setting this, as we already provided it on object creation
      }
      const propertyValue = values[property.name];
      if (typeof propertyValue !== "undefined" && propertyValue !== null) {
        result[property.name] = propertyValue;
      } else {
        const defaultValue = helpers.properties.get(property.name).default;
        if (typeof defaultValue !== "undefined") {
          result[property.name] = defaultValue;
        }
      }
    }

    return result;
  }

  private createObj<T extends RealmObject>(
    helpers: ClassHelpers<T>,
    values: DefaultObject,
    mode: UpdateMode,
  ): binding.Obj {
    const {
      objectSchema: { name, tableKey, primaryKey },
      properties,
    } = helpers;

    // Create the underlying object
    const table = binding.Helpers.getTable(this[INTERNAL], tableKey);
    if (primaryKey) {
      const primaryKeyHelpers = properties.get(primaryKey);
      const primaryKeyValue = values[primaryKey];
      const pk = primaryKeyHelpers.toBinding(
        // Fallback to default value if the provided value is undefined or null
        typeof primaryKeyValue !== "undefined" && primaryKeyValue !== null
          ? primaryKeyValue
          : primaryKeyHelpers.default,
      );
      const [obj, created] = binding.Helpers.getOrCreateObjectWithPrimaryKey(table, pk);
      if (mode === UpdateMode.Never && !created) {
        throw new Error(
          `Attempting to create an object of type '${name}' with an existing primary key value '${primaryKeyValue}'.`,
        );
      }
      return obj;
    } else {
      return table.createObject();
    }
  }

  delete(subject: RealmObject | RealmObject[] | List | Results): void {
    if (subject instanceof RealmObject) {
      const { objectSchema } = this.classes.getHelpers(subject);
      const obj = getInternal(subject);
      const table = binding.Helpers.getTable(this[INTERNAL], objectSchema.tableKey);
      table.removeObject(obj.key);
    } else {
      throw new Error("Not yet implemented");
    }
  }

  deleteModel(): void {
    throw new Error("Not yet implemented");
  }

  deleteAll(): void {
    throw new Error("Not yet implemented");
  }

  objectForPrimaryKey<T>(type: string, primaryKey: T[keyof T]): RealmObject<T> & T;
  objectForPrimaryKey<T extends RealmObject>(type: Constructor<T>, primaryKey: T[keyof T]): T;
  objectForPrimaryKey<T extends RealmObject>(type: string | Constructor<T>, primaryKey: string[]): T {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1240-L1258
    const { objectSchema, properties, wrapObject } = this.classes.getHelpers(type);
    if (!objectSchema.primaryKey) {
      throw new Error(`Expected a primary key on "${objectSchema.name}"`);
    }
    const table = binding.Helpers.getTable(this[INTERNAL], objectSchema.tableKey);
    const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey);
    try {
      const obj = table.getObjectWithPrimaryKey(value);
      return wrapObject(obj);
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

    const table = binding.Helpers.getTable(this[INTERNAL], objectSchema.tableKey);
    const results = binding.Results.fromTable(this[INTERNAL], table);
    return new Results<T>(results, this[INTERNAL], {
      get(results: binding.Results, index: number) {
        return results.getObj(index);
      },
      fromBinding: wrapObject,
      toBinding() {
        throw new Error("Cannot assign into Results");
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
    try {
      this[INTERNAL].beginTransaction();
      const result = callback();
      this[INTERNAL].commitTransaction();
      return result;
    } catch (err) {
      this[INTERNAL].cancelTransaction();
      throw err;
    }
  }

  beginTransaction(): void {
    this[INTERNAL].beginTransaction();
  }

  commitTransaction(): void {
    this[INTERNAL].commitTransaction();
  }

  cancelTransaction(): void {
    this[INTERNAL].cancelTransaction();
  }

  compact(): boolean {
    throw new Error("Not yet implemented");
  }

  writeCopyTo(): unknown {
    throw new Error("Not yet implemented");
  }

  _updateSchema(): unknown {
    throw new Error("Not yet implemented");
  }
}

// Declare the Realm namespace for backwards compatibility

// We need this alias because of https://github.com/Swatinem/rollup-plugin-dts/issues/223
type CollectionType<T> = Collection<T>;
type ResultsType<T> = Results<T>;
type ListType<T> = List<T>;
type DictionaryType<T> = Dictionary<T>;
type AppType = App;
type UpdateModeType = UpdateMode;
type ObjectSchemaType = ObjectSchema;
type BSONType = typeof BSON;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Realm {
  export type Object<T = DefaultObject> = RealmObject<T>;
  export type Collection<T> = CollectionType<T>;
  export type Results<T> = ResultsType<T>;
  export type List<T> = ListType<T>;
  export type App = AppType;
  export type UpdateMode = UpdateModeType;
  export type ObjectSchema = ObjectSchemaType;
  export type Dictionary<T = unknown> = DictionaryType<T>;
  export type Mixed = unknown;
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace BSON {
    export type ObjectId = InstanceType<BSONType["ObjectId"]>;
    export type Decimal128 = InstanceType<BSONType["Decimal128"]>;
    export type UUID = InstanceType<BSONType["UUID"]>;
  }
}
