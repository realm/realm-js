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
import { assert } from "./assert";

import { INTERNAL } from "./internal";
import { Object as RealmObject } from "./Object";
import { List } from "./List";
import { OrderedCollectionHelpers } from "./OrderedCollection";
import { ClassHelpers } from "./ClassHelpers";
import { Results } from "./Results";
import { Dictionary } from "./Dictionary";
import { MixedArg } from "./binding";
import { TypeHelpers, getHelpers as getTypeHelpers, TypeOptions } from "./types";

type BindingObjectSchema = binding.Realm["schema"][0];
type BindingPropertySchema = BindingObjectSchema["persistedProperties"][0];

type PropertyContext = BindingPropertySchema & { default?: unknown };

export type HelperOptions = {
  realm: binding.Realm;
  getClassHelpers: (name: string) => ClassHelpers;
};

type PropertyOptions = {
  typeHelpers: TypeHelpers;
  columnKey: binding.ColKey;
  optional: boolean;
} & HelperOptions &
  binding.Property;

type PropertyAccessors = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown): unknown;
};

export type PropertyHelpers = TypeHelpers &
  PropertyAccessors & {
    default?: unknown;
  };

const defaultGet =
  ({ typeHelpers: { fromBinding }, columnKey }: PropertyOptions) =>
  (obj: binding.Obj) => {
    return obj.isNull(columnKey) ? null : fromBinding(obj.getAny(columnKey));
  };

const defaultSet =
  ({ typeHelpers: { toBinding }, columnKey }: PropertyOptions) =>
  (obj: binding.Obj, value: unknown) => {
    obj.setAny(columnKey, value === null ? null : toBinding(value));
  };

type AccessorFactory = (options: PropertyOptions) => PropertyAccessors;

const ACCESSOR_FACTORIES: Partial<Record<binding.PropertyType, AccessorFactory>> = {
  [binding.PropertyType.Object](options) {
    const {
      columnKey,
      typeHelpers: { fromBinding },
    } = options;
    return {
      get(this: PropertyHelpers, obj) {
        return obj.isNull(columnKey) ? null : fromBinding(obj.getLinkedObject(columnKey));
      },
      set: defaultSet(options),
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
    return {
      get() {
        throw new Error("Getting linking objects happens through Array");
      },
      set() {
        throw new Error("Setting linking objects happens through Array");
      },
    };
  },
  [binding.PropertyType.Array]({
    realm,
    type,
    columnKey,
    objectType,
    linkOriginPropertyName,
    getClassHelpers,
    optional,
  }) {
    // TODO: Move this destructure into the argument once `getHelpers` is no longer called

    const itemType = type & ~binding.PropertyType.Flags;
    function getObj(results: binding.Results, index: number) {
      return results.getObj(index);
    }
    function getAny(results: binding.Results, index: number) {
      return results.getAny(index);
    }

    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      optional,
      getClassHelpers,
      objectType,
    });

    if (itemType === binding.PropertyType.LinkingObjects) {
      // Locate the table of the targeted object
      assert.string(objectType, "object type");
      const targetClassHelpers = getClassHelpers(objectType);
      // TODO: To improve performance: Refactor to resolve the class helper earlier.
      const { tableKey, persistedProperties } = targetClassHelpers.objectSchema;
      // TODO: Check if we want to match with the `p.name` or `p.publicName` here
      const targetProperty = persistedProperties.find((p) => p.name === linkOriginPropertyName);
      assert(targetProperty, `Expected a '${linkOriginPropertyName}' property on ${objectType}`);
      const tableRef = binding.Helpers.getTable(realm, tableKey);

      const collectionHelpers: OrderedCollectionHelpers = {
        get: getObj,
        fromBinding: itemHelpers.fromBinding,
        toBinding: itemHelpers.toBinding,
      };

      return {
        get(obj: binding.Obj) {
          const tableView = obj.getBacklinkView(tableRef, targetProperty.columnKey);
          const results = binding.Results.fromTableView(realm, tableView);
          return new Results(results, realm, collectionHelpers);
        },
        set() {
          throw new Error("Not supported");
        },
      };
    } else {
      const collectionHelpers: OrderedCollectionHelpers = {
        get: itemType === binding.PropertyType.Object ? getObj : getAny,
        fromBinding: itemHelpers.fromBinding,
        toBinding: itemHelpers.toBinding,
      };
      const itemToBinding = itemHelpers.toBinding;

      return {
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
  [binding.PropertyType.Dictionary]({ columnKey, realm, type, optional, objectType, getClassHelpers }) {
    const itemType = type & ~binding.PropertyType.Flags;
    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      getClassHelpers,
      objectType,
      optional,
    });
    return {
      get(obj) {
        const internal = binding.Dictionary.make(realm, obj, columnKey);
        return new Dictionary(internal, itemHelpers);
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
};

function getHelpers(type: binding.PropertyType, options: PropertyOptions): PropertyHelpers {
  const accessorFactory = ACCESSOR_FACTORIES[type];
  if (accessorFactory) {
    const accessors = accessorFactory(options);
    return { ...accessors, ...options.typeHelpers };
  } else {
    return { get: defaultGet(options), set: defaultSet(options), ...options.typeHelpers };
  }
}

export function createHelpers(property: PropertyContext, options: HelperOptions): PropertyHelpers {
  const collectionType = property.type & binding.PropertyType.Collection;
  const typeOptions: TypeOptions = {
    realm: options.realm,
    getClassHelpers: options.getClassHelpers,
    objectType: property.objectType,
    optional: !!(property.type & binding.PropertyType.Nullable),
  };
  if (collectionType) {
    return getHelpers(collectionType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(collectionType, typeOptions),
    });
  } else {
    const baseType = property.type & ~binding.PropertyType.Flags;
    return getHelpers(baseType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(baseType, typeOptions),
    });
  }
}
