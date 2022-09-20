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
} from "../binding";

import { CanonicalObjectSchema, CanonicalObjectSchemaProperty, PropertyTypeName } from "./types";

/** @internal */
export const TYPE_MAPPINGS: Record<PropertyTypeName, BindingPropertyType> = {
  int: BindingPropertyType.Int,
  bool: BindingPropertyType.Bool,
  string: BindingPropertyType.String,
  data: BindingPropertyType.Data,
  date: BindingPropertyType.Date,
  float: BindingPropertyType.Float,
  double: BindingPropertyType.Double,
  mixed: BindingPropertyType.Mixed,
  objectId: BindingPropertyType.ObjectId,
  decimal128: BindingPropertyType.Decimal,
  uuid: BindingPropertyType.UUID,
  list: BindingPropertyType.Array,
  set: BindingPropertyType.Set,
  dictionary: BindingPropertyType.Dictionary,
  linkingObjects: BindingPropertyType.LinkingObjects,
  object: BindingPropertyType.Object,
};

/** @internal */
export function transformRealmSchema(schema: CanonicalObjectSchema[]): BindingObjectSchema[] {
  return schema.map(transformObjectSchema);
}

/** @internal */
export function transformObjectSchema(schema: CanonicalObjectSchema): BindingObjectSchema {
  // TODO: Enable declaring the alias of the object schema
  // TODO: Enable declaring the table type (asymmetric / embedded)
  // TODO: Enable declaring computed properties
  const properties = Object.entries(schema.properties).map(([name, property]) =>
    transformPropertySchema(name, property),
  );
  return {
    name: schema.name,
    primaryKey: schema.primaryKey,
    persistedProperties: properties.filter((p) => p.type !== BindingPropertyType.LinkingObjects),
    computedProperties: properties.filter((p) => p.type === BindingPropertyType.LinkingObjects),
  };
}

/** @internal */
export function transformPropertySchema(name: string, schema: CanonicalObjectSchemaProperty): BindingProperty {
  if (name !== schema.name) {
    // TODO: Consider if this API should be used to support declaring an alias?
    throw new Error("The key of a property must match its name property");
  }
  const result: BindingProperty = {
    name,
    type: transformPropertyType(schema),
    isIndexed: schema.indexed,
    publicName: name !== schema.mapTo ? schema.mapTo : undefined,
    objectType: schema.objectType && schema.objectType in TYPE_MAPPINGS ? undefined : schema.objectType,
  };
  return result;
}

/** @internal */
export function transformPropertyType(schema: CanonicalObjectSchemaProperty): BindingPropertyType {
  let type = TYPE_MAPPINGS[schema.type];
  let isNullable = schema.optional;
  if (schema.objectType) {
    if (schema.objectType in TYPE_MAPPINGS) {
      type |= TYPE_MAPPINGS[schema.objectType as PropertyTypeName];
    } else {
      type |= BindingPropertyType.Object;
      // Implicitly nullable - will throw if sat
      isNullable = false;
    }
  }
  if (schema.type === "object" || schema.type === "mixed") {
    // Implicitly nullable - will throw if not sat
    isNullable = true;
  }
  if (isNullable) {
    type |= BindingPropertyType.Nullable;
  }
  return type;
}
