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

import { Counter } from "../internal";
import { createDefaultPropertyAccessor } from "./default";

import type { PropertyAccessor, PropertyOptions } from "./types";

/** @internal */
export function createIntPropertyAccessor(options: PropertyOptions): PropertyAccessor {
  const { realm, columnKey, presentation, optional } = options;
  const defaultAccessor = createDefaultPropertyAccessor(options);

  if (presentation === "counter") {
    return {
      get(obj) {
        return obj.getAny(columnKey) === null ? null : new Counter(realm, obj, columnKey);
      },
      set(obj, value, isCreating) {
        // We only allow resetting a counter this way (e.g. realmObject.counter = 5)
        // when it is first created, or when resetting a nullable/optional counter
        // to `null`, or when a nullable counter was previously `null`.
        const isAllowed =
          isCreating || (optional && (value === null || value === undefined || obj.getAny(columnKey) === null));

        if (isAllowed) {
          defaultAccessor.set(obj, value);
        } else {
          throw new Error(
            "You can only reset a Counter instance when initializing a previously " +
              "null Counter or resetting a nullable Counter to null. To update the " +
              "value of the Counter, use its instance methods.",
          );
        }
      },
    };
  } else {
    return defaultAccessor;
  }
}
