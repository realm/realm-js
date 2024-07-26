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
import type { TypeHelpers } from "../TypeHelpers";
import type { Realm } from "../Realm";
import { createDefaultGetter } from "./OrderedCollection";

/** @internal */
export type SetAccessor<T = unknown> = {
  get: (set: binding.Set, index: number) => T;
  set: (set: binding.Set, index: number, value: T) => void;
  insert: (set: binding.Set, value: T) => void;
};

type SetAccessorFactoryOptions<T> = {
  realm: Realm;
  typeHelpers: TypeHelpers<T>;
  itemType: binding.PropertyType;
};

/** @internal */
export function createSetAccessor<T>(options: SetAccessorFactoryOptions<T>): SetAccessor<T> {
  return options.itemType === binding.PropertyType.Mixed
    ? createSetAccessorForMixed<T>(options)
    : createSetAccessorForKnownType<T>(options);
}

function createSetAccessorForMixed<T>({
  realm,
  typeHelpers,
}: Omit<SetAccessorFactoryOptions<T>, "itemType">): SetAccessor<T> {
  const { fromBinding, toBinding } = typeHelpers;
  return {
    get(set, index) {
      // Core will not return collections within a Set.
      return fromBinding(set.getAny(index));
    },
    // Directly setting by "index" to a Set is a no-op.
    set: () => {},
    insert(set, value) {
      assert.inTransaction(realm);

      try {
        set.insertAny(toBinding(value));
      } catch (err) {
        // Optimize for the valid cases by not guarding for the unsupported nested collections upfront.
        throw transformError(err);
      }
    },
  };
}

function createSetAccessorForKnownType<T>({
  realm,
  typeHelpers,
  itemType,
}: SetAccessorFactoryOptions<T>): SetAccessor<T> {
  const { fromBinding, toBinding } = typeHelpers;
  return {
    get: createDefaultGetter({ fromBinding, itemType }),
    // Directly setting by "index" to a Set is a no-op.
    set: () => {},
    insert(set, value) {
      assert.inTransaction(realm);

      try {
        set.insertAny(toBinding(value));
      } catch (err) {
        // Optimize for the valid cases by not guarding for the unsupported nested collections upfront.
        throw transformError(err);
      }
    },
  };
}

function transformError(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message?.includes("'Array' to a Mixed") || message?.includes("'List' to a Mixed")) {
    return new Error("Lists within a Set are not supported.");
  }
  if (message?.includes("'Object' to a Mixed") || message?.includes("'Dictionary' to a Mixed")) {
    return new Error("Dictionaries within a Set are not supported.");
  }
  return err;
}
