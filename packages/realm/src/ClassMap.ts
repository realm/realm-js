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

import { PropertyMap } from "./PropertyMap";
import type { Realm } from "./Realm";
import { Object as RealmObject } from "./Object";
import { Constructor, DefaultObject, RealmObjectConstructor } from "./schema";
import { getInternal, INTERNAL } from "./internal";
import { ClassHelpers, getHelpers, setHelpers } from "./ClassHelpers";
import { assert } from "./assert";
import { TableKey } from "./binding";

type BindingObjectSchema = binding.Realm["schema"][0];

export type RealmSchemaExtra = Record<string, ObjectSchemaExtra | undefined>;

export type ObjectSchemaExtra = {
  constructor?: RealmObjectConstructor;
  defaults: Record<string, unknown>;
};

/**
 * @internal
 */
export class ClassMap {
  private mapping: Record<string, RealmObjectConstructor>;
  private nameByTableKey: Record<TableKey, string>;

  private static createNamedConstructor<T extends Constructor>(name: string): T {
    const obj = {
      [name]: function () {
        /* no-op */
      },
    };
    return obj[name] as unknown as T;
  }

  private static createClass<T extends RealmObjectConstructor = RealmObjectConstructor>(
    schema: BindingObjectSchema,
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

  private static defineProperties(constructor: Constructor, schema: BindingObjectSchema, propertyMap: PropertyMap) {
    // Create bound functions for getting and setting properties
    const properties = [...schema.persistedProperties, ...schema.computedProperties];
    const propertyNames = properties.map((p) => p.publicName || p.name);

    // Build a map of property descriptors from the properties declared in the schema
    const descriptors: PropertyDescriptorMap = Object.fromEntries(
      properties.map((property) => {
        const { get, set } = propertyMap.get(property.name);
        return [
          property.name,
          {
            enumerable: true,
            get(this: RealmObject) {
              const obj = getInternal(this);
              return get(obj);
            },
            set(this: RealmObject, value: unknown) {
              const obj = getInternal(this);
              try {
                set(obj, value);
              } catch (err) {
                // TODO: Match on something else than a message, once exposed by the binding
                if (err instanceof Error && err.message.startsWith("Wrong transactional state")) {
                  throw new Error(
                    "Expected a write transaction: Wrap the assignment in `realm.write(() => { /* assignment*/ });`",
                  );
                } else {
                  throw err;
                }
              }
            },
          },
        ];
      }),
    );

    // Per class optimized methods
    descriptors.keys = {
      enumerable: false,
      configurable: false,
      writable: false,
      value() {
        return propertyNames;
      },
    };

    Object.defineProperties(constructor.prototype, descriptors);
  }

  constructor(realm: Realm, realmSchema: BindingObjectSchema[], schemaExtras: RealmSchemaExtra) {
    const realmInternal = realm[INTERNAL];

    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema) => {
        // Create the wrapping class first
        const constructor = ClassMap.createClass(objectSchema, schemaExtras[objectSchema.name]?.constructor);
        // Create property getters and setters
        const properties = new PropertyMap();
        // Setting the helpers on the class
        setHelpers(constructor, {
          objectSchema,
          properties,
          wrapObject(obj) {
            return RealmObject.createWrapper(realm, obj, constructor);
          },
        });
        return [objectSchema.name, constructor];
      }),
    );

    this.nameByTableKey = Object.fromEntries(realmSchema.map(({ name, tableKey }) => [tableKey, name]));

    for (const objectSchema of realmSchema) {
      const constructor = this.mapping[objectSchema.name];
      // Get the uninitialized property map
      const { properties } = getHelpers(constructor as typeof RealmObject);
      // Initialize the property map, now that all classes have helpers set
      properties.initialize(objectSchema, schemaExtras[objectSchema.name]?.defaults || {}, {
        realm: realmInternal,
        getClassHelpers: (name: string) => this.getHelpers(name),
      });
      // Transfer property getters and setters onto the prototype of the class
      ClassMap.defineProperties(constructor, objectSchema, properties);
    }
  }

  public get<T extends Realm.Object>(arg: string | RealmObject | Constructor<T> | binding.TableKey): Constructor<T> {
    if (typeof arg === "string") {
      const constructor = this.mapping[arg];
      if (!constructor) {
        throw new Error(`Object type '${arg}' not found in schema.`);
      }
      return constructor as Constructor<T>;
    } else if (arg instanceof RealmObject) {
      return this.get(arg.constructor.name);
    } else if (typeof arg === "function") {
      assert.extends(arg, RealmObject);
      assert.object(arg.schema, "schema static");
      assert.string(arg.schema.name, "name");
      return this.get(arg.schema.name);
      // return this.get(arg.name);
    } else if (arg in this.nameByTableKey) {
      const name = this.nameByTableKey[arg];
      return this.get(name);
    } else {
      throw new Error("Expected an object schema name, object instance or class");
    }
  }

  public getHelpers<T extends Realm.Object>(arg: string | RealmObject | Constructor<T>) {
    const constructor = this.get(arg);
    return getHelpers<T>(constructor as unknown as typeof RealmObject);
  }
}
