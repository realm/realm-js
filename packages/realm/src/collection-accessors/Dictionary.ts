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

import { binding } from "../../binding";
import { assert } from "../assert";
import { indirect } from "../indirect";
import type { Dictionary } from "../Dictionary";
import { createListAccessor, insertIntoListOfMixed, isJsOrRealmList } from "./List";
import type { TypeHelpers } from "../TypeHelpers";
import type { Realm } from "../Realm";

/** @internal */
export type DictionaryAccessor<T = unknown> = {
  get: (dictionary: binding.Dictionary, key: string) => T;
  set: (dictionary: binding.Dictionary, key: string, value: T) => void;
};

type DictionaryAccessorFactoryOptions<T> = {
  realm: Realm;
  typeHelpers: TypeHelpers<T>;
  itemType: binding.PropertyType;
  isEmbedded?: boolean;
};

/** @internal */
export function createDictionaryAccessor<T>(options: DictionaryAccessorFactoryOptions<T>): DictionaryAccessor<T> {
  return options.itemType === binding.PropertyType.Mixed
    ? createDictionaryAccessorForMixed<T>(options)
    : createDictionaryAccessorForKnownType<T>(options);
}

function createDictionaryAccessorForMixed<T>({
  realm,
  typeHelpers,
}: Pick<DictionaryAccessorFactoryOptions<T>, "realm" | "typeHelpers">): DictionaryAccessor<T> {
  const { toBinding, fromBinding } = typeHelpers;
  return {
    get(dictionary, key) {
      const value = dictionary.tryGetAny(key);
      switch (value) {
        case binding.ListSentinel: {
          const accessor = createListAccessor<T>({ realm, itemType: binding.PropertyType.Mixed, typeHelpers });
          return new indirect.List<T>(realm, dictionary.getList(key), accessor, typeHelpers) as T;
        }
        case binding.DictionarySentinel: {
          const accessor = createDictionaryAccessor<T>({ realm, itemType: binding.PropertyType.Mixed, typeHelpers });
          return new indirect.Dictionary<T>(realm, dictionary.getDictionary(key), accessor, typeHelpers) as T;
        }
        default:
          return fromBinding(value) as T;
      }
    },
    set(dictionary, key, value) {
      assert.inTransaction(realm);

      if (isJsOrRealmList(value)) {
        dictionary.insertCollection(key, binding.CollectionType.List);
        insertIntoListOfMixed(value, dictionary.getList(key), toBinding);
      } else if (isJsOrRealmDictionary(value)) {
        dictionary.insertCollection(key, binding.CollectionType.Dictionary);
        insertIntoDictionaryOfMixed(value, dictionary.getDictionary(key), toBinding);
      } else {
        dictionary.insertAny(key, toBinding(value));
      }
    },
  };
}

function createDictionaryAccessorForKnownType<T>({
  realm,
  typeHelpers,
  isEmbedded,
}: Omit<DictionaryAccessorFactoryOptions<T>, "itemType">): DictionaryAccessor<T> {
  const { fromBinding, toBinding } = typeHelpers;
  return {
    get(dictionary, key) {
      return fromBinding(dictionary.tryGetAny(key));
    },
    set(dictionary, key, value) {
      assert.inTransaction(realm);

      if (isEmbedded) {
        toBinding(value, { createObj: () => [dictionary.insertEmbedded(key), true] });
      } else {
        dictionary.insertAny(key, toBinding(value));
      }
    },
  };
}

/** @internal */
export function insertIntoDictionaryOfMixed(
  dictionary: Dictionary | Record<string, unknown>,
  internal: binding.Dictionary,
  toBinding: TypeHelpers["toBinding"],
) {
  // TODO: Solve the "removeAll()" case for self-assignment (https://github.com/realm/realm-core/issues/7422).
  internal.removeAll();

  for (const key in dictionary) {
    const value = dictionary[key];
    if (isJsOrRealmList(value)) {
      internal.insertCollection(key, binding.CollectionType.List);
      insertIntoListOfMixed(value, internal.getList(key), toBinding);
    } else if (isJsOrRealmDictionary(value)) {
      internal.insertCollection(key, binding.CollectionType.Dictionary);
      insertIntoDictionaryOfMixed(value, internal.getDictionary(key), toBinding);
    } else {
      internal.insertAny(key, toBinding(value));
    }
  }
}

/** @internal */
export function isJsOrRealmDictionary(value: unknown): value is Dictionary | Record<string, unknown> {
  return isPOJO(value) || value instanceof indirect.Dictionary;
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
