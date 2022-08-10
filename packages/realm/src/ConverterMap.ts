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

import { INTERNAL, Object as RealmObject } from "./Object";

type ObjectWrapCreator = (obj: binding.Obj) => RealmObject;

type Converters = {
  toMixed: (value: unknown) => binding.Mixed;
  fromMixed: (value: binding.Mixed) => unknown;
  get: (obj: binding.Obj) => unknown;
  set: (obj: binding.Obj, value: unknown) => unknown;
};

function extractBaseType(type: binding.PropertyType) {
  return type & ~binding.PropertyType.Flags;
}

/**
 * @param property The property to create converters for
 * @returns
 */
function createConverters(
  property: binding.Realm["schema"][0]["persistedProperties"][0],
  createObjectWrapper: ObjectWrapCreator,
): Converters {
  const type = extractBaseType(property.type);
  const { columnKey } = property;
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
          const valueObj = value[INTERNAL];
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

export class ConverterMap {
  private mapping: Record<string, Converters>;

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(objectSchema: binding.Realm["schema"][0], createObjectWrapper: ObjectWrapCreator) {
    if (objectSchema.computedProperties.length > 0) {
      throw new Error("Computed properties are not yet supported");
    }
    this.mapping = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => {
        const converter = createConverters(p, createObjectWrapper);
        // Binding the methods, making them spreadable from the converter
        converter.toMixed = converter.toMixed.bind(converter);
        converter.fromMixed = converter.fromMixed.bind(converter);
        converter.get = converter.get.bind(converter);
        converter.set = converter.set.bind(converter);
        return [p.name, converter];
      }),
    );
  }

  public get(property: string): Converters {
    return this.mapping[property];
  }
}
