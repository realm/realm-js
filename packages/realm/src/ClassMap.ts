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

import { PropertyMap, ObjectLinkResolver, ListResolver } from "./PropertyMap";
import type { Realm } from "./Realm";
import { Object as RealmObject } from "./Object";
import { Constructor, DefaultObject, RealmObjectConstructor } from "./schema";
import { getInternal } from "./internal";
import { getHelpers, setHelpers } from "./ClassHelpers";

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
  // Make the new constructor extend RealmObject
  // TODO: Use the end-users constructor, instead of `RealmObject` if provided
  Object.setPrototypeOf(result, RealmObject);
  Object.setPrototypeOf(result.prototype, RealmObject.prototype);
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

/**
 * @internal
 */
export class ClassMap {
  private mapping: Record<string, RealmObjectConstructor>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(
    realm: Realm,
    realmSchema: binding.Realm["schema"],
    resolveObjectLink: ObjectLinkResolver,
    resolveList: ListResolver,
  ) {
    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema) => {
        function createObjectWrapper<T = DefaultObject>(obj: binding.Obj) {
          return new RealmObject<T>(realm, constructor, obj) as RealmObject<T> & T;
        }
        const properties = new PropertyMap(objectSchema, createObjectWrapper, resolveObjectLink, resolveList);
        const constructor = createClass(objectSchema, properties) as RealmObjectConstructor;
        setHelpers(constructor as typeof RealmObject, { objectSchema, properties, createObjectWrapper });
        return [objectSchema.name, constructor];
      }),
    );
  }

  public get<T = unknown>(arg: string | RealmObject<T> | RealmObjectConstructor<T>): RealmObjectConstructor<T> {
    if (typeof arg === "string") {
      const constructor = this.mapping[arg];
      if (!constructor) {
        throw new Error(`Object schema named '${arg}' is missing from the schema`);
      }
      return constructor as RealmObjectConstructor<T>;
    } else if (arg instanceof RealmObject) {
      return this.get(arg.constructor.name);
    } else {
      throw new Error("Not yet implemented");
    }
  }

  public getHelpers<T = unknown>(arg: string | RealmObject<T> | RealmObjectConstructor<T>) {
    const constructor = this.get(arg);
    return getHelpers<T>(constructor as unknown as typeof RealmObject);
  }
}
