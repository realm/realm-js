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

import { getInternal, INTERNAL } from "./internal";
import { Object as RealmObject } from "./Object";
import { List } from "./List";
import { OrderedCollectionHelpers } from "./OrderedCollection";
import { ClassHelpers } from "./ClassHelpers";
import { Results } from "./Results";
import { Dictionary } from "./Dictionary";
import { MixedArg } from "./binding";

type PropertyContext = binding.Realm["schema"][0]["persistedProperties"][0] & { default?: unknown };

/** @internal */
export type ObjectWrapCreator<T extends RealmObject = RealmObject> = (obj: binding.Obj) => T;

/** @internal */
export type ListResolver = (columnKey: binding.ColKey, obj: binding.Obj) => binding.List;

/** @internal */
export type TypeHelpers = {
  toBinding(value: unknown): binding.MixedArg;
  fromBinding(value: unknown): unknown;
};

type HelperOptions = {
  realm: binding.Realm;
  createObjectWrapper: ObjectWrapCreator;
  resolveClassHelpers: (name: string) => ClassHelpers;
};

type HelperFunctions = {
  createResultsFromTableView: (tableView: binding.TableView, helpers: OrderedCollectionHelpers) => Results;
};

type MappingOptions = {
  columnKey: binding.ColKey;
  optional: boolean;
} & HelperOptions &
  HelperFunctions &
  binding.Property;

