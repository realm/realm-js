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

import {
  ClassHelpers,
  Dictionary,
  List,
  OrderedCollectionHelpers,
  Realm,
  RealmSet,
  Results,
  TypeAssertionError,
  TypeHelpers,
  TypeOptions,
  assert,
  binding,
  getTypeHelpers,
} from "./internal";

type PropertyContext = binding.Property & {
  type: binding.PropertyType;
  objectSchemaName: string;
  embedded: boolean;
  default?: unknown;
};

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
  embedded: boolean;
} & HelperOptions &
  binding.Property_Relaxed;

type PropertyAccessors = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown): unknown;
  collectionHelpers?: OrderedCollectionHelpers;
};

export type PropertyHelpers = TypeHelpers &
  PropertyAccessors & {
    type: binding.PropertyType;
    columnKey: binding.ColKey;
    embedded: boolean;
    default?: unknown;
    objectType?: string;
  };

const defaultGet =
  ({ typeHelpers: { fromBinding }, columnKey }: PropertyOptions) =>
  (obj: binding.Obj) => {
    try {
      return fromBinding(obj.getAny(columnKey));
    } catch (err) {
      assert.isValid(obj);
      throw err;
    }
  };

const defaultSet =
  ({ realm, typeHelpers: { toBinding }, columnKey }: PropertyOptions) =>
  (obj: binding.Obj, value: unknown) => {
    assert.inTransaction(realm);
    try {
      if (!realm.isInMigration && obj.table.getPrimaryKeyColumn() === columnKey) {
        throw new Error(`Cannot change value of primary key outside migration function`);
      }
      obj.setAny(columnKey, toBinding(value));
    } catch (err) {
      assert.isValid(obj);
      throw err;
    }
  };

function embeddedSet({ typeHelpers: { toBinding }, columnKey }: PropertyOptions) {
  return (obj: binding.Obj, value: unknown) => {
    // Asking for the toBinding will create the object and link it to the parent in one operation.
    // Thus, no need to actually set the value on the `obj` unless it's an optional null value.
    const bindingValue = toBinding(value, { createObj: () => [obj.createAndSetLinkedObject(columnKey), true] });
    // No need to destructure `optional` and check that it's `true` in this condition before setting
    // it to null as objects are always optional. The condition is placed after the invocation of
    // `toBinding()` in order to leave the type conversion responsibility to `toBinding()`.
    if (bindingValue === null) {
      obj.setAny(columnKey, bindingValue);
    }
  };
}

type AccessorFactory = (options: PropertyOptions) => PropertyAccessors;

