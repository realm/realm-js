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

import { Object as RealmObject, getInternal } from "./Object";
import { DefaultObject } from "./schema";

export type ObjectWrapCreator<T = DefaultObject> = (obj: binding.Obj) => RealmObject<T> & T;

type PropertyHelpers = {
  toMixed: (value: unknown) => binding.Mixed;
  fromMixed: (value: binding.Mixed) => unknown;
  get: (obj: binding.Obj) => unknown;
  set: (obj: binding.Obj, value: unknown) => unknown;
};

function extractBaseType(type: binding.PropertyType) {
  return type & ~binding.PropertyType.Flags;
}

// TODO: Support converting all types
function createHelpers<T>(
  property: binding.Realm["schema"][0]["persistedProperties"][0],
  createObjectWrapper: ObjectWrapCreator<T>,
): PropertyHelpers {
  const type = extractBaseType(property.type);
  const { columnKey } = property;
  // TODO: Support collections
  const collectionType = property.type & binding.PropertyType.Collection;
  if (collectionType === binding.PropertyType.Array) {
    return {
      toMixed(value) {
        throw new Error("Lists are not yet supported!");
      },
      fromMixed(value) {
        throw new Error("Lists are not yet supported!");
      },
      get(obj) {
        throw new Error("Lists are not yet supported!");
      },
      set(obj, value) {
        throw new Error("Lists are not yet supported!");
      },
    };
  } else if (collectionType === binding.PropertyType.Set) {
    throw new Error("Sets are not yet supported!");
  } else if (collectionType === binding.PropertyType.Dictionary) {
    throw new Error("Dictionaries are not yet supported!");
  }
  if (type === binding.PropertyType.String) {
    return {
      toMixed(value) {
        // TODO: Refactor to use an assert
        if (typeof value !== "string") {
          throw new Error("Expected a string");
        }
        return binding.Mixed.fromString(value);
      },
      fromMixed(value) {
        return value.getString();
      },
      get(obj) {
        return this.fromMixed(obj.getAny(columnKey));
      },
      set(obj, value) {
        obj.setAny(columnKey, this.toMixed(value));
      },
    };
  } else if (type === binding.PropertyType.Object) {
    return {
      toMixed() {
        throw new Error("Cannot use toMixed on an object link property. Use set instead.");
      },
      fromMixed() {
        throw new Error("Cannot use fromMixed on an object link property. Use get instead.");
      },
      get(obj) {
        if (obj.isNull(columnKey)) {
          return null;
        } else {
          const linkedObj = obj.getLinkedObject(columnKey);
          return createObjectWrapper(linkedObj);
        }
      },
      set(obj, value) {
        if (value === null) {
          obj.setAny(columnKey, binding.Mixed.fromNull());
        } else if (value instanceof RealmObject) {
          const valueObj = getInternal(value);
          obj.setAny(columnKey, binding.Mixed.fromObj(valueObj));
        } else {
          throw new Error(`Expected a Realm.Object, got '${value}'`);
        }
      },
    };
  } else {
    throw new Error(`Converting values of type "${property.type}" is not yet supported`);
  }
}

export class PropertyMap<T = DefaultObject> {
  private mapping: Record<string, PropertyHelpers>;
  private nameByColumnKey: Record<number, string>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(objectSchema: binding.Realm["schema"][0], createObjectWrapper: ObjectWrapCreator<T>) {
    if (objectSchema.computedProperties.length > 0) {
      throw new Error("Computed properties are not yet supported");
    }
    this.mapping = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => {
        const helpers = createHelpers(p, createObjectWrapper);
        // Binding the methods, making the object spreadable
        helpers.toMixed = helpers.toMixed.bind(helpers);
        helpers.fromMixed = helpers.fromMixed.bind(helpers);
        helpers.get = helpers.get.bind(helpers);
        helpers.set = helpers.set.bind(helpers);
        return [p.name, helpers];
      }),
    );
    this.nameByColumnKey = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => [Number(p.columnKey.value), p.publicName || p.name]),
    );
  }

  public get(property: string): PropertyHelpers {
    return this.mapping[property];
  }

  public getName<T>(columnKey: binding.ColKey): keyof T {
    if (columnKey.value) {
      return this.nameByColumnKey[Number(columnKey.value)] as keyof T;
    } else {
      throw new Error("Expected a value on columnKey");
    }
  }
}
