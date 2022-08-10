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

import { ConverterMap } from "./ConverterMap";
import { Realm } from "./Realm";
import { createObjectWrapper as createObjectWrapperImpl, INTERNAL, Object as RealmObject } from "./Object";

import { Constructor } from "./schema-types";

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
  Object.setPrototypeOf(result, Realm.Object);
  Object.setPrototypeOf(result.prototype, Realm.Object.prototype);
  // TODO: Support computed properties
  if (schema.computedProperties.length > 1) {
    throw new Error("computedProperties are not yet supported!");
  }
  // Create bound functions for getting and setting properties
  for (const property of schema.persistedProperties) {
    const { fromObj } = converters.get(property.name);
    Object.defineProperty(result.prototype, property.name, {
      enumerable: true,
      get() {
        const obj = this[INTERNAL] as binding.Obj;
        return fromObj(obj);
      },
    });
  }
  return result;
}

type ClassItem = {
  constructor: Constructor;
  converters: ConverterMap;
  createObjectWrapper: (obj: binding.Obj) => RealmObject;
};

type ObjGetter = (
  tableKey: ReturnType<binding.ObjLink["getTableKey"]>,
  objKey: ReturnType<binding.ObjLink["getObjKey"]>,
) => binding.Obj;

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
        return [
          objectSchema.name,
          {
            constructor,
            converters,
            createObjectWrapper,
          },
        ];
      }),
    );
  }

  public get(name: string): ClassItem {
    return this.mapping[name];
  }
}
