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
  Counter,
  Dictionary,
  List,
  ListAccessor,
  PresentationPropertyTypeName,
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
  insertIntoDictionaryOfMixed,
  insertIntoListOfMixed,
  isJsOrRealmDictionary,
  isJsOrRealmList,
  toItemType,
} from "./internal";

type PropertyContext = binding.Property & {
  type: binding.PropertyType;
  objectSchemaName: string;
  embedded: boolean;
  presentation?: PresentationPropertyTypeName;
  default?: unknown;
};

/** @internal */
export type HelperOptions = {
  realm: Realm;
  getClassHelpers: (name: string) => ClassHelpers;
};

type PropertyOptions = {
  typeHelpers: TypeHelpers;
  columnKey: binding.ColKey;
  optional: boolean;
  embedded: boolean;
  presentation?: PresentationPropertyTypeName;
} & HelperOptions &
  binding.Property_Relaxed;

type PropertyAccessor = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown, isCreating?: boolean): unknown;
  listAccessor?: ListAccessor;
};

/** @internal */
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
  [binding.PropertyType.Int](options) {
    const { realm, columnKey, presentation, optional } = options;

    if (presentation === "counter") {
      return {
        get(obj) {
          return obj.getAny(columnKey) === null ? null : new Counter(realm, obj, columnKey);
        },
        set(obj, value, isCreating) {
          // We only allow resetting a counter this way (e.g. realmObject.counter = 5)
          // when it is first created, or when a nullable/optional counter was
          // previously `null`, or when resetting a nullable counter to `null`.
          if (isCreating) {
            defaultSet(options)(obj, value);
            return;
          }

          if (optional) {
            const isUninitialized = obj.getAny(columnKey) === null;
            const resettingToNull = value === null || value === undefined;
            if (isUninitialized || resettingToNull) {
              defaultSet(options)(obj, value);
              return;
            }
          }
          throw new Error(
            "You can only directly reset a Counter instance when initializing a previously " +
              "null Counter or resetting a nullable Counter to null. To update the value of " +
              "the Counter, use its instance methods.",
          );
        },
      };
    } else {
      return {
        get: defaultGet(options),
        set: defaultSet(options),
      };
    }
  },
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
    const itemType = toItemType(type);
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
      const resultsAccessor = createResultsAccessor({ realm, typeHelpers: itemHelpers, itemType });

      return {
        get(obj: binding.Obj) {
          const tableView = obj.getBacklinkView(tableRef, targetProperty.columnKey);
          const results = binding.Results.fromTableView(realmInternal, tableView);
          return new Results(realm, results, resultsAccessor, itemHelpers);
        },
        set() {
          throw new Error("Not supported");
        },
      };
    } else {
      const listAccessor = createListAccessor({ realm, typeHelpers: itemHelpers, itemType, isEmbedded: embedded });

      return {
        listAccessor,
        get(obj: binding.Obj) {
          const internal = binding.List.make(realm.internal, obj, columnKey);
          assert.instanceOf(internal, binding.List);
          return new List(realm, internal, listAccessor, itemHelpers);
        },
        set(obj, values) {
          assert.inTransaction(realm);
          assert.iterable(values);

          const internal = binding.List.make(realm.internal, obj, columnKey);
          internal.removeAll();
          let index = 0;
          try {
            for (const value of values) {
              listAccessor.insert(internal, index++, value);
            }
          } catch (err) {
            if (err instanceof TypeAssertionError) {
              err.rename(`${name}[${index - 1}]`);
            }
            throw err;
          }
        },
      };
    }
  },
  [binding.PropertyType.Dictionary]({ columnKey, realm, name, type, optional, objectType, getClassHelpers, embedded }) {
    const itemType = toItemType(type);
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
      itemType,
      isEmbedded: embedded,
    });

    return {
      get(obj) {
        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        return new Dictionary(realm, internal, dictionaryAccessor, itemHelpers);
      },
      set(obj, value) {
        assert.inTransaction(realm);

        const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
        // Clear the dictionary before adding new values
        internal.removeAll();
        assert.object(value, `values of ${name}`, { allowArrays: false });
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
    const itemType = toItemType(type);
    const itemHelpers = getTypeHelpers(itemType, {
      realm,
      name: `value in ${name}`,
      getClassHelpers,
      objectType,
      optional,
      objectSchemaName: undefined,
    });
    assert.string(objectType);
    const setAccessor = createSetAccessor({ realm, typeHelpers: itemHelpers, itemType });

    return {
      get(obj) {
        const internal = binding.Set.make(realm.internal, obj, columnKey);
        return new RealmSet(realm, internal, setAccessor, itemHelpers);
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
    const listAccessor = createListAccessor({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
    const dictionaryAccessor = createDictionaryAccessor({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });

    return {
      get(obj) {
        try {
          const value = obj.getAny(columnKey);
          switch (value) {
            case binding.ListSentinel: {
              const internal = binding.List.make(realm.internal, obj, columnKey);
              return new List(realm, internal, listAccessor, typeHelpers);
            }
            case binding.DictionarySentinel: {
              const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
              return new Dictionary(realm, internal, dictionaryAccessor, typeHelpers);
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
          insertIntoListOfMixed(value, internal, toBinding);
        } else if (isJsOrRealmDictionary(value)) {
          obj.setCollection(columnKey, binding.CollectionType.Dictionary);
          const internal = binding.Dictionary.make(realm.internal, obj, columnKey);
          insertIntoDictionaryOfMixed(value, internal, toBinding);
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

/** @internal */
export function createPropertyHelpers(property: PropertyContext, options: HelperOptions): PropertyHelpers {
  const collectionType = property.type & binding.PropertyType.Collection;
  const typeOptions: TypeOptions = {
    realm: options.realm,
    name: property.publicName || property.name,
    getClassHelpers: options.getClassHelpers,
    objectType: property.objectType,
    objectSchemaName: property.objectSchemaName,
    optional: !!(property.type & binding.PropertyType.Nullable),
    presentation: property.presentation,
    columnKey: property.columnKey,
  };
  if (collectionType) {
    return getPropertyHelpers(collectionType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(collectionType, typeOptions),
    });
  } else {
    const itemType = toItemType(property.type);
    return getPropertyHelpers(itemType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(itemType, typeOptions),
    });
  }
}
