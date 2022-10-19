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
  CanonicalObjectSchema,
  ClassHelpers,
  Constructor,
  DefaultObject,
  JSONCacheMap,
  ObjectChangeCallback,
  ObjectListeners,
  Realm,
  RealmInsertionModel,
  RealmObjectConstructor,
  Results,
  TypeAssertionError,
  assert,
  binding,
  flags,
  getTypeName,
} from "./internal";

export enum UpdateMode {
  Never = "never",
  Modified = "modified",
  All = "all",
}

/** @internal */
export type ObjCreator = () => [binding.Obj, boolean];

type CreationContext = {
  helpers: ClassHelpers;
  createObj?: ObjCreator;
};

export const INTERNAL = Symbol("Object#internal");
const INTERNAL_LISTENERS = Symbol("Object#listeners");
export const INTERNAL_HELPERS = Symbol("Object.helpers");
const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: true };

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const PROXY_HANDLER: ProxyHandler<RealmObject<any>> = {
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (typeof prop === "string" && target.keys().includes(prop)) {
      return DEFAULT_PROPERTY_DESCRIPTOR;
    } else {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  },
};

export class RealmObject<T = DefaultObject> {
  /**
   * @internal
   * This property is stored on the per class prototype when transforming the schema.
   */
  public static [INTERNAL_HELPERS]: ClassHelpers;

  public static allowValuesArrays = false;

  /**
   * @internal
   * Create an object in the database and set values on it
   */
  public static create(
    realm: Realm,
    values: Record<string, unknown>,
    mode: UpdateMode,
    context: CreationContext,
  ): RealmObject {
    assert.inTransaction(realm);
    if (Array.isArray(values)) {
      if (flags.ALLOW_VALUES_ARRAYS) {
        const { persistedProperties } = context.helpers.objectSchema;
        return RealmObject.create(
          realm,
          Object.fromEntries(
            values.map((value, index) => {
              const property = persistedProperties[index];
              const propertyName = property.publicName || property.name;
              return [propertyName, value];
            }),
          ),
          mode,
          context,
        );
      } else {
        throw new Error("Array values on object creation is no longer supported");
      }
    }
    const {
      helpers: {
        properties,
        wrapObject,
        objectSchema: { persistedProperties },
      },
      createObj,
    } = context;

    // Create the underlying object
    const [obj, created] = createObj ? createObj() : this.createObj(realm, values, mode, context);
    const result = wrapObject(obj);
    assert(result);
    // Persist any values provided
    // TODO: Consider using the property helpers directly to improve performance
    for (const property of persistedProperties) {
      const propertyName = property.publicName || property.name;
      const { default: defaultValue } = properties.get(propertyName);
      if (property.isPrimary) {
        continue; // Skip setting this, as we already provided it on object creation
      }
      const propertyValue = values[propertyName];
      if (typeof propertyValue !== "undefined") {
        if (mode !== UpdateMode.Modified || result[propertyName] !== propertyValue) {
          result[propertyName] = propertyValue;
        }
      } else {
        if (typeof defaultValue !== "undefined") {
          result[propertyName] = defaultValue;
        } else if (
          !(property.type & binding.PropertyType.Collection) &&
          !(property.type & binding.PropertyType.Nullable) &&
          created
        ) {
          throw new Error(`Missing value for property '${propertyName}'`);
        }
      }
    }
    return result as RealmObject;
  }

  /**
   * @internal
   * Create an object in the database and populate its primary key value, if required
   */
  public static createObj(
    realm: Realm,
    values: DefaultObject,
    mode: UpdateMode,
    context: CreationContext,
  ): [binding.Obj, boolean] {
    const {
      helpers: {
        objectSchema: { name, tableKey, primaryKey },
        properties,
      },
    } = context;

    // Create the underlying object
    const table = binding.Helpers.getTable(realm.internal, tableKey);
    if (primaryKey) {
      const primaryKeyHelpers = properties.get(primaryKey);
      const primaryKeyValue = values[primaryKey];
      const pk = primaryKeyHelpers.toBinding(
        // Fallback to default value if the provided value is undefined or null
        typeof primaryKeyValue !== "undefined" && primaryKeyValue !== null
          ? primaryKeyValue
          : primaryKeyHelpers.default,
        undefined,
      );
      const result = binding.Helpers.getOrCreateObjectWithPrimaryKey(table, pk);
      const [, created] = result;
      if (mode === UpdateMode.Never && !created) {
        throw new Error(
          `Attempting to create an object of type '${name}' with an existing primary key value '${primaryKeyValue}'.`,
        );
      }
      return result;
    } else {
      return [table.createObject(), true];
    }
  }

