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

import { PropertyMap, ObjectWrapCreator, ObjectLinkResolver } from "./PropertyMap";
import { Realm } from "./Realm";
import { Object as RealmObject } from "./Object";
import { Constructor, RealmObjectConstructor } from "./schema";
import { getInternal } from "./internal";

export const INTERNAL_HELPERS = Symbol("Realm.Object#helpers");

function createNamedConstructor<T extends Constructor>(name: string): T {
  const obj = {
    [name]: function () {
      /* no-op */
    },
  };
  return obj[name] as unknown as T;
}

function createClass<T extends RealmObjectConstructor = RealmObjectConstructor>(
  schema: binding.Realm["schema"][0],
  properties: PropertyMap,
): T {
  const result = createNamedConstructor<T>(schema.name);
  // Make the new constructor extend Realm.Object
  // TODO: Use the end-users constructor, instead of `Realm.Object` if provided
  Object.setPrototypeOf(result, Realm.Object);
  Object.setPrototypeOf(result.prototype, Realm.Object.prototype);
  // TODO: Support computed properties
  if (schema.computedProperties.length > 1) {
    throw new Error("computedProperties are not yet supported!");
  }
  // Create bound functions for getting and setting properties
  for (const property of schema.persistedProperties) {
    const { get, set } = properties.get(property.name);
    Object.defineProperty(result.prototype, property.name, {
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
    });
  }
  // Implement the per class optimized methods
  const propertyNames = schema.persistedProperties.map((p) => p.publicName || p.name);
  result.prototype.keys = function (this: T) {
    return propertyNames;
  };
  return result;
}

export type ClassHelpers<T> = {
  // TODO: Use a different type, once exposed by the binding
  objectSchema: binding.Realm["schema"][0];
  properties: PropertyMap;
  createObjectWrapper: ObjectWrapCreator<T>;
};

export class ClassMap {
  /**
   * Get internal helpers.
   * NOTE: This is a free function instead of a member of RealmObject to limit conflicts with user defined properties.
   * @param arg The object or constructor to get a helpers for.
   * @returns Helpers injected onto the class by the `ClassMap`.
   */
  public static getHelpers<T>(arg: RealmObject<T> | typeof RealmObject): ClassHelpers<T> {
    if (arg instanceof RealmObject) {
      return ClassMap.getHelpers(arg.constructor as typeof RealmObject);
    } else {
      const helpers = arg[INTERNAL_HELPERS];
      if (helpers) {
        return helpers as ClassHelpers<T>;
      } else {
        throw new Error("Expected INTERNAL_HELPERS to be set on the class");
      }
    }
  }

  private mapping: Record<string, RealmObjectConstructor>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(realm: Realm, realmSchema: binding.Realm["schema"], resolveObjectLink: ObjectLinkResolver) {
    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema) => {
        function createObjectWrapper<T>(obj: binding.Obj) {
          return new RealmObject<T>(realm, constructor, obj);
        }
        const properties = new PropertyMap(objectSchema, createObjectWrapper, resolveObjectLink);
        const constructor = createClass(objectSchema, properties) as RealmObjectConstructor;
        // Store the properties map on the object class
        Object.defineProperty(constructor, INTERNAL_HELPERS, {
          enumerable: false,
          writable: false,
          configurable: false,
          value: { objectSchema, properties, createObjectWrapper },
        });
        return [objectSchema.name, constructor];
      }),
    );
  }

  public get<T = unknown>(arg: string | RealmObject<T> | RealmObjectConstructor<T>): RealmObjectConstructor<T> {
    if (typeof arg === "string") {
      return this.mapping[arg] as RealmObjectConstructor<T>;
    } else if (arg instanceof Realm.Object) {
      return this.get(arg.constructor.name);
    } else {
      throw new Error("Not yet implemented");
    }
  }

  public getHelpers<T = unknown>(arg: string | RealmObject<T> | RealmObjectConstructor<T>) {
    const constructor = this.get(arg);
    return ClassMap.getHelpers<T>(constructor as unknown as typeof RealmObject);
  }
}
