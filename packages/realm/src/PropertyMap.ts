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
import { Decimal128, ObjectId, UUID } from "bson";
import { assert } from "./assert";

import { getInternal } from "./internal";
import { Object as RealmObject } from "./Object";
import { DefaultObject } from "./schema";
import { ColKey, MixedArg } from "./binding";

export type ObjectWrapCreator<T = DefaultObject> = (obj: binding.Obj) => RealmObject<T> & T;
export type ObjectLinkResolver = (link: binding.ObjLink) => binding.Obj;

type PropertyHelpers = {
  toBinding: (value: unknown) => binding.MixedArg;
  fromBinding: (value: unknown) => unknown;
  get: (obj: binding.Obj) => unknown;
  set: (obj: binding.Obj, value: unknown) => unknown;
};

function defaultHelpers({ columnKey }: MappingOptions): PropertyHelpers {
  return {
    toBinding(value: unknown): MixedArg {
      return value as MixedArg;
    },
    fromBinding(value: unknown) {
      return value;
    },
    get(this: PropertyHelpers, obj: binding.Obj) {
      return this.fromBinding(obj.getAny(columnKey));
    },
    set(this: PropertyHelpers, obj: binding.Obj, value: unknown) {
      obj.setAny(columnKey, this.toBinding(value));
    },
  };
}

type MappingOptions = {
  columnKey: ColKey;
  createObjectWrapper: ObjectWrapCreator<unknown>;
  resolveObjectLink: ObjectLinkResolver;
};

const TYPES_MAPPING: Record<binding.PropertyType, (options: MappingOptions) => Partial<PropertyHelpers>> = {
  [binding.PropertyType.Int]() {
    return {
      toBinding(value: unknown) {
        if (typeof value === "number") {
          return BigInt(value);
        } else if (typeof value === "bigint") {
          return value;
        } else {
          throw new TypeError(`Expected a number or bigint, got ${typeof value}`);
        }
      },
      fromBinding(value: unknown) {
        // TODO: Support returning bigints to end-users
        return Number(value);
      },
    };
  },
  [binding.PropertyType.Int]() {
    return {
      toBinding(value: unknown) {
        if (typeof value === "number") {
          return BigInt(value);
        } else if (typeof value === "bigint") {
          return value;
        } else {
          throw new TypeError(`Expected a number or bigint, got ${typeof value}`);
        }
      },
      fromBinding(value: unknown) {
        // TODO: Support returning bigints to end-users
        return Number(value);
      },
    };
  },
  [binding.PropertyType.Bool]() {
    return {
      toBinding(value: unknown) {
        assert.boolean(value);
        return value;
      },
    };
  },
  [binding.PropertyType.String]() {
    return {
      toBinding(value: unknown) {
        assert.string(value);
        return value;
      },
    };
  },
  [binding.PropertyType.Data]() {
    return {
      toBinding(value) {
        assert.instanceOf(value, ArrayBuffer);
        return value;
      },
    };
  },
  [binding.PropertyType.Date]() {
    return {
      toBinding(value) {
        assert.instanceOf(value, Date);
        return binding.Timestamp.fromDate(value);
      },
      fromBinding(value) {
        assert.instanceOf(value, binding.Timestamp);
        return value.toDate();
      },
    };
  },
  [binding.PropertyType.Float]() {
    return {
      toBinding(value) {
        assert.number(value);
        return new binding.Float(value);
      },
      fromBinding(value) {
        assert.instanceOf(value, binding.Float);
        return value.value;
      },
    };
  },
  [binding.PropertyType.Double]() {
    return {
      toBinding(value) {
        assert.number(value);
        return value;
      },
    };
  },
  [binding.PropertyType.Object]({ createObjectWrapper, columnKey }) {
    return {
      toBinding() {
        throw new Error("Cannot use toBinding on an object link property. Use set instead.");
      },
      fromBinding() {
        throw new Error("Cannot use fromBinding on an object link property. Use get instead.");
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
          obj.setAny(columnKey, null);
        } else if (value instanceof RealmObject) {
          const valueObj = getInternal(value);
          obj.setAny(columnKey, valueObj);
        } else {
          throw new Error(`Expected a Realm.Object, got '${value}'`);
        }
      },
    };
  },
  [binding.PropertyType.LinkingObjects]() {
    throw new Error("Not yet supported");
  },
  [binding.PropertyType.Mixed]({ resolveObjectLink, createObjectWrapper }) {
    return {
      toBinding(value) {
        if (value instanceof Date) {
          return binding.Timestamp.fromDate(value);
        } else if (value instanceof RealmObject) {
          return getInternal(value);
        } else {
          return value as binding.Mixed;
        }
      },
      fromBinding(value) {
        if (typeof value === "bigint") {
          return Number(value);
        } else if (value instanceof binding.Timestamp) {
          return value.toDate();
        } else if (value instanceof binding.Float) {
          return value.value;
        } else if (value instanceof binding.ObjLink) {
          const linkedObj = resolveObjectLink(value);
          return createObjectWrapper(linkedObj);
        } else {
          return value;
        }
      },
    };
  },
  [binding.PropertyType.ObjectId]() {
    return {
      toBinding(value) {
        assert.instanceOf(value, ObjectId);
        return value;
      },
    };
  },
  [binding.PropertyType.Decimal]() {
    return {
      toBinding(value) {
        assert.instanceOf(value, Decimal128);
        return value;
      },
    };
  },
  [binding.PropertyType.UUID]() {
    return {
      toBinding(value) {
        assert.instanceOf(value, UUID);
        return value;
      },
    };
  },
  [binding.PropertyType.Array]() {
    return {
      fromBinding(value) {
        throw new Error("Not yet supported");
      },
      toBinding(value) {
        throw new Error("Not yet supported");
      },
    };
  },
  [binding.PropertyType.Set]() {
    return {
      fromBinding(value) {
        throw new Error("Not yet supported");
      },
      toBinding(value) {
        throw new Error("Not yet supported");
      },
    };
  },
  [binding.PropertyType.Dictionary]() {
    return {
      fromBinding(value) {
        throw new Error("Not yet supported");
      },
      toBinding(value) {
        throw new Error("Not yet supported");
      },
    };
  },
  [binding.PropertyType.Nullable]() {
    throw new Error("Not directly mappable");
  },
  [binding.PropertyType.Collection]() {
    throw new Error("Not directly mappable");
  },
  [binding.PropertyType.Flags]() {
    throw new Error("Not directly mappable");
  },
};

