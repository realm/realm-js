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

import { List } from "./List";
import { OrderedCollectionHelpers } from "./OrderedCollection";
import { ClassHelpers } from "./ClassHelpers";
import { Results } from "./Results";
import { Dictionary } from "./Dictionary";
import { Set } from "./Set";
import { TypeHelpers, getHelpers as getTypeHelpers, TypeOptions } from "./types";
import { TypeAssertionError } from "./errors";
import type { Realm } from "./Realm";

type BindingObjectSchema = binding.Realm["schema"][0];
type BindingPropertySchema = BindingObjectSchema["persistedProperties"][0];

type PropertyContext = BindingPropertySchema & { default?: unknown };

function getObj(results: binding.Results, index: number) {
  return results.getObj(index);
}
function getAny(results: binding.Results, index: number) {
  return results.getAny(index);
}

export type HelperOptions = {
  realm: Realm;
  getClassHelpers: (name: string) => ClassHelpers;
};

type PropertyOptions = {
  typeHelpers: TypeHelpers;
  columnKey: binding.ColKey;
  optional: boolean;
} & HelperOptions &
  binding.Property_Relaxed;

type PropertyAccessors = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown): unknown;
};

export type PropertyHelpers = TypeHelpers &
  PropertyAccessors & {
    columnKey: binding.ColKey;
    default?: unknown;
  };

const defaultGet = ({ typeHelpers: { fromBinding }, columnKey, optional }: PropertyOptions) =>
  optional
    ? (obj: binding.Obj) => {
        return obj.isNull(columnKey) ? null : fromBinding(obj.getAny(columnKey));
      }
    : (obj: binding.Obj) => {
        return fromBinding(obj.getAny(columnKey));
      };

const defaultSet =
  ({ realm, typeHelpers: { toBinding }, columnKey }: PropertyOptions) =>
  (obj: binding.Obj, value: unknown) => {
    assert.inTransaction(realm);
    obj.setAny(columnKey, toBinding(value));
  };

type AccessorFactory = (options: PropertyOptions) => PropertyAccessors;