  /**
   * @internal
   * Create a wrapper for accessing an object from the database
   */
  public static createWrapper<T = DefaultObject>(
    realm: Realm,
    internal: binding.Obj,
    constructor: Constructor,
  ): RealmObject<T> & T {
    const result = Object.create(constructor.prototype);
    Object.defineProperties(result, {
      realm: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: realm,
      },
      [INTERNAL]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
      [INTERNAL_LISTENERS]: {
        enumerable: false,
        configurable: false,
        writable: true,
        value: new ObjectListeners(realm.internal, result),
      },
    });
    // TODO: Wrap in a proxy to trap keys, enabling the spread operator
    return new Proxy(result, PROXY_HANDLER);
    // return result;
  }

  /**
   * Create a `RealmObject` wrapping an `Obj` from the binding.
   * @param realm The Realm managing the object.
   * @param constructor The constructor of the object.
   * @param internal The internal Obj from the binding.
   */
  public constructor(realm: Realm, values: RealmInsertionModel<T>) {
    return realm.create(this.constructor as RealmObjectConstructor, values) as unknown as this;
  }

  /**
   * The Realm managing the object.
   */
  public readonly realm!: Realm;

  /**
   * @internal
   * The object's representation in the binding.
   */
  public readonly [INTERNAL]!: binding.Obj;

  /**
   * @internal
   * Wrapper for the object notifier.
   */
  private readonly [INTERNAL_LISTENERS]!: ObjectListeners<T>;

  // TODO: Find a way to bind this in
  keys(): string[] {
    throw new Error("This is expected to have a per-class implementation");
  }

  entries(): [string, unknown][] {
    throw new Error("Not yet implemented");
  }

  /**
   * @returns A plain object for JSON serialization.
   **/
  toJSON(_?: string, cache?: unknown): DefaultObject;
  /** @internal */
  toJSON(_?: string, cache = new JSONCacheMap()): DefaultObject {
    // Construct a reference-id of table-name & primaryKey if it exists, or fall back to objectId.

    // Check if current objectId has already processed, to keep object references the same.
    const existing = cache.find(this);
    if (existing) {
      return existing;
    }
    const result: DefaultObject = {};
    cache.add(this, result);
    // Move all enumerable keys to result, triggering any specific toJSON implementation in the process.
    for (const key in this) {
      const value = this[key];
      if (typeof value == "function") {
        continue;
      }
      if (
        value instanceof Realm.Object ||
        value instanceof Realm.OrderedCollection ||
        value instanceof Realm.Dictionary
      ) {
        // recursively trigger `toJSON` for Realm instances with the same cache.
        result[key] = value.toJSON(key, cache);
      } else {
        // Other cases, including null and undefined.
        result[key] = value;
      }
    }
    return result;
  }

  isValid(): boolean {
    return this[INTERNAL] && this[INTERNAL].isValid;
  }
  objectSchema(): CanonicalObjectSchema<T> {
    return this.realm.getClassHelpers(this).canonicalObjectSchema as CanonicalObjectSchema<T>;
  }

  linkingObjects<T>(objectType: string, propertyName: string): Results<T> {
    const {
      objectSchema: { tableKey },
      properties,
    } = this.realm.getClassHelpers(objectType);
    const tableRef = binding.Helpers.getTable(this.realm.internal, tableKey);
    const property = properties.get(propertyName);
    if (objectType !== property.objectType) {
      throw new TypeError(`'${objectType}#${propertyName}' is not a relationship to '${this.objectSchema.name}'`);
    }
    // Create the Result for the backlink view
    const { columnKey, collectionHelpers } = property;
    assert(collectionHelpers, "collection helpers");
    const tableView = this[INTERNAL].getBacklinkView(tableRef, columnKey);
    const results = binding.Results.fromTableView(this.realm.internal, tableView);
    return new Realm.Results(this.realm, results, collectionHelpers);
  }

  linkingObjectsCount(): number {
    return this[INTERNAL].getBacklinkCount();
  }

  /**
   * @deprecated
   * TODO: Remove completely once the type tests are obandend.
   */
  _objectId(): string {
    throw new Error("This is now removed!");
  }

  /**
   * A string uniquely identifying the object across all objects of the same type.
   */
  _objectKey(): string {
    return this[INTERNAL].key.toString();
  }

  addListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_LISTENERS].addListener(callback);
  }
  removeListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_LISTENERS].removeListener(callback);
  }
  removeAllListeners(): void {
    this[INTERNAL_LISTENERS].removeAllListeners();
  }
  getPropertyType(propertyName: string): string {
    const { properties } = this.realm.getClassHelpers(this);
    const { type, objectType, columnKey } = properties.get(propertyName);
    const typeName = getTypeName(type, objectType);
    if (typeName === "mixed") {
      // This requires actually getting the object and inferring its type
      const value = this[INTERNAL].getAny(columnKey);
      if (value === null) {
        return "null";
      } else if (value instanceof BigInt) {
        return "int";
      } else if (value instanceof binding.Float) {
        return "float";
      } else if (value instanceof binding.Timestamp) {
        return "date";
      } else if (value instanceof binding.Obj) {
        const { objectSchema } = this.realm.getClassHelpers(value.table.key);
        return `<${objectSchema.name}>`;
      } else if (value instanceof binding.ObjLink) {
        const { objectSchema } = this.realm.getClassHelpers(value.tableKey);
        return `<${objectSchema.name}>`;
      } else if (value instanceof ArrayBuffer) {
        return "data";
      } else if (typeof value === "number") {
        return "double";
      } else if (typeof value === "string") {
        return "string";
      } else if (typeof value === "boolean") {
        return "bool";
      } else {
        throw new TypeAssertionError("some other type", value, "value");
      }
    } else {
      return typeName;
    }
  }
}

//  We like to refer to this as "Realm.Object"
Object.defineProperty(RealmObject, "name", { value: "Realm.Object" });