const ACCESSOR_FACTORIES: Partial<Record<binding.PropertyType, AccessorFactory>> = {
  [binding.PropertyType.Object](options) {
    const {
      columnKey,
      typeHelpers: { fromBinding },
      embedded,
    } = options;
    assert(options.optional, "Objects are always nullable");
    return {
      get(this: PropertyHelpers, obj) {
        return fromBinding(obj.getLinkedObject(columnKey));
      },
      set: embedded ? embeddedSet(options) : defaultSet(options),
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
    embedded,
    linkOriginPropertyName,
    getClassHelpers,
    optional,
    typeHelpers: { fromBinding },
  }) {
    const realmInternal = realm.internal;
    const itemType = type & ~binding.PropertyType.Flags;

    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `element of ${name}`,
      optional,
      getClassHelpers,
      objectType,
      objectSchemaName: undefined,
    });

    // Properties of items are only available on lists of objects
    const isObjectItem = itemType === binding.PropertyType.Object || itemType === binding.PropertyType.LinkingObjects;
    const collectionHelpers: OrderedCollectionHelpers = {
      ...itemHelpers,
      get: isObjectItem ? getObj : getAny,
    };

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
      const { toBinding: itemToBinding } = itemHelpers;
      return {
        collectionHelpers,
        get(obj: binding.Obj) {
          const internal = binding.List.make(realm.internal, obj, columnKey);
          assert.instanceOf(internal, binding.List);
          return fromBinding(internal);
        },
        set(obj, values) {
          assert.inTransaction(realm);
          // Implements https://github.com/realm/realm-core/blob/v12.0.0/src/realm/object-store/list.hpp#L258-L286
          assert.iterable(values);
          const bindingValues = [];
          const internal = binding.List.make(realm.internal, obj, columnKey);

          // In case of embedded objects, they're added as they're transformed
          // So we need to ensure an empty list before
          if (embedded) {
            internal.removeAll();
          }
          // Transform all values to mixed before inserting into the list
          {
            let index = 0;
            for (const value of values) {
              try {
                if (embedded) {
                  itemToBinding(value, { createObj: () => [internal.insertEmbedded(index), true] });
                } else {
                  bindingValues.push(itemToBinding(value));
                }
              } catch (err) {
                if (err instanceof TypeAssertionError) {
                  err.rename(`${name}[${index}]`);
                }
                throw err;
              }
              index++;
            }
          }
          // Move values into the internal list - embedded objects are added as they're transformed
          if (!embedded) {
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
  [binding.PropertyType.Dictionary]({ columnKey, realm, name, type, optional, objectType, getClassHelpers, embedded }) {
    const itemType = type & ~binding.PropertyType.Flags;
    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `value in ${name}`,
      getClassHelpers,
      objectType,
      optional,
      objectSchemaName: undefined,
    });
    return {
      get(obj) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        return new Dictionary(realm, internal, itemHelpers);
      },
      set(obj, value) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        // Clear the dictionary before adding new values
        internal.removeAll();
        assert.object(value, `values of ${name}`);
        for (const [k, v] of Object.entries(value)) {
          try {
            if (embedded) {
              itemHelpers.toBinding(v, { createObj: () => [internal.insertEmbedded(k), true] });
            } else {
              internal.insertAny(k, itemHelpers.toBinding(v));
            }
          } catch (err) {
            if (err instanceof TypeAssertionError) {
              err.rename(`${name}["${k}"]`);
            }
            throw err;
          }
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
      objectSchemaName: undefined,
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
        return new RealmSet(realm, internal, collectionHelpers);
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
  [binding.PropertyType.Mixed](options) {
    const {
      realm,
      columnKey,
      typeHelpers: { fromBinding, toBinding },
    } = options;

    return {
      get(obj) {
        try {
          // We currently rely on the Core helper `get_mixed_type()` for calling `obj.get_any()`
          // since doing it here in the SDK layer will cause the binding layer to throw for
          // collections. It's non-trivial to do in the bindgen templates as a `binding.List`
          // would have to be constructed using the `realm` and `obj`. Going via the helpers
          // bypasses that as we will return a primitive (the data type). If possible, revisiting
          // this for a more performant solution would be ideal as we now make an extra call into
          // Core for each Mixed access, not only for collections.
          const mixedType = binding.Helpers.getMixedType(obj, columnKey);
          if (mixedType === binding.MixedDataType.List) {
            return fromBinding(binding.List.make(realm.internal, obj, columnKey));
          }
          if (mixedType === binding.MixedDataType.Dictionary) {
            return fromBinding(binding.Dictionary.make(realm.internal, obj, columnKey));
          }
          return defaultGet(options)(obj);
        } catch (err) {
          assert.isValid(obj);
          throw err;
        }
      },
      set(obj: binding.Obj, value: unknown) {
        assert.inTransaction(realm);

        if (isList(value)) {
          obj.setCollection(columnKey, binding.CollectionType.List);
          const internal = binding.List.make(realm.internal, obj, columnKey);
          insertIntoListInMixed(value, internal, toBinding);
        } else if (isDictionary(value)) {
          obj.setCollection(columnKey, binding.CollectionType.Dictionary);
          const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
          internal.removeAll();
          insertIntoDictionaryInMixed(value, internal, toBinding);
        } else if (value instanceof RealmSet || value instanceof Set) {
          throw new Error(`Using a ${value.constructor.name} as a Mixed value is not supported.`);
        } else {
          defaultSet(options)(obj, value);
        }
      },
    };
  },
};

function isList(value: unknown): value is List | unknown[] {
  return value instanceof List || Array.isArray(value);
}

function isDictionary(value: unknown): value is Dictionary | Record<string, unknown> {
  return value instanceof Dictionary || isPOJO(value);
}

function insertIntoListInMixed(list: List | unknown[], internal: binding.List, toBinding: TypeHelpers["toBinding"]) {
  let index = 0;
  for (const item of list) {
    if (isList(item)) {
      internal.insertCollection(index, binding.CollectionType.List);
      insertIntoListInMixed(item, internal.getList(index), toBinding);
    } else if (isDictionary(item)) {
      internal.insertCollection(index, binding.CollectionType.Dictionary);
      insertIntoDictionaryInMixed(item, internal.getDictionary(index), toBinding);
    } else {
      internal.insertAny(index, toBinding(item));
    }
    index++;
  }
}

function insertIntoDictionaryInMixed(
  dictionary: Dictionary | Record<string, unknown>,
  internal: binding.Dictionary,
  toBinding: TypeHelpers["toBinding"],
) {
  for (const key in dictionary) {
    const value = dictionary[key];
    if (isList(value)) {
      internal.insertCollection(key, binding.CollectionType.List);
      insertIntoListInMixed(value, internal.getList(key), toBinding);
    } else if (isDictionary(value)) {
      internal.insertCollection(key, binding.CollectionType.Dictionary);
      insertIntoDictionaryInMixed(value, internal.getDictionary(key), toBinding);
    } else {
      internal.insertAny(key, toBinding(value));
    }
  }
}

function getPropertyHelpers(type: binding.PropertyType, options: PropertyOptions): PropertyHelpers {
  const { typeHelpers, columnKey, embedded, objectType } = options;
  const accessorFactory = ACCESSOR_FACTORIES[type];
  if (accessorFactory) {
    const accessors = accessorFactory(options);
    return { ...accessors, ...typeHelpers, type: options.type, columnKey, embedded, objectType };
  } else {
    return {
      get: defaultGet(options),
      set: defaultSet(options),
      ...typeHelpers,
      type: options.type,
      columnKey,
      embedded,
      objectType,
    };
  }
}

export function createPropertyHelpers(property: PropertyContext, options: HelperOptions): PropertyHelpers {
  const collectionType = property.type & binding.PropertyType.Collection;
  const typeOptions: TypeOptions = {
    realm: options.realm,
    name: property.publicName || property.name,
    getClassHelpers: options.getClassHelpers,
    objectType: property.objectType,
    objectSchemaName: property.objectSchemaName,
    optional: !!(property.type & binding.PropertyType.Nullable),
  };
  if (collectionType) {
    return getPropertyHelpers(collectionType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(collectionType, typeOptions),
    });
  } else {
    const baseType = property.type & ~binding.PropertyType.Flags;
    return getPropertyHelpers(baseType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(baseType, typeOptions),
    });
  }
}

/** @internal */
export function isPOJO(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    // Lastly check for the absence of a prototype as POJOs
    // can still be created using `Object.create(null)`.
    (value.constructor === Object || !Object.getPrototypeOf(value))
  );
}
