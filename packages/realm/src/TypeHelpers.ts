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

import { assert, binding } from "./internal";

import { createIntTypeHelpers } from "./type-helpers/Int";
import { createBoolTypeHelpers } from "./type-helpers/Bool";
import { createStringTypeHelpers } from "./type-helpers/String";
import { createDataTypeHelpers } from "./type-helpers/Data";
import { createDateTypeHelpers } from "./type-helpers/Date";
import { createMixedTypeHelpers } from "./type-helpers/Mixed";
import { createObjectIdTypeHelpers } from "./type-helpers/ObjectId";
import { createFloatTypeHelpers } from "./type-helpers/Float";
import { createDoubleTypeHelpers } from "./type-helpers/Double";
import { createObjectTypeHelpers } from "./type-helpers/Object";
import { createLinkingObjectsTypeHelpers } from "./type-helpers/LinkingObjects";
import { createDecimalTypeHelpers } from "./type-helpers/Decimal";
import { createUuidTypeHelpers } from "./type-helpers/Uuid";
import { createArrayTypeHelpers } from "./type-helpers/Array";

import type { TypeHelpers, TypeOptions } from "./type-helpers/types";

function createUnsupportedTypeHelpers(): TypeHelpers {
  return {
    fromBinding() {
      throw new Error("Not yet supported");
    },
    toBinding() {
      throw new Error("Not yet supported");
    },
  };
}

/** @internal */
export type MappableTypeHelpers = Exclude<
  binding.PropertyType,
  binding.PropertyType.Nullable | binding.PropertyType.Collection | binding.PropertyType.Flags
>;

const TYPES_MAPPING: Record<MappableTypeHelpers, (options: TypeOptions) => TypeHelpers> = {
  [binding.PropertyType.Int]: createIntTypeHelpers,
  [binding.PropertyType.Bool]: createBoolTypeHelpers,
  [binding.PropertyType.String]: createStringTypeHelpers,
  [binding.PropertyType.Data]: createDataTypeHelpers,
  [binding.PropertyType.Date]: createDateTypeHelpers,
  [binding.PropertyType.Float]: createFloatTypeHelpers,
  [binding.PropertyType.Double]: createDoubleTypeHelpers,
  [binding.PropertyType.Object]: createObjectTypeHelpers,
  [binding.PropertyType.LinkingObjects]: createLinkingObjectsTypeHelpers,
  [binding.PropertyType.Mixed]: createMixedTypeHelpers,
  [binding.PropertyType.ObjectId]: createObjectIdTypeHelpers,
  [binding.PropertyType.Decimal]: createDecimalTypeHelpers,
  [binding.PropertyType.Uuid]: createUuidTypeHelpers,
  [binding.PropertyType.Array]: createArrayTypeHelpers,
  // Unsupported below
  [binding.PropertyType.Set]: createUnsupportedTypeHelpers,
  [binding.PropertyType.Dictionary]: createUnsupportedTypeHelpers,
};

/** @internal */
export function toItemType(type: binding.PropertyType) {
  return type & ~binding.PropertyType.Flags;
}

/** @internal */
export function getTypeHelpers(type: MappableTypeHelpers, options: TypeOptions): TypeHelpers {
  const helpers = TYPES_MAPPING[type];
  assert(helpers, `Unexpected type ${type}`);
  return helpers(options);
}
