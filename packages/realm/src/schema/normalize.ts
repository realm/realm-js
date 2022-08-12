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

import { TYPE_MAPPINGS } from "./to-binding";
import {
  CanonicalObjectSchema,
  CanonicalObjectSchemaProperty,
  ObjectSchema,
  ObjectSchemaProperty,
  PropertyTypeName,
  RealmObjectConstructor,
} from "./types";

export const PRIMITIVE_TYPES: PropertyTypeName[] = [
  "bool",
  "int",
  "float",
  "double",
  "decimal128",
  "objectId",
  "string",
  "data",
  "date",
  "mixed",
  "uuid",
];

export const COLLECTION_TYPES: PropertyTypeName[] = ["set", "dictionary", "list"];

export function normalizeRealmSchema(
  schema: (RealmObjectConstructor<unknown> | ObjectSchema)[],
): CanonicalObjectSchema[] {
  return schema.map(normalizeObjectSchema);
}

export function normalizeObjectSchema(schema: RealmObjectConstructor<unknown> | ObjectSchema): CanonicalObjectSchema {
  if (typeof schema === "function") {
    throw new Error("Not yet implemented");
  } else {
    return {
      name: schema.name,
      properties: Object.fromEntries(
        Object.entries(schema.properties).map(([name, property]) => {
          return [name, normalizePropertySchema(name, property)];
        }),
      ),
    };
  }
}

// TODO: Extend to handle all short hands
export function normalizePropertySchema(
  name: string,
  schema: string | ObjectSchemaProperty,
): CanonicalObjectSchemaProperty {
  if (typeof schema === "string") {
    return normalizePropertySchema(name, { type: schema });
  } else if (schema.type.endsWith("[]")) {
    return normalizePropertySchema(name, {
      ...schema,
      type: "list",
      objectType: schema.type.substring(0, schema.type.length - 2),
    });
  } else if (schema.type.endsWith("<>")) {
    return normalizePropertySchema(name, {
      ...schema,
      type: "set",
      objectType: schema.type.substring(0, schema.type.length - 2),
    });
  } else if (schema.type.endsWith("{}")) {
    return normalizePropertySchema(name, {
      ...schema,
      type: "dictionary",
      objectType: schema.type.substring(0, schema.type.length - 2),
    });
  } else if (schema.type.endsWith("?")) {
    return normalizePropertySchema(name, {
      ...schema,
      optional: true,
      type: schema.type.substring(0, schema.type.length - 1),
    });
  } else if (schema.type in TYPE_MAPPINGS) {
    return {
      name,
      type: schema.type as PropertyTypeName,
      mapTo: schema.mapTo || name,
      objectType: schema.objectType,
      property: schema.property,
      indexed: schema.indexed || false,
      optional: schema.optional || COLLECTION_TYPES.includes(schema.type as PropertyTypeName), // Collection types are always optional
    };
  } else {
    // Any type that is not a recognized short hand nor directly mapable, we consider an object link
    return normalizePropertySchema(name, { ...schema, type: "object", objectType: schema.type, optional: true });
  }
}

export function extractGeneric(type: string): { typeBase: string; typeArgument?: string } {
  const bracketStart = type.indexOf("<");
  const bracketEnd = type.indexOf(">", bracketStart);
  if (bracketStart === -1) {
    return { typeBase: type };
  } else {
    return { typeBase: type.substring(0, bracketStart), typeArgument: type.substring(bracketStart + 1, bracketEnd) };
  }
}
