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
  ObjectSchema as BindingObjectSchema,
  Property as BindingProperty,
  PropertyType as BindingPropertyType,
  TableType,
} from "../binding";
import { assert } from "../internal";

import { CanonicalObjectSchema, CanonicalPropertySchema, PropertyTypeName } from "./types";

const TYPE_MAPPINGS: Record<BindingPropertyType, PropertyTypeName | null> = {
  [BindingPropertyType.Int]: "int",
  [BindingPropertyType.Bool]: "bool",
  [BindingPropertyType.String]: "string",
  [BindingPropertyType.Data]: "data",
  [BindingPropertyType.Date]: "date",
  [BindingPropertyType.Float]: "float",
  [BindingPropertyType.Double]: "double",
  [BindingPropertyType.Mixed]: "mixed",
  [BindingPropertyType.ObjectId]: "objectId",
  [BindingPropertyType.Decimal]: "decimal128",
  [BindingPropertyType.Uuid]: "uuid",
  [BindingPropertyType.Array]: "list",
  [BindingPropertyType.Set]: "set",
  [BindingPropertyType.Dictionary]: "dictionary",
  [BindingPropertyType.LinkingObjects]: "linkingObjects",
  [BindingPropertyType.Object]: "object",
  // These have no direct
  [BindingPropertyType.Nullable]: null,
  //
  [BindingPropertyType.Collection]: null,
  [BindingPropertyType.Flags]: null,
};

/**
 * Get the string representation of a property type's base type (not including flags)
 * @internal
 */
export function getTypeName(type: BindingPropertyType, objectType: string | undefined): string {
  const baseType = type & ~BindingPropertyType.Flags;
  if (type & BindingPropertyType.Array) {
    if (baseType === BindingPropertyType.Object) {
      return `list<${objectType}>`;
    } else {
      return `list<${getTypeName(baseType, objectType)}>`;
    }
  } else if (type & BindingPropertyType.Set) {
    return `set<${getTypeName(baseType, objectType)}>`;
  } else if (type & BindingPropertyType.Dictionary) {
    return `dictionary<${getTypeName(baseType, objectType)}>`;
  } else if (baseType === BindingPropertyType.Object && objectType) {
    assert.string(objectType, "objectType");
    return `<${objectType}>`;
  } else {
    const result = TYPE_MAPPINGS[baseType as BindingPropertyType];
    assert(result, `Unexpected type ${type}`);
    return result;
  }
}

const COLLECTION_TYPES = [BindingPropertyType.Array, BindingPropertyType.Set, BindingPropertyType.Dictionary];

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
  const itemType = type & ~BindingPropertyType.Collection;

  if (type & BindingPropertyType.Nullable) {
    const item = fromBindingPropertyTypeName({ ...propertySchema, type: type & ~BindingPropertyType.Nullable });
    return { ...item, optional: true };
  }

  if (itemType === BindingPropertyType.LinkingObjects) {
    assert(type & BindingPropertyType.Array);
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

  if (type === BindingPropertyType.Object) {
    if (!objectType) {
      throw new Error("Expected property with 'object' type to declare an objectType");
    }
    // TODO: Decide if this change is reasonable
    return { type: "object", objectType, optional: true }; // Implicitly nullable
  } else if (type === BindingPropertyType.LinkingObjects) {
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
