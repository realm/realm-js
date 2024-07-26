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
import { RealmSet } from "../Set";
import type { PropertyAccessor, PropertyOptions } from "./types";
import { getTypeHelpers, toItemType } from "../TypeHelpers";
import { createSetAccessor } from "../collection-accessors/Set";

/** @internal */
export function createSetPropertyAccessor({
  columnKey,
  realm,
  name,
  type,
  optional,
  objectType,
  getClassHelpers,
}: PropertyOptions): PropertyAccessor {
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
}
