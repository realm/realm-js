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

import { ClassHelpers, ListAccessor, PresentationPropertyTypeName, Realm, TypeHelpers, binding } from "../internal";

export type PropertyContext = binding.Property & {
  type: binding.PropertyType;
  objectSchemaName: string;
  embedded: boolean;
  presentation?: PresentationPropertyTypeName;
  default?: unknown;
};

/** @internal */
export type HelperOptions = {
  realm: Realm;
  getClassHelpers: (name: string) => ClassHelpers;
};

export type PropertyOptions = {
  typeHelpers: TypeHelpers;
  columnKey: binding.ColKey;
  optional: boolean;
  embedded: boolean;
  presentation?: PresentationPropertyTypeName;
} & HelperOptions &
  binding.Property_Relaxed;

export type PropertyAccessor = {
  get(obj: binding.Obj): unknown;
  set(obj: binding.Obj, value: unknown, isCreating?: boolean): unknown;
  listAccessor?: ListAccessor;
};

/** @internal */
export type PropertyHelpers = TypeHelpers &
  PropertyAccessor & {
    type: binding.PropertyType;
    columnKey: binding.ColKey;
    embedded: boolean;
    default?: unknown;
    objectType?: string;
  };
