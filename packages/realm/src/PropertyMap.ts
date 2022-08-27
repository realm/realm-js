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
import { List } from "./List";
import { MixedArg, Obj, ObjLink, PropertyType } from "./binding";

export type ObjectWrapCreator<T = DefaultObject> = (obj: binding.Obj) => RealmObject<T> & T;
export type ObjectLinkResolver = (link: binding.ObjLink) => binding.Obj;
export type ListResolver = (columnKey: binding.ColKey, obj: binding.Obj) => binding.List;

type MappingOptions = {
  type: binding.PropertyType;
  columnKey: binding.ColKey;
  optional: boolean;
  createObjectWrapper: ObjectWrapCreator;
  resolveObjectLink: ObjectLinkResolver;
  resolveList: ListResolver;
};

type PropertyHelpers = {
  toBinding: (value: unknown) => binding.MixedArg;
  fromBinding: (value: unknown) => unknown;
  get: (obj: binding.Obj) => unknown;
  set: (obj: binding.Obj, value: unknown) => unknown;
};

function defaultHelpers({ columnKey }: MappingOptions): PropertyHelpers {
  return {
    toBinding(value: unknown): binding.MixedArg {
      return value as binding.MixedArg;
    },
    fromBinding(value: unknown) {
      return value;
    },
    get(this: PropertyHelpers, obj: binding.Obj) {
      return obj.isNull(columnKey) ? null : this.fromBinding(obj.getAny(columnKey));
    },
    set(this: PropertyHelpers, obj: binding.Obj, value: unknown) {
      obj.setAny(columnKey, value === null ? null : this.toBinding(value));
    },
  };
}

const TYPES_MAPPING: Record<binding.PropertyType, (options: MappingOptions) => Partial<PropertyHelpers>> = {
  [binding.PropertyType.Int]({ optional }) {
    return {
      toBinding(value: unknown) {
        if (value === null && optional) {
          return null;
        } else if (typeof value === "number") {
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
  [binding.PropertyType.Int]({ optional }) {
    return {
      toBinding(value: unknown) {
        if (value === null && optional) {
          return null;
        } else if (typeof value === "number") {
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
  [binding.PropertyType.Bool]({ optional }) {
    return {
      toBinding(value: unknown) {
        if (value === null && optional) {
          return null;
        }
        assert.boolean(value);
        return value;
      },
    };
  },
  [binding.PropertyType.String]({ optional }) {
    return {
      toBinding(value: unknown) {
        if (value === null && optional) {
          return null;
        }
        assert.string(value);
        return value;
      },
    };
  },
  [binding.PropertyType.Data]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.instanceOf(value, ArrayBuffer);
        return value;
      },
    };
  },
  [binding.PropertyType.Date]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.instanceOf(value, Date);
        return binding.Timestamp.fromDate(value);
      },
      fromBinding(value) {
        assert.instanceOf(value, binding.Timestamp);
        return value.toDate();
      },
    };
  },
  [binding.PropertyType.Float]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.number(value);
        return new binding.Float(value);
      },
      fromBinding(value) {
        assert.instanceOf(value, binding.Float);
        return value.value;
      },
    };
  },
  [binding.PropertyType.Double]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.number(value);
        return value;
      },
    };
  },
  [binding.PropertyType.Object]({ createObjectWrapper, resolveObjectLink, columnKey }) {
    return {
      toBinding(value) {
        if (value === null) {
          return null;
        }
        assert.instanceOf(value, RealmObject);
        return getInternal(value);
      },
      fromBinding(this: PropertyHelpers, value: unknown) {
        if (value === null) {
          return null;
        } else if (value instanceof ObjLink) {
          const obj = resolveObjectLink(value);
          // console.log("Resolved obj", { obj }, obj instanceof ObjLink);
          return this.fromBinding(obj);
        } else {
          return createObjectWrapper(value as binding.Obj);
        }
      },
      get(this: PropertyHelpers, obj) {
        return obj.isNull(columnKey) ? null : this.fromBinding(obj.getLinkedObject(columnKey));
      },
      /*
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
      */
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
  [binding.PropertyType.ObjectId]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.instanceOf(value, ObjectId);
        return value;
      },
    };
  },
  [binding.PropertyType.Decimal]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.instanceOf(value, Decimal128);
        return value;
      },
    };
  },
  [binding.PropertyType.UUID]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        }
        assert.instanceOf(value, UUID);
        return value;
      },
    };
  },
  [binding.PropertyType.Array](options) {
    const itemType = options.type & ~binding.PropertyType.Flags;
    const { toBinding: itemToBinding, fromBinding: itemFromBinding } = getHelpers(itemType, options);
    const resolveList = options.resolveList.bind(null, options.columnKey);
    function getter(results: binding.Results, index: number) {
      return itemFromBinding(results.getAny(index));
    }
    return {
      fromBinding() {
        throw new Error("Not supported");
      },
      toBinding() {
        throw new Error("Not supported");
      },
      get(obj) {
        return new List(resolveList(obj), getter);
      },
      set(obj, values) {
        // Implements https://github.com/realm/realm-core/blob/v12.0.0/src/realm/object-store/list.hpp#L258-L286
        assert.array(values);
        const list = resolveList(obj);
        list.removeAll();
        for (const [index, value] of values.entries()) {
          list.insertAny(index, itemToBinding(value));
          // TODO: Unwrap objects and bigint
          // list.insertAny(index, value as MixedArg);
          // list.insertAny(index, BigInt(value as number) as MixedArg);
        }
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
  createObjectWrapper: ObjectWrapCreator,
  resolveObjectLink: ObjectLinkResolver,
  resolveList: ListResolver,
): PropertyHelpers {
  const { type, columnKey } = property;
  const mappingOptions: MappingOptions = {
    type,
    columnKey,
    optional: (type & PropertyType.Nullable) > 0,
    createObjectWrapper,
    resolveObjectLink,
    resolveList,
  };
  const collectionType = property.type & binding.PropertyType.Collection;
  if (collectionType) {
    return getHelpers(collectionType, mappingOptions);
  } else {
    const baseType = property.type & ~binding.PropertyType.Flags;
    return getHelpers(baseType, mappingOptions);
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
    createObjectWrapper: ObjectWrapCreator,
    resolveObjectLink: ObjectLinkResolver,
    resolveList: ListResolver,
  ) {
    if (objectSchema.computedProperties.length > 0) {
      throw new Error("Computed properties are not yet supported");
    }
    this.mapping = Object.fromEntries(
      objectSchema.persistedProperties.map((p) => {
        const helpers = createHelpers(p, createObjectWrapper, resolveObjectLink, resolveList);
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
