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
  binding,
  PropertyMap,
  RealmObject,
  CanonicalObjectSchema,
  DefaultObject,
  RealmObjectConstructor,
  INTERNAL_HELPERS,
} from "./internal";

type BindingObjectSchema = binding.Realm["schema"][0];

type ObjectWrapper = (obj: binding.Obj) => (RealmObject & DefaultObject) | null;

/**
 * @internal
 */
export type ClassHelpers = {
  constructor: RealmObjectConstructor;
  // TODO: Use a different type, once exposed by the binding
  objectSchema: BindingObjectSchema;
  properties: PropertyMap;
  wrapObject: ObjectWrapper;
  canonicalObjectSchema: CanonicalObjectSchema;
};

export function setClassHelpers(constructor: RealmObjectConstructor, value: ClassHelpers): void {
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
export function getClassHelpers(arg: typeof RealmObject): ClassHelpers {
  const helpers = arg[INTERNAL_HELPERS];
  if (helpers) {
    return helpers as ClassHelpers;
  } else {
    throw new Error(`Expected INTERNAL_HELPERS to be set on the '${arg.name}' class`);
  }
}
