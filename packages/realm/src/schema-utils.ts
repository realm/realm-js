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

import { ObjectSchema as BindingObjectSchema, Property as BindingProperty, PropertyType } from "@realm/bindgen";
import { CanonicalObjectSchema, CanonicalObjectSchemaProperty } from "./Object";

export type PropertyTypeNames =
  | "bool"
  | "int"
  | "float"
  | "double"
  | "decimal128"
  | "objectId"
  | "string"
  | "data"
  | "date"
  | "list"
  | "linkingObjects"
  | "mixed"
  | "uuid"
  | "dictionary"
  | "set";

const TYPE_MAPPINGS: Record<PropertyType, PropertyTypeNames | null> = {
  [PropertyType.Int]: "int",
  [PropertyType.Bool]: "bool",
  [PropertyType.String]: "string",
  [PropertyType.Data]: "data",
  [PropertyType.Date]: "date",
  [PropertyType.Float]: "float",
  [PropertyType.Double]: "double",
  [PropertyType.Mixed]: "mixed",
  [PropertyType.ObjectId]: "objectId",
  [PropertyType.Decimal]: "decimal128",
  [PropertyType.UUID]: "uuid",
  [PropertyType.Array]: "list",
  [PropertyType.Set]: "set",
  [PropertyType.Dictionary]: "dictionary",
  [PropertyType.LinkingObjects]: "linkingObjects",
  // These have no direct
  [PropertyType.Object]: null,
  [PropertyType.Nullable]: null,
};

const COLLECTION_TYPES = [PropertyType.Array, PropertyType.Set, PropertyType.Dictionary];

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L433-L478
 * @param objectSchema The object schema, as represented by the binding.
 * @returns The object schema, as represented by the SDK.
 */
export function transformObjectSchema({
  name,
  computedProperties = [],
  persistedProperties = [],
}: BindingObjectSchema): CanonicalObjectSchema {
  return {
    name,
    properties: Object.fromEntries(
      [...computedProperties, ...persistedProperties].map((property) => [
        property.name,
        transformPropertySchema(property),
      ]),
    ),
  };
}

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L480-L530
 * @param propertySchema The property schema, as represented by the binding.
 * @returns The property schema, as represented by the SDK.
 */
export function transformPropertySchema(propertySchema: BindingProperty): CanonicalObjectSchemaProperty {
  const { name, isIndexed, publicName } = propertySchema;
  const result = {
    name,
    indexed: isIndexed || false,
    mapTo: publicName ? publicName : name,
    ...transformPropertyTypeName(propertySchema),
  };
  return result;
}

/**
 * Used to
 * @param propertySchema The property schema, as represented by the binding.
 * @returns A partial property schema, as represented by the SDK.
 */
function transformPropertyTypeName(
  propertySchema: BindingProperty,
): Pick<CanonicalObjectSchemaProperty, "type" | "optional" | "objectType"> {
  const { type, objectType } = propertySchema;

  if (type & PropertyType.Nullable) {
    const item = transformPropertyTypeName({ ...propertySchema, type: type ^ PropertyType.Nullable });
    return { ...item, optional: true };
  }

  for (const collectionType of COLLECTION_TYPES) {
    if (type & collectionType) {
      const item = transformPropertyTypeName({ ...propertySchema, type: type ^ collectionType });
      return { optional: item.optional, objectType: item.type, type: "list" };
    }
  }

  if (type === PropertyType.Object) {
    if (!objectType) {
      throw new Error("Expected property with 'object' type to declare an objectType");
    }
    return { type: objectType, optional: false };
  } else if (type === PropertyType.LinkingObjects) {
    if (!objectType) {
      throw new Error("Expected property with 'object' type to declare an objectType");
    }
    return { type: "linkingObjects", objectType, optional: false };
  }

  const mappedType = TYPE_MAPPINGS[type];
  if (mappedType) {
    return { type: mappedType, optional: false };
  } else {
    throw new Error(`Unexpected type '${type}'`);
  }
}
