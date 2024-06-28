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

import {
  Dictionary,
  List,
  assert,
  binding,
  createDictionaryAccessor,
  createListAccessor,
  insertIntoDictionaryOfMixed,
  insertIntoListOfMixed,
  isJsOrRealmDictionary,
  isJsOrRealmList,
} from "../internal";
import { createDefaultPropertyAccessor } from "./default";
import type { PropertyAccessor, PropertyOptions } from "./types";

/** @internal */
export function createMixedPropertyAccessor(options: PropertyOptions): PropertyAccessor {
  const { realm, columnKey, typeHelpers } = options;
  const { fromBinding, toBinding } = typeHelpers;
  const listAccessor = createListAccessor({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
  const dictionaryAccessor = createDictionaryAccessor({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
  const { set: defaultSet } = createDefaultPropertyAccessor(options);

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
        defaultSet(obj, value);
      }
    },
  };
}
