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

import { INTERNAL, getInternal } from "./internal";
import { Object as RealmObject } from "./Object";
import { Results } from "./Results";
import {
  fromBindingSchema,
  toBindingSchema,
  CanonicalObjectSchema,
  DefaultObject,
  RealmObjectConstructor,
  normalizeRealmSchema,
} from "./schema";
import { RealmInsertionModel } from "./InsertionModel";
import { Configuration } from "./Configuration";
import { ClassMap } from "./ClassMap";
import { List } from "./List";

export class Realm {
  public static Object = RealmObject;
  public static Results = Results;
  public static List = List;

  /**
   * The Realms's representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.Realm;
  private classes: ClassMap;

  constructor(config: Configuration = {}) {
    const internal = binding.Realm.getSharedRealm({
      path: config.path || this.getDefaultPath(),
      fifoFilesFallbackPath: this.fifoFilesFallbackPath(),
      schema: config.schema ? toBindingSchema(normalizeRealmSchema(config.schema)) : undefined,
      inMemory: config.inMemory === true,
      schemaVersion: config.schema
        ? typeof config.schemaVersion === "number"
          ? BigInt(config.schemaVersion)
          : 0n
        : undefined,
    });

    function resolveObjectLink(link: binding.ObjLink): binding.Obj {
      const table = binding.Helpers.getTable(internal, link.tableKey);
      return table.getObject(link.objKey);
    }

    function resolveList(columnKey: binding.ColKey, obj: binding.Obj): binding.List {
      return binding.List.make(internal, obj, columnKey);
    }

    this.classes = new ClassMap(this, internal.schema, resolveObjectLink, resolveList);

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

  // TODO: Support the third argument (update mode)
  // TODO: Support embedded objects and asymmetric sync
  create<T = DefaultObject>(type: string, values: RealmInsertionModel<T>): RealmObject<T> & T;
  create<T = DefaultObject>(type: RealmObjectConstructor<T>, values: RealmInsertionModel<T>): RealmObject<T> & T;
  create<T = DefaultObject>(
    type: string | RealmObjectConstructor<T>,
    values: Record<string, unknown>,
  ): RealmObject<T> & T {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1260-L1321
    if (arguments.length > 2) {
      throw new Error("Creating objects with update mode specified is not yet supported");
    }
    if (values instanceof RealmObject && !getInternal(values)) {
      throw new Error("Cannot create an object from a detached Realm.Object instance");
    }
    this[INTERNAL].verifyOpen();
    const {
      objectSchema: { tableKey, primaryKey, persistedProperties },
      properties,
      createObjectWrapper,
    } = this.classes.getHelpers(type);

    // Create the underlying object
    const table = binding.Helpers.getTable(this[INTERNAL], tableKey);
    let obj: binding.Obj;
    if (primaryKey) {
      const primaryKeyValue = values[primaryKey];
      // TODO: Consider handling an undefined primary key value
      const pk = properties.get(primaryKey).toBinding(primaryKeyValue);
      obj = table.createObjectWithPrimaryKey(pk);
    } else {
      obj = table.createObject();
    }

    const result = createObjectWrapper(obj) as unknown as DefaultObject;

    // Persist any values provided
    // TODO: Consider using the `converters` directly to improve performance
    for (const property of persistedProperties) {
      if (property.isPrimary) {
        continue; // Skip setting this, as we already provided it on object creation
      }
      const propertyValue = values[property.name];
      if (typeof propertyValue !== "undefined" && propertyValue !== null) {
        result[property.name] = propertyValue;
      }
    }

    return result as unknown as RealmObject<T> & T;
  }

  delete<T>(subject: (RealmObject<T> & T) | RealmObject[] | List<T> | Results<T>): void {
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

  objectForPrimaryKey<T = DefaultObject>(type: string, primaryKey: T[keyof T]): RealmObject<T> & T;
  objectForPrimaryKey<T = DefaultObject>(type: RealmObjectConstructor<T>, primaryKey: T[keyof T]): RealmObject<T> & T;
  objectForPrimaryKey<T>(type: string | RealmObjectConstructor<T>, primaryKey: T[keyof T]): RealmObject<T> & T {
    // Implements https://github.com/realm/realm-js/blob/v11/src/js_realm.hpp#L1240-L1258
    const { objectSchema, properties, createObjectWrapper } = this.classes.getHelpers<T>(type);
    if (objectSchema.primaryKey === "") {
      throw new Error(`Expected a primary key on "${objectSchema.name}"`);
    }
    const table = binding.Helpers.getTable(this[INTERNAL], objectSchema.tableKey);
    const value = properties.get(objectSchema.primaryKey).toBinding(primaryKey);
    try {
      const obj = table.getObjectWithPrimaryKey(value);
      return createObjectWrapper(obj);
    } catch (err) {
      // TODO: Match on something else than the error message, when exposed by the binding
      if (err instanceof Error && err.message.startsWith("No object with key")) {
        throw new Error(`No '${objectSchema.name}' with key '${primaryKey}'`);
      } else {
        throw err;
      }
    }
  }

  objects<T = DefaultObject>(type: string): Results<T>;
  objects<T = DefaultObject>(type: RealmObjectConstructor<T>): Results<T>;
  objects<T = DefaultObject>(type: string | RealmObjectConstructor<T>): Results<T> {
    const { objectSchema, createObjectWrapper } = this.classes.getHelpers(type);
    if (objectSchema.tableType === binding.TableType.Embedded) {
      throw new Error("You cannot query an embedded object.");
    } else if (objectSchema.tableType === binding.TableType.TopLevelAsymmetric) {
      throw new Error("You cannot query an asymmetric class.");
    }

    const table = binding.Helpers.getTable(this[INTERNAL], objectSchema.tableKey);
    const results = binding.Results.fromTable(this[INTERNAL], table);
    return new Results(results, this[INTERNAL], table, (results, index) => {
      const obj = results.getObj(index);
      return createObjectWrapper(obj);
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

  /**
   * TODO: Make this platform dependent
   */
  private getDefaultPath() {
    return "default.realm";
  }

  /**
   * TODO: Make this platform dependent
   */
  private fifoFilesFallbackPath() {
    return "";
  }
}
