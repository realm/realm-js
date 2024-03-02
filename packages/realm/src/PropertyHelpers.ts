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
  ListAccessor,
  Realm,
  RealmSet,
  Results,
  TypeAssertionError,
  TypeHelpers,
  TypeOptions,
  assert,
  binding,
  createDictionaryAccessor,
  createListAccessor,
  createResultsAccessor,
  createSetAccessor,
  getTypeHelpers,
  insertIntoDictionaryInMixed,
  insertIntoListInMixed,
  isJsOrRealmDictionary,
  isJsOrRealmList,
} from "./internal";

type PropertyContext = binding.Property & {
  type: binding.PropertyType;
  objectSchemaName: string;
  embedded: boolean;
  default?: unknown;
};

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

type PropertyAccessor = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown): unknown;
  listAccessor?: ListAccessor;
};

export type PropertyHelpers = TypeHelpers &
  PropertyAccessor & {
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

type AccessorFactory = (options: PropertyOptions) => PropertyAccessor;

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
      const resultsAccessor = createResultsAccessor({ typeHelpers: itemHelpers, isObjectItem: true });

      return {
        get(obj: binding.Obj) {
          const tableView = obj.getBacklinkView(tableRef, targetProperty.columnKey);
          const results = binding.Results.fromTableView(realmInternal, tableView);
          return new Results(realm, results, resultsAccessor);
        },
        set() {
          throw new Error("Not supported");
        },
      };
    } else {
      const { toBinding: itemToBinding } = itemHelpers;
      const listAccessor = createListAccessor({
        realm,
        typeHelpers: itemHelpers,
        isObjectItem: itemType === binding.PropertyType.Object,
        isEmbedded: embedded,
        isMixedItem: itemType === binding.PropertyType.Mixed,
      });

      return {
        listAccessor,
        get(obj: binding.Obj) {
          const internal = binding.List.make(realm.internal, obj, columnKey);
          assert.instanceOf(internal, binding.List);
          return new List(realm, internal, listAccessor);
        },
        set(obj, values) {
          assert.inTransaction(realm);

          // TODO: Update

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
    const dictionaryAccessor = createDictionaryAccessor({
      realm,
      typeHelpers: itemHelpers,
      isEmbedded: embedded,
      isMixedItem: itemType === binding.PropertyType.Mixed,
    });

    return {
      get(obj) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        return new Dictionary(realm, internal, dictionaryAccessor);
      },
      set(obj, value) {
        assert.inTransaction(realm);

        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        // Clear the dictionary before adding new values
        internal.removeAll();
        assert.object(value, `values of ${name}`);
        for (const [k, v] of Object.entries(value)) {
          try {
            dictionaryAccessor.set(internal, k, v);
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
    const setAccessor = createSetAccessor({
      realm,
      typeHelpers: itemHelpers,
      isObjectItem: itemType === binding.PropertyType.Object,
    });

    return {
      get(obj) {
        const internal = binding.Set.make(realm.internal, obj, columnKey);
        return new RealmSet(realm, internal, setAccessor);
      },
      set(obj, value) {
        assert.inTransaction(realm);

        const internal = binding.Set.make(realm.internal, obj, columnKey);
        // Clear the set before adding new values
        internal.removeAll();
        assert.array(value, "values");
        for (const v of value) {
          setAccessor.insert(internal, v);
        }
      },
    };
  },
  [binding.PropertyType.Mixed](options) {
    const { realm, columnKey, typeHelpers } = options;
    const { fromBinding, toBinding } = typeHelpers;
    const listAccessor = createListAccessor({ realm, typeHelpers, isMixedItem: true });
    const dictionaryAccessor = createDictionaryAccessor({ realm, typeHelpers, isMixedItem: true });

    return {
      get(obj) {
        try {
          const value = obj.getAny(columnKey);
          switch (value) {
            case binding.ListSentinel: {
              const internal = binding.List.make(realm.internal, obj, columnKey);
              return new List(realm, internal, listAccessor);
            }
            case binding.DictionarySentinel: {
              const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
              return new Dictionary(realm, internal, dictionaryAccessor);
            }
            default:
              return fromBinding(value);
          }
        } catch (err) {
          assert.isValid(obj);
          throw err;
        }
      },
      set(obj: binding.Obj, value: unknown) {
        assert.inTransaction(realm);

        if (isJsOrRealmList(value)) {
          obj.setCollection(columnKey, binding.CollectionType.List);
          const internal = binding.List.make(realm.internal, obj, columnKey);
          insertIntoListInMixed(value, internal, toBinding);
        } else if (isJsOrRealmDictionary(value)) {
          obj.setCollection(columnKey, binding.CollectionType.Dictionary);
          const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
          internal.removeAll();
          insertIntoDictionaryInMixed(value, internal, toBinding);
        } else {
          defaultSet(options)(obj, value);
        }
      },
    };
  },
};

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
