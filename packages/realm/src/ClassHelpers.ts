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

import * as binding from "./binding";

import type { PropertyMap, ObjectWrapCreator } from "./PropertyMap";
import type { Object as RealmObject } from "./Object";

export const INTERNAL_HELPERS = Symbol("Realm.Object#helpers");

/**
 * @internal
 */
export type ClassHelpers<T> = {
  // TODO: Use a different type, once exposed by the binding
  objectSchema: binding.Realm["schema"][0];
  properties: PropertyMap;
  createObjectWrapper: ObjectWrapCreator<T>;
};

export function setHelpers<T>(constructor: typeof RealmObject, value: ClassHelpers<T>): void {
  // Store the properties map on the object class
  Object.defineProperty(constructor, INTERNAL_HELPERS, {
    enumerable: false,
    writable: false,
    configurable: false,
    value,
  });
}

/**
 * Get internal helpers.
 * NOTE: This is a free function instead of a member of RealmObject to limit conflicts with user defined properties.
 * @param arg The object or constructor to get a helpers for.
 * @returns Helpers injected onto the class by the `ClassMap`.
 */
export function getHelpers<T>(arg: typeof RealmObject): ClassHelpers<T> {
  const helpers = arg[INTERNAL_HELPERS];
  if (helpers) {
    return helpers as ClassHelpers<T>;
  } else {
    throw new Error("Expected INTERNAL_HELPERS to be set on the class");
  }
}
