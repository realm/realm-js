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

import { PropertyType, TableType } from "../binding";
import { assert, binding } from "../internal";

// TODO: Update these once the binding expose proper types
type BindingObjectSchema = binding.Realm["schema"][0];
type BindingProperty = binding.Realm["schema"][0]["persistedProperties"][0];

import { CanonicalObjectSchema, CanonicalPropertySchema, PropertyTypeName } from "./types";

const TYPE_MAPPINGS: Record<binding.PropertyType, PropertyTypeName | null> = {
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
  [PropertyType.Uuid]: "uuid",
  [PropertyType.Array]: "list",
  [PropertyType.Set]: "set",
  [PropertyType.Dictionary]: "dictionary",
  [PropertyType.LinkingObjects]: "linkingObjects",
  [PropertyType.Object]: "object",
  // These have no direct
  [PropertyType.Nullable]: null,
  //
  [PropertyType.Collection]: null,
  [PropertyType.Flags]: null,
};

/**
 * Get the string representation of a property type's base type (not including flags)
 * @internal
 */
export function getTypeName(type: PropertyType, objectType: string | undefined): string {
  const baseType = type & ~PropertyType.Flags;
  if (type & PropertyType.Array) {
    if (baseType === PropertyType.Object) {
      return `list<${objectType}>`;
    } else {
      return `list<${getTypeName(baseType, objectType)}>`;
    }
  } else if (type & PropertyType.Set) {
    return `set<${getTypeName(baseType, objectType)}>`;
  } else if (type & PropertyType.Dictionary) {
    return `dictionary<${getTypeName(baseType, objectType)}>`;
  } else if (baseType === PropertyType.Object && objectType) {
    assert.string(objectType, "objectType");
    return `<${objectType}>`;
  } else {
    const result = TYPE_MAPPINGS[baseType as PropertyType];
    assert(result, `Unexpected type ${type}`);
    return result;
  }
}

const COLLECTION_TYPES = [PropertyType.Array, PropertyType.Set, PropertyType.Dictionary];

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L433-L478
 * @internal
 */
export function fromBindingObjectSchema({
  name,
  computedProperties,
  persistedProperties,
  primaryKey,
  tableType,
}: BindingObjectSchema): CanonicalObjectSchema {
  const properties = [...computedProperties, ...persistedProperties];
  const result: CanonicalObjectSchema = {
    ctor: undefined,
    name,
    properties: Object.fromEntries(
      properties.map((property) => [property.publicName || property.name, fromBindingPropertySchema(property)]),
    ),
    embedded: tableType === TableType.Embedded,
    asymmetric: tableType === TableType.TopLevelAsymmetric,
  };
  // The primary key from the binding is an empty string when not set
  if (primaryKey) {
    result.primaryKey = primaryKey;
  }
  return result;
}

/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L480-L530
 * @internal
 */
export function fromBindingPropertySchema(propertySchema: BindingProperty): CanonicalPropertySchema {
  const { name, isIndexed, isFulltextIndexed, publicName } = propertySchema;
  const result: CanonicalPropertySchema = {
    name,
    indexed: isFulltextIndexed ? "full-text" : isIndexed,
    mapTo: name,
    ...fromBindingPropertyTypeName(propertySchema),
  };
  if (publicName) {
    result.name = publicName;
  }
  return result;
}

/** @internal */
function fromBindingPropertyTypeName(
  propertySchema: BindingProperty,
): Pick<CanonicalPropertySchema, "type" | "optional" | "objectType" | "property"> {
  const { type, objectType, linkOriginPropertyName } = propertySchema;
  const itemType = type & ~PropertyType.Collection;

  if (type & PropertyType.Nullable) {
    const item = fromBindingPropertyTypeName({ ...propertySchema, type: type & ~PropertyType.Nullable });
    return { ...item, optional: true };
  }

  if (itemType === PropertyType.LinkingObjects) {
    assert(type & PropertyType.Array);
    assert.string(linkOriginPropertyName, "linkOriginPropertyName");
    return {
      type: "linkingObjects",
      optional: false,
      objectType,
      property: linkOriginPropertyName,
    };
  }

  for (const collectionType of COLLECTION_TYPES) {
    if (type & collectionType) {
      const item = fromBindingPropertyTypeName({ ...propertySchema, type: itemType });
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
    // TODO: Decide if this change is reasonable
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
export function fromBindingRealmSchema(schema: Readonly<BindingObjectSchema[]>): CanonicalObjectSchema[] {
  return schema.map(fromBindingObjectSchema);
}
