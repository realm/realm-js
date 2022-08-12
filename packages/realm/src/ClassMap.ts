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

import { ConverterMap, ObjectWrapCreator } from "./ConverterMap";
import { Realm } from "./Realm";
import { createObjectWrapper as createObjectWrapperImpl, getInternal } from "./Object";

import { Constructor } from "./schema";

function createNamedConstructor(name: string): Constructor {
  const obj = {
    [name]: function () {
      /* no-op */
    },
  };
  return obj[name] as unknown as Constructor;
}

function createClass(schema: binding.Realm["schema"][0], converters: ConverterMap): Constructor {
  const result = createNamedConstructor(schema.name);
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
    const { get, set } = converters.get(property.name);
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

type ClassItem = {
  // TODO: Use a different type, once exposed by the binding
  objectSchema: binding.Realm["schema"][0];
  constructor: Constructor;
  converters: ConverterMap;
  createObjectWrapper: ObjectWrapCreator;
};

export class ClassMap {
  private mapping: Record<string, ClassItem>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(realm: Realm, realmSchema: binding.Realm["schema"]) {
    this.mapping = Object.fromEntries(
      realmSchema.map((objectSchema) => {
        function createObjectWrapper(obj: binding.Obj) {
          return createObjectWrapperImpl(realm, constructor, obj);
        }
        const converters = new ConverterMap(objectSchema, createObjectWrapper);
        const constructor = createClass(objectSchema, converters);
        return [objectSchema.name, { objectSchema, constructor, converters, createObjectWrapper }];
      }),
    );
  }

  public get(name: string): ClassItem {
    return this.mapping[name];
  }
}
