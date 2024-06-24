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

import { assert, binding } from "../internal";
import { PropertyAccessor, PropertyOptions } from "./types";

/** @internal */
export function createDefaultPropertyAccessor({
  realm,
  typeHelpers: { fromBinding, toBinding },
  columnKey,
}: PropertyOptions): PropertyAccessor {
  return {
    get(obj: binding.Obj) {
      try {
        return fromBinding(obj.getAny(columnKey));
      } catch (err) {
        assert.isValid(obj);
        throw err;
      }
    },
    set(obj: binding.Obj, value: unknown) {
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
    },
  };
}
