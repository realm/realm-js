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

import { Realm, PropertyType } from "../binding";

// TODO: Update these once the binding expose proper types
type BindingObjectSchema = Realm["schema"][0];
type BindingProperty = Realm["schema"][0]["persistedProperties"][0];

import { CanonicalObjectSchema, CanonicalObjectSchemaProperty, PropertyTypeName } from "./types";

const TYPE_MAPPINGS: Record<PropertyType, PropertyTypeName | null> = {
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
  //
  [PropertyType.Collection]: null,
  [PropertyType.Flags]: null,
};

const COLLECTION_TYPES = [PropertyType.Array, PropertyType.Set, PropertyType.Dictionary];

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L433-L478
 * @param objectSchema The object schema, as represented by the binding.
 * @returns The object schema, as represented by the SDK.
 * @internal
 */
export function transformObjectSchema({
  name,
  computedProperties,
  persistedProperties,
  primaryKey,
}: BindingObjectSchema): CanonicalObjectSchema {
  const result: CanonicalObjectSchema = {
    name,
    properties: Object.fromEntries(
      [...computedProperties, ...persistedProperties].map((property) => [
        property.name,
        transformPropertySchema(property),
      ]),
    ),
  };
  // The primary key from the binding is an empty string when not set
  if (primaryKey) {
    result.primaryKey = primaryKey;
  }
  return result;
}

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L480-L530
 * @param propertySchema The property schema, as represented by the binding.
 * @returns The property schema, as represented by the SDK.
 * @internal
 */
export function transformPropertySchema(propertySchema: BindingProperty): CanonicalObjectSchemaProperty {
  const { name, isIndexed, publicName } = propertySchema;
  const result = {
    name,
    indexed: isIndexed,
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
      return {
        type: TYPE_MAPPINGS[collectionType] as PropertyTypeName,
        objectType: item.type === "object" ? item.objectType : item.type,
        optional: item.type === "object" ? false : item.optional,
      };
    }
  }

  if (type === PropertyType.Object) {
    if (!objectType) {
      throw new Error("Expected property with 'object' type to declare an objectType");
    }
    // TODO: Decide if this change is resonable
    return { type: "object", objectType, optional: true }; // Implicitly nullable
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

/** @internal */
export function transformRealmSchema(schema: Readonly<BindingObjectSchema[]>): CanonicalObjectSchema[] {
  return schema.map(transformObjectSchema);
}
