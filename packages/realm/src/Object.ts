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
  BSON,
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
          result[propertyName] = typeof defaultValue === "function" ? defaultValue() : defaultValue;
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
   * @param values The values of the object's properties at creation.
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
   * The plain object representation of this object for JSON serialization.
   * Use circular JSON serialization libraries such as {@link https://www.npmjs.com/package/@ungap/structured-clone @ungap/structured-clone}
   * and {@link https://www.npmjs.com/package/flatted flatted} for stringifying Realm entities that have circular structures.
   * @returns A plain object.
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

  /**
   * Checks if this object has not been deleted and is part of a valid Realm.
   * @returns `true` if the object can be safely accessed, `false` if not.
   * @since 0.12.0
   */
  isValid(): boolean {
    return this[INTERNAL] && this[INTERNAL].isValid;
  }

  /**
   * The schema for the type this object belongs to.
   * @returns The schema that describes this object.
   * @since 1.8.1
   */
  objectSchema(): CanonicalObjectSchema<T> {
    return this.realm.getClassHelpers(this).canonicalObjectSchema as CanonicalObjectSchema<T>;
  }

  /**
   * Returns all the objects that link to this object in the specified relationship.
   * @param objectType The type of the objects that link to this object's type.
   * @param propertyName The name of the property that references objects of this object's type.
   * @throws {@link AssertionError} If the relationship is not valid.
   * @returns The objects that link to this object.
   * @since 1.9.0
   */
  linkingObjects<T>(objectType: string, propertyName: string): Results<T> {
    const {
      objectSchema: { tableKey },
      properties,
    } = this.realm.getClassHelpers(objectType);
    const tableRef = binding.Helpers.getTable(this.realm.internal, tableKey);
    const property = properties.get(propertyName);
    assert(
      objectType === property.objectType,
      () => `'${objectType}#${propertyName}' is not a relationship to '${this.objectSchema.name}'`,
    );

    // Create the Result for the backlink view
    const { columnKey, collectionHelpers } = property;
    assert(collectionHelpers, "collection helpers");
    const tableView = this[INTERNAL].getBacklinkView(tableRef, columnKey);
    const results = binding.Results.fromTableView(this.realm.internal, tableView);
    return new Realm.Results(this.realm, results, collectionHelpers);
  }

  /**
   * Returns the total count of incoming links to this object
   * @returns The number of links to this object.
   * @since 2.6.0
   */
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

  /**
   * Add a listener `callback` which will be called when a **live** object instance changes.
   * @param callback A function to be called when changes occur.
   *   The callback function is called with two arguments:
   *   - `obj`: the object that changed,
   *   - `changes`: a dictionary with keys `deleted`, and `changedProperties`. `deleted` is true
   *       if the object has been deleted. `changesProperties` is an array of properties that have changed
   *       their value.
   * @throws {@link TypeAssertionError} If `callback` is not a function.
   * @example
   * wine.addListener((obj, changes) => {
   *  // obj === wine
   *  console.log(`object is deleted: ${changes.deleted}`);
   *  console.log(`${changes.changedProperties.length} properties have been changed:`);
   *  changes.changedProperties.forEach(prop => {
   *      console.log(` ${prop}`);
   *   });
   * })
   * @since 2.23.0
   */
  addListener(callback: ObjectChangeCallback<T>): void {
    assert.function(callback);
    this[INTERNAL_LISTENERS].addListener(callback);
  }

  /**
   * Remove the listener `callback`
   * @throws {@link TypeAssertionError} If `callback` is not a function.
   * @param callback A function previously added as listener
   * @since 2.23.0
   */
  removeListener(callback: ObjectChangeCallback<T>): void {
    assert.function(callback);
    this[INTERNAL_LISTENERS].removeListener(callback);
  }

  /**
   * Remove all listeners.
   * @since 2.23.0
   */
  removeAllListeners(): void {
    this[INTERNAL_LISTENERS].removeAllListeners();
  }

  /**
   * Get underlying type of a property value.
   * @param propertyName The name of the property to retrieve the type of.
   * @throws {@link Error} If property does not exist.
   * @returns Underlying type of the property value.
   * @since 10.8.0
   */
  getPropertyType(propertyName: string): string {
    const { properties } = this.realm.getClassHelpers(this);
    const { type, objectType, columnKey } = properties.get(propertyName);
    const typeName = getTypeName(type, objectType);
    if (typeName === "mixed") {
      // This requires actually getting the object and inferring its type
      const value = this[INTERNAL].getAny(columnKey);
      if (value === null) {
        return "null";
      } else if (typeof value === "bigint") {
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
      } else if (value instanceof BSON.ObjectId) {
        return "objectId";
      } else if (value instanceof BSON.Decimal128) {
        return "decimal128";
      } else if (value instanceof BSON.UUID) {
        return "uuid";
      } else {
        throw assert.never(value, "value");
      }
    } else {
      return typeName;
    }
  }
}

//  We like to refer to this as "Realm.Object"
Object.defineProperty(RealmObject, "name", { value: "Realm.Object" });