type PropertyHelpers = TypeHelpers & {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown): unknown;
  default: unknown;
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
    default: undefined,
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
  [binding.PropertyType.Object]({ realm, createObjectWrapper, columnKey }) {
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
        } else if (value instanceof binding.ObjLink) {
          const table = binding.Helpers.getTable(realm, value.tableKey);
          const linkedObj = table.getObject(value.objKey);
          return this.fromBinding(linkedObj);
        } else {
          assert.instanceOf(value, binding.Obj);
          return createObjectWrapper(value);
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
  [binding.PropertyType.LinkingObjects]({ createObjectWrapper }) {
    return {
      fromBinding(value) {
        assert.instanceOf(value, binding.Obj);
        return createObjectWrapper(value);
      },
      get() {
        throw new Error("Getting linking objects happens through Array");
      },
      set() {
        throw new Error("Setting linking objects happens through Array");
      },
    };
  },
  [binding.PropertyType.Mixed]({ realm, createObjectWrapper }) {
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
          const table = binding.Helpers.getTable(realm, value.tableKey);
          const linkedObj = table.getObject(value.objKey);
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
    // TODO: Move this destructure into the argument once `getHelpers` is no longer called
    const {
      type,
      realm,
      columnKey,
      objectType,
      linkOriginPropertyName,
      resolveClassHelpers,
      createResultsFromTableView,
    } = options;

    const itemType = type & ~binding.PropertyType.Flags;
    function getObj(results: binding.Results, index: number) {
      return results.getObj(index);
    }
    function getAny(results: binding.Results, index: number) {
      return results.getAny(index);
    }

    if (itemType === binding.PropertyType.LinkingObjects) {
      // Locate the table of the targeted object
      assert.string(objectType, "object type");

      return {
        fromBinding() {
          throw new Error("Not supported");
        },
        toBinding() {
          throw new Error("Not supported");
        },
        get(obj: binding.Obj) {
          // TODO: To improve performance: Refactor to resolve the class helper earlier.
          const targetClassHelpers = resolveClassHelpers(objectType);
          const { tableKey, persistedProperties } = targetClassHelpers.objectSchema;
          // TODO: Check if we want to match with the `p.name` or `p.publicName` here
          const targetProperty = persistedProperties.find((p) => p.name === linkOriginPropertyName);
          assert(targetProperty, `Expected a '${linkOriginPropertyName}' property on ${objectType}`);
          const tableRef = binding.Helpers.getTable(realm, tableKey);
          const tableView = obj.getBacklinkView(tableRef, targetProperty.columnKey);
          const itemHelpers = getHelpers(itemType, {
            ...options,
            createObjectWrapper: targetClassHelpers.createObjectWrapper,
          });
          const collectionHelpers: OrderedCollectionHelpers = {
            get: getObj,
            fromBinding: itemHelpers.fromBinding,
            toBinding: itemHelpers.toBinding,
          };
          return createResultsFromTableView(tableView, collectionHelpers);
        },
        set() {
          throw new Error("Not supported");
        },
      };
    } else {
      const itemHelpers = getHelpers(itemType, options);
      const collectionHelpers: OrderedCollectionHelpers = {
        get: itemType === binding.PropertyType.Object ? getObj : getAny,
        fromBinding: itemHelpers.fromBinding,
        toBinding: itemHelpers.toBinding,
      };
      const itemToBinding = itemHelpers.toBinding;

      return {
        fromBinding() {
          throw new Error("Not supported");
        },
        toBinding() {
          throw new Error("Not supported");
        },
        get(obj: binding.Obj) {
          const internal = binding.List.make(realm, obj, columnKey);
          return new List(internal, collectionHelpers);
        },
        set(obj, values) {
          // Implements https://github.com/realm/realm-core/blob/v12.0.0/src/realm/object-store/list.hpp#L258-L286
          assert.array(values);
          const internal = binding.List.make(realm, obj, columnKey);
          internal.removeAll();
          for (const [index, value] of values.entries()) {
            internal.insertAny(index, itemToBinding(value));
            // TODO: Unwrap objects and bigint
            // list.insertAny(index, value as MixedArg);
            // list.insertAny(index, BigInt(value as number) as MixedArg);
          }
        },
      };
    }
  },
  [binding.PropertyType.Set]() {
    return {
      fromBinding() {
        throw new Error("Not yet supported");
      },
      toBinding() {
        throw new Error("Not yet supported");
      },
    };
  },
  [binding.PropertyType.Dictionary]({ columnKey, realm }) {
    return {
      fromBinding() {
        throw new Error("Not yet implemented");
      },
      toBinding() {
        throw new Error("Not yet implemented");
      },
      get(obj) {
        const internal = binding.Dictionary.make(realm, obj, columnKey);
        return new Dictionary(internal);
      },
      set(obj, value) {
        const internal = binding.Dictionary.make(realm, obj, columnKey);
        // Clear the dictionary before adding new values
        internal.removeAll();
        assert.object(value, "values");
        for (const [k, v] of Object.entries(value)) {
          if (v instanceof RealmObject) {
            internal.insertAny(k, v[INTERNAL]);
          } else {
            // TODO: Validate the v before blindly inserting it
            internal.insertAny(k, v as MixedArg);
          }
        }
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
    default: result.default,
  };
}

// TODO: Support converting all types
function createHelpers(property: PropertyContext, options: HelperOptions & HelperFunctions): PropertyHelpers {
  const mappingOptions: MappingOptions = {
    ...property,
    ...options,
    optional: !!(property.type & binding.PropertyType.Nullable),
  };
  const collectionType = property.type & binding.PropertyType.Collection;
  if (collectionType) {
    return getHelpers(collectionType, mappingOptions);
  } else {
    const baseType = property.type & ~binding.PropertyType.Flags;
    return getHelpers(baseType, mappingOptions);
  }
}

/** @internal */
export class PropertyMap {
  private mapping: Record<string, PropertyHelpers>;
  private nameByColumnKey: Map<binding.ColKey, string>;

  public names: string[];

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(objectSchema: binding.Realm["schema"][0], defaults: Record<string, unknown>, options: HelperOptions) {
    const properties = [...objectSchema.persistedProperties, ...objectSchema.computedProperties];
    const { realm } = options;
    const optionsAndFunctions: HelperOptions & HelperFunctions = {
      ...options,
      createResultsFromTableView(tableView: binding.TableView, helpers: OrderedCollectionHelpers) {
        const results = binding.Results.fromTableView(realm, tableView);
        return new Results(results, realm, helpers);
      },
    };
    this.mapping = Object.fromEntries(
      properties.map((property) => {
        const helpers = createHelpers(property, optionsAndFunctions);
        // Allow users to override the default value of properties
        const defaultValue = defaults[property.name];
        helpers.default = typeof defaultValue !== "undefined" ? defaultValue : helpers.default;
        return [property.name, helpers];
      }),
    );
    this.nameByColumnKey = new Map(properties.map((p) => [p.columnKey, p.publicName || p.name]));
    // TODO: Consider including the computed properties?
    this.names = properties.map((p) => p.publicName || p.name);
  }

  public get = (property: string): PropertyHelpers => {
    return this.mapping[property];
  };

  public getName = <T>(columnKey: binding.ColKey): keyof T => {
    return this.nameByColumnKey.get(columnKey) as keyof T;
  };
}
