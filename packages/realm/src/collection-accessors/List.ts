////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { binding } from "../binding";
import { assert } from "../assert";
import { indirect } from "../indirect";
import { createDictionaryAccessor, insertIntoDictionaryOfMixed, isJsOrRealmDictionary } from "./Dictionary";
import { createDefaultGetter } from "./OrderedCollection";
import type { TypeHelpers } from "../TypeHelpers";
import type { Realm } from "../Realm";
import type { List } from "../List";

/** @internal */
export type ListAccessor<T = unknown> = {
  get: (list: binding.List, index: number) => T;
  set: (list: binding.List, index: number, value: T) => void;
  insert: (list: binding.List, index: number, value: T) => void;
};

type ListAccessorFactoryOptions<T> = {
  realm: Realm;
  typeHelpers: TypeHelpers<T>;
  itemType: binding.PropertyType;
  isEmbedded?: boolean;
};

/** @internal */
export function createListAccessor<T>(options: ListAccessorFactoryOptions<T>): ListAccessor<T> {
  return options.itemType === binding.PropertyType.Mixed
    ? createListAccessorForMixed<T>(options)
    : createListAccessorForKnownType<T>(options);
}

function createListAccessorForMixed<T>({
  realm,
  typeHelpers,
}: Pick<ListAccessorFactoryOptions<T>, "realm" | "typeHelpers">): ListAccessor<T> {
  const { toBinding } = typeHelpers;
  return {
    get(list, index) {
      const value = list.getAny(index);
      switch (value) {
        case binding.ListSentinel: {
          const accessor = createListAccessor<T>({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
          return new indirect.List<T>(realm, list.getList(index), accessor, typeHelpers) as T;
        }
        case binding.DictionarySentinel: {
          const accessor = createDictionaryAccessor<T>({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
          return new indirect.Dictionary<T>(realm, list.getDictionary(index), accessor, typeHelpers) as T;
        }
        default:
          return typeHelpers.fromBinding(value);
      }
    },
    set(list, index, value) {
      assert.inTransaction(realm);

      if (isJsOrRealmList(value)) {
        list.setCollection(index, binding.CollectionType.List);
        insertIntoListOfMixed(value, list.getList(index), toBinding);
      } else if (isJsOrRealmDictionary(value)) {
        list.setCollection(index, binding.CollectionType.Dictionary);
        insertIntoDictionaryOfMixed(value, list.getDictionary(index), toBinding);
      } else {
        list.setAny(index, toBinding(value));
      }
    },
    insert(list, index, value) {
      assert.inTransaction(realm);

      if (isJsOrRealmList(value)) {
        list.insertCollection(index, binding.CollectionType.List);
        insertIntoListOfMixed(value, list.getList(index), toBinding);
      } else if (isJsOrRealmDictionary(value)) {
        list.insertCollection(index, binding.CollectionType.Dictionary);
        insertIntoDictionaryOfMixed(value, list.getDictionary(index), toBinding);
      } else {
        list.insertAny(index, toBinding(value));
      }
    },
  };
}

function createListAccessorForKnownType<T>({
  realm,
  typeHelpers,
  itemType,
  isEmbedded,
}: Omit<ListAccessorFactoryOptions<T>, "isMixed">): ListAccessor<T> {
  const { fromBinding, toBinding } = typeHelpers;
  return {
    get: createDefaultGetter({ fromBinding, itemType }),
    set(list, index, value) {
      assert.inTransaction(realm);
      list.setAny(
        index,
        toBinding(value, isEmbedded ? { createObj: () => [list.setEmbedded(index), true] } : undefined),
      );
    },
    insert(list, index, value) {
      assert.inTransaction(realm);
      if (isEmbedded) {
        // Simply transforming to binding will insert the embedded object
        toBinding(value, { createObj: () => [list.insertEmbedded(index), true] });
      } else {
        list.insertAny(index, toBinding(value));
      }
    },
  };
}

/** @internal */
export function insertIntoListOfMixed(
  list: List | unknown[],
  internal: binding.List,
  toBinding: TypeHelpers["toBinding"],
) {
  // TODO: Solve the "removeAll()" case for self-assignment (https://github.com/realm/realm-core/issues/7422).
  internal.removeAll();

  for (const [index, item] of list.entries()) {
    if (isJsOrRealmList(item)) {
      internal.insertCollection(index, binding.CollectionType.List);
      insertIntoListOfMixed(item, internal.getList(index), toBinding);
    } else if (isJsOrRealmDictionary(item)) {
      internal.insertCollection(index, binding.CollectionType.Dictionary);
      insertIntoDictionaryOfMixed(item, internal.getDictionary(index), toBinding);
    } else {
      internal.insertAny(index, toBinding(item));
    }
  }
}

/** @internal */
export function isJsOrRealmList(value: unknown): value is List | unknown[] {
  return Array.isArray(value) || value instanceof indirect.List;
}
