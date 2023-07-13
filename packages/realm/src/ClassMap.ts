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
  CanonicalRealmSchema,
  Constructor,
  INTERNAL,
  KEY_ARRAY,
  KEY_SET,
  PropertyMap,
  REALM,
  Realm,
  RealmObject,
  RealmObjectConstructor,
  assert,
  binding,
  getClassHelpers,
  setClassHelpers,
} from "./internal";

/** @internal */
export class ClassMap {
  private mapping: Record<string, Constructor<unknown>>;
  private nameByTableKey: Record<binding.TableKey, string>;

  private static createNamedConstructor<T extends Constructor>(name: string): T {
    const result = function () {
      /* no-op */
    };
    // Need to use `defineProperty` since it isn't writable
    Object.defineProperty(result, "name", { value: name });
    return result as unknown as T;
  }

  private static createClass<T extends RealmObjectConstructor = RealmObjectConstructor>(
    schema: binding.ObjectSchema,
    constructor: Constructor | undefined,
  ): T {
    const result = ClassMap.createNamedConstructor<T>(schema.name);
    // Make the new constructor extend RealmObject
    // TODO: Use the end-users constructor, instead of `RealmObject` if provided
    if (constructor) {
      Object.setPrototypeOf(result, constructor);
      Object.setPrototypeOf(result.prototype, constructor.prototype);
    } else {
      Object.setPrototypeOf(result, RealmObject);
      Object.setPrototypeOf(result.prototype, RealmObject.prototype);
    }
    return result;
  }

  private static defineProperties(
    constructor: Constructor,
    schema: binding.ObjectSchema,
    propertyMap: PropertyMap,
    realm: Realm,
  ) {
    // Create bound functions for getting and setting properties
    const properties = [...schema.persistedProperties, ...schema.computedProperties];
    const propertyNames = properties.map((p) => p.publicName || p.name);

    // Set up accessors for the properties declared in the schema
    for (const property of properties) {
      const propertyName = property.publicName || property.name;
      const { get, set } = propertyMap.get(propertyName);
      Object.defineProperty(constructor.prototype, propertyName, {
        enumerable: true,
        get(this: RealmObject) {
          return get(this[INTERNAL]);
        },
        set(this: RealmObject, value: unknown) {
          set(this[INTERNAL], value);
        },
      });
    }

    Object.defineProperty(constructor.prototype, REALM, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    });
    Object.defineProperty(constructor.prototype, KEY_ARRAY, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: propertyNames,
    });
    Object.defineProperty(constructor.prototype, KEY_SET, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new Set(propertyNames),
    });
  }

  constructor(realm: Realm, realmSchema: readonly binding.ObjectSchema[], canonicalRealmSchema: CanonicalRealmSchema) {
    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema, index) => {
        const canonicalObjectSchema: CanonicalObjectSchema = canonicalRealmSchema[index];
        assert.object(canonicalObjectSchema);
        // Create the wrapping class first
        const constructor = ClassMap.createClass(objectSchema, canonicalObjectSchema.ctor);
        // Create property getters and setters
        const properties = new PropertyMap();
        // Setting the helpers on the class
        setClassHelpers(constructor, {
          constructor,
          objectSchema,
          canonicalObjectSchema,
          properties,
          wrapObject(obj) {
            if (obj.isValid) {
              return RealmObject.createWrapper(obj, constructor);
            } else {
              return null;
            }
          },
        });
        return [objectSchema.name, constructor];
      }),
    );

    this.nameByTableKey = Object.fromEntries(realmSchema.map(({ name, tableKey }) => [tableKey, name]));

    for (const [index, objectSchema] of realmSchema.entries()) {
      const canonicalObjectSchema = canonicalRealmSchema[index];
      const defaults = Object.fromEntries(
        Object.entries(canonicalObjectSchema.properties).map(([name, property]) => {
          return [name, property.default];
        }),
      );
      const constructor = this.mapping[objectSchema.name];
      // Get the uninitialized property map
      const { properties } = getClassHelpers(constructor as typeof RealmObject);
      // Initialize the property map, now that all classes have helpers set
      properties.initialize(objectSchema, defaults, {
        realm,
        getClassHelpers: (name: string) => this.getHelpers(name),
      });
      // Transfer property getters and setters onto the prototype of the class
      ClassMap.defineProperties(constructor, objectSchema, properties, realm);
    }
  }

  public get<T>(arg: string | binding.TableKey | RealmObject<T> | Constructor<RealmObject<T>>): Constructor<T> {
    if (typeof arg === "string") {
      const constructor = this.mapping[arg];
      if (!constructor) {
        throw new Error(`Object type '${arg}' not found in schema.`);
      }
      return constructor as Constructor<T>;
    } else if (arg instanceof RealmObject) {
      return this.get(arg.constructor.name) as Constructor<T>;
    } else if (typeof arg === "function") {
      assert.extends(arg, RealmObject);
      assert.object(arg.schema, "schema static");
      assert.string(arg.schema.name, "name");
      const result = this.get(arg.schema.name);
      assert(
        result === arg || Object.getPrototypeOf(result) === arg,
        "Constructor was not registered in the schema for this Realm",
      );
      return result as Constructor<T>;
    } else if (arg in this.nameByTableKey) {
      const name = this.nameByTableKey[arg];
      return this.get(name);
    } else {
      throw new Error("Expected an object schema name, object instance or class");
    }
  }

  public getHelpers<T>(arg: string | binding.TableKey | RealmObject<T> | Constructor<RealmObject<T>>) {
    const constructor = this.get(arg);
    return getClassHelpers(constructor as unknown as typeof RealmObject);
  }
}
