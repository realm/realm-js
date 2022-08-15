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

import * as binding from "@realm/bindgen";

import { PropertyMap, ObjectWrapCreator } from "./PropertyMap";
import { Realm } from "./Realm";
import {
  createWrapper as createObjectWrapperImpl,
  getInternal,
  INTERNAL_HELPERS,
  Object as RealmObject,
} from "./Object";

import { Constructor, RealmObjectConstructor } from "./schema";

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
      get() {
        const obj = getInternal(this);
        return get(obj);
      },
      set(value: unknown) {
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
  return result;
}

export type ClassHelpers<T> = {
  // TODO: Use a different type, once exposed by the binding
  objectSchema: binding.Realm["schema"][0];
  properties: PropertyMap;
  createObjectWrapper: ObjectWrapCreator<T>;
};

export class ClassMap {
  private mapping: Record<string, RealmObjectConstructor>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(realm: Realm, realmSchema: binding.Realm["schema"]) {
    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema) => {
        function createObjectWrapper(obj: binding.Obj): RealmObject<unknown> {
          return createObjectWrapperImpl(realm, constructor, obj) as RealmObject<unknown>;
        }
        const properties = new PropertyMap(objectSchema, createObjectWrapper);
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

  public get<T = unknown>(type: string | RealmObject<T> | RealmObjectConstructor<T>): RealmObjectConstructor<T> {
    if (typeof type === "string") {
      return this.mapping[type] as RealmObjectConstructor<T>;
    } else if (typeof type === "object") {
      return this.get(type.constructor.name);
    } else {
      throw new Error("Not yet implemented");
    }
  }

  public getHelpers<T = unknown>(name: string | RealmObject<T> | RealmObjectConstructor<T>) {
    const constructor = this.get(name) as unknown as typeof RealmObject;
    return constructor[INTERNAL_HELPERS] as ClassHelpers<T>;
  }
}
