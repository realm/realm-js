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
import { createDefaultPropertyAccessor } from "./default";
import type { PropertyAccessor, PropertyOptions } from "./types";

function createEmbeddedSet({ typeHelpers: { toBinding }, columnKey }: PropertyOptions) {
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

/** @internal */
export function createObjectPropertyAccessor(options: PropertyOptions): PropertyAccessor {
  const {
    columnKey,
    typeHelpers: { fromBinding },
    embedded,
  } = options;
  assert(options.optional, "Objects are always nullable");

  const { set: defaultSet } = createDefaultPropertyAccessor(options);

  return {
    get(obj) {
      return fromBinding(obj.getLinkedObject(columnKey));
    },
    set: embedded ? createEmbeddedSet(options) : defaultSet,
  };
}
