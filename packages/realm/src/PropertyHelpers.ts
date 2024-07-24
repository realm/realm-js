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

import { binding } from "../binding";
import { type TypeOptions, getTypeHelpers, toItemType } from "./TypeHelpers";

import { createArrayPropertyAccessor } from "./property-accessors/Array";
import { createObjectPropertyAccessor } from "./property-accessors/Object";
import { createDictionaryPropertyAccessor } from "./property-accessors/Dictionary";
import { createSetPropertyAccessor } from "./property-accessors/Set";
import { createIntPropertyAccessor } from "./property-accessors/Int";
import { createMixedPropertyAccessor } from "./property-accessors/Mixed";
import { createDefaultPropertyAccessor } from "./property-accessors/default";
import type {
  HelperOptions,
  PropertyAccessor,
  PropertyContext,
  PropertyHelpers,
  PropertyOptions,
} from "./property-accessors/types";

type AccessorFactory = (options: PropertyOptions) => PropertyAccessor;

const ACCESSOR_FACTORIES: Partial<Record<binding.PropertyType, AccessorFactory>> = {
  [binding.PropertyType.Int]: createIntPropertyAccessor,
  [binding.PropertyType.Object]: createObjectPropertyAccessor,
  [binding.PropertyType.Array]: createArrayPropertyAccessor,
  [binding.PropertyType.Dictionary]: createDictionaryPropertyAccessor,
  [binding.PropertyType.Set]: createSetPropertyAccessor,
  [binding.PropertyType.Mixed]: createMixedPropertyAccessor,
  [binding.PropertyType.LinkingObjects]() {
    return {
      get() {
        throw new Error("Getting linking objects happens through Array");
      },
      set() {
        throw new Error("Setting linking objects happens through Array");
      },
    };
  },
};

function createDefaultPropertyHelpers(options: PropertyOptions): PropertyHelpers {
  const { typeHelpers, columnKey, embedded, objectType } = options;
  return {
    ...createDefaultPropertyAccessor(options),
    ...typeHelpers,
    type: options.type,
    columnKey,
    embedded,
    objectType,
  };
}

function getPropertyHelpers(type: binding.PropertyType, options: PropertyOptions): PropertyHelpers {
  const { typeHelpers, columnKey, embedded, objectType } = options;
  const accessorFactory = ACCESSOR_FACTORIES[type];
  if (accessorFactory) {
    return { ...accessorFactory(options), ...typeHelpers, type: options.type, columnKey, embedded, objectType };
  } else {
    return createDefaultPropertyHelpers(options);
  }
}

/** @internal */
export function createPropertyHelpers(property: PropertyContext, options: HelperOptions): PropertyHelpers {
  const collectionType = property.type & binding.PropertyType.Collection;
  const typeOptions: TypeOptions = {
    realm: options.realm,
    name: property.publicName || property.name,
    getClassHelpers: options.getClassHelpers,
    objectType: property.objectType,
    objectSchemaName: property.objectSchemaName,
    optional: !!(property.type & binding.PropertyType.Nullable),
    presentation: property.presentation,
  };
  if (collectionType) {
    return getPropertyHelpers(collectionType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(collectionType, typeOptions),
    });
  } else {
    const itemType = toItemType(property.type);
    return getPropertyHelpers(itemType, {
      ...property,
      ...options,
      ...typeOptions,
      typeHelpers: getTypeHelpers(itemType, typeOptions),
    });
  }
}