function getHelpers(type: binding.PropertyType, options: MappingOptions): PropertyHelpers {
  // Apply defaults
  const helpers = TYPES_MAPPING[type];
  const result = { ...defaultHelpers(options), ...helpers(options) };
  // Bind the methods to the resulting object
  return {
    fromBinding: result.fromBinding.bind(result),
    toBinding: result.toBinding.bind(result),
    get: result.get.bind(result),
    set: result.set.bind(result),
  };
}

// TODO: Support converting all types
function createHelpers<T>(
  property: binding.Realm["schema"][0]["persistedProperties"][0],
  createObjectWrapper: ObjectWrapCreator<unknown>,
  resolveObjectLink: ObjectLinkResolver,
): PropertyHelpers {
  const { columnKey } = property;

  // TODO: Support collections
  const collectionType = property.type & binding.PropertyType.Collection;
  if (collectionType) {
    return getHelpers(collectionType, { columnKey, createObjectWrapper, resolveObjectLink });
  } else {
    const baseType = property.type & ~binding.PropertyType.Flags;
    return getHelpers(baseType, { columnKey, createObjectWrapper, resolveObjectLink });
  }
}

export class PropertyMap<T = DefaultObject> {
  private mapping: Record<string, PropertyHelpers>;
  private nameByColumnKey: Record<number, string>;

  public names: string[];

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(
    objectSchema: binding.Realm["schema"][0],
    createObjectWrapper: ObjectWrapCreator<unknown>,
    resolveObjectLink: ObjectLinkResolver,
  ) {
    if (objectSchema.computedProperties.length > 0) {
      throw new Error("Computed properties are not yet supported");
    }
    this.mapping = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => {
        const helpers = createHelpers(p, createObjectWrapper, resolveObjectLink);
        // Binding the methods, making the object spreadable
        helpers.toBinding = helpers.toBinding.bind(helpers);
        helpers.fromBinding = helpers.fromBinding.bind(helpers);
        helpers.get = helpers.get.bind(helpers);
        helpers.set = helpers.set.bind(helpers);
        return [p.name, helpers];
      }),
    );
    this.nameByColumnKey = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => [Number(p.columnKey.value), p.publicName || p.name]),
    );
    // TODO: Consider including the computed properties?
    this.names = objectSchema.persistedProperties.map((p) => p.publicName || p.name);
  }

  public get = (property: string): PropertyHelpers => {
    return this.mapping[property];
  };

  public getName = <T>(columnKey: binding.ColKey): keyof T => {
    if (columnKey.value) {
      return this.nameByColumnKey[Number(columnKey.value)] as keyof T;
    } else {
      throw new Error("Expected a value on columnKey");
    }
  };
}