const ACCESSOR_FACTORIES: Partial<Record<binding.PropertyType, AccessorFactory>> = {
  [binding.PropertyType.Object](options) {
    const {
      columnKey,
      typeHelpers: { fromBinding },
    } = options;
    assert(options.optional, "Objects are always nullable");
    return {
      get(this: PropertyHelpers, obj) {
        return obj.isNull(columnKey) ? null : fromBinding(obj.getLinkedObject(columnKey));
      },
      set: defaultSet(options),
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
    name,
    columnKey,
    objectType,
    linkOriginPropertyName,
    getClassHelpers,
    optional,
  }) {
    // TODO: Move this destructure into the argument once `getHelpers` is no longer called

    const realmInternal = realm.internal;
    const itemType = type & ~binding.PropertyType.Flags;

    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `element of ${name}`,
      optional,
      getClassHelpers,
      objectType,
    });

    if (itemType === binding.PropertyType.LinkingObjects) {
      // Locate the table of the targeted object
      assert.string(objectType, "object type");
      assert(objectType !== "", "Expected a non-empty string");
      const targetClassHelpers = getClassHelpers(objectType);
      const {
        objectSchema: { tableKey, persistedProperties },
      } = targetClassHelpers;
      // TODO: Check if we want to match with the `p.name` or `p.publicName` here
      const targetProperty = persistedProperties.find((p) => p.name === linkOriginPropertyName);
      assert(targetProperty, `Expected a '${linkOriginPropertyName}' property on ${objectType}`);
      const tableRef = binding.Helpers.getTable(realmInternal, tableKey);

      const collectionHelpers: OrderedCollectionHelpers = {
        get: getObj,
        fromBinding: itemHelpers.fromBinding,
        toBinding: itemHelpers.toBinding,
      };

      return {
        get(obj: binding.Obj) {
          const tableView = obj.getBacklinkView(tableRef, targetProperty.columnKey);
          const results = binding.Results.fromTableView(realmInternal, tableView);
          return new Results(realm, results, collectionHelpers);
        },
        set() {
          throw new Error("Not supported");
        },
      };
    } else {
      // Properties of items are only available on lists of objects
      const collectionHelpers: OrderedCollectionHelpers = {
        get: itemType === binding.PropertyType.Object ? getObj : getAny,
        fromBinding: itemHelpers.fromBinding,
        toBinding: itemHelpers.toBinding,
      };
      const itemToBinding = itemHelpers.toBinding;

      return {
        get(obj: binding.Obj) {
          const internal = binding.List.make(realm.internal, obj, columnKey);
          return new List(realm, internal, collectionHelpers);
        },
        set(obj, values) {
          assert.inTransaction(realm);
          // Implements https://github.com/realm/realm-core/blob/v12.0.0/src/realm/object-store/list.hpp#L258-L286
          assert.iterable(values);
          const bindingValues = [];
          // Transform all values to mixed before inserting into the list
          {
            let index = 0;
            for (const value of values) {
              try {
                bindingValues.push(itemToBinding(value));
              } catch (err) {
                if (err instanceof TypeAssertionError) {
                  err.rename(`${name}[${index}]`);
                }
                throw err;
              }
              index++;
            }
          }
          // Move values into the internal list
          {
            const internal = binding.List.make(realm.internal, obj, columnKey);
            internal.removeAll();
            let index = 0;
            for (const value of bindingValues) {
              internal.insertAny(index++, value);
            }
          }
        },
      };
    }
  },
  [binding.PropertyType.Dictionary]({ columnKey, realm, name, type, optional, objectType, getClassHelpers }) {
    const itemType = type & ~binding.PropertyType.Flags;
    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `value in ${name}`,
      getClassHelpers,
      objectType,
      optional,
    });
    return {
      get(obj) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        return new Dictionary(internal, itemHelpers);
      },
      set(obj, value) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        // Clear the dictionary before adding new values
        internal.removeAll();
        assert.object(value, "values");
        for (const [k, v] of Object.entries(value)) {
          internal.insertAny(k, itemHelpers.toBinding(v));
        }
      },
    };
  },
  [binding.PropertyType.Set]({ columnKey, realm, name, type, optional, objectType, getClassHelpers }) {
    const itemType = type & ~binding.PropertyType.Flags;
    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `value in ${name}`,
      getClassHelpers,
      objectType,
      optional,
    });
    assert.string(objectType);
    const collectionHelpers: OrderedCollectionHelpers = {
      get: itemType === binding.PropertyType.Object ? getObj : getAny,
      fromBinding: itemHelpers.fromBinding,
      toBinding: itemHelpers.toBinding,
    };
    return {
      get(obj) {
        const internal = binding.Set.make(realm.internal, obj, columnKey);
        return new Set(realm, internal, collectionHelpers);
      },
      set(obj, value) {
        const internal = binding.Set.make(realm.internal, obj, columnKey);
        // Clear the set before adding new values
        internal.removeAll();
        assert.array(value, "values");
        for (const v of value) {
          internal.insertAny(itemHelpers.toBinding(v));
        }
      },
    };
  },
};

function getHelpers(type: binding.PropertyType, options: PropertyOptions): PropertyHelpers {
  const { typeHelpers, columnKey } = options;
  const accessorFactory = ACCESSOR_FACTORIES[type];
  if (accessorFactory) {
    const accessors = accessorFactory(options);
    return { ...accessors, ...typeHelpers, columnKey };
  } else {
    return { get: defaultGet(options), set: defaultSet(options), ...typeHelpers, columnKey };
  }
}

export function createHelpers(property: PropertyContext, options: HelperOptions): PropertyHelpers {
  const collectionType = property.type & binding.PropertyType.Collection;
  const typeOptions: TypeOptions = {
    realm: options.realm,
    name: property.name,
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
