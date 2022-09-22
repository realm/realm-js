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

import { assert } from "../assert";
import { TYPE_MAPPINGS } from "./to-binding";
import {
  CanonicalObjectSchema,
  CanonicalObjectSchemaProperty,
  ObjectSchema,
  ObjectSchemaProperty,
  PropertyTypeName,
  RealmObjectConstructor,
} from "./types";
import { Object as RealmObject } from "../Object";

export const PRIMITIVE_TYPES = new Set<PropertyTypeName>([
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
]);

function isPrimitive(type: string | undefined) {
  return PRIMITIVE_TYPES.has(type as PropertyTypeName);
}

function validateCanonicalPropertySchema(
  objectSchemaName: string,
  { name, type, objectType, optional }: CanonicalObjectSchemaProperty,
) {
  if (type === "list" && objectType === "list") {
    throw new Error(`List property '${objectSchemaName}#${name}' cannot have list elements`);
  }
  if (type === "list" && !isPrimitive(objectType) && optional) {
    throw new Error(`List property '${objectSchemaName}#${name}' of '${objectType}' elements, cannot be optional`);
  }
  if (objectType === "") {
    throw new Error(`Property '${objectSchemaName}#${name}' cannot have an empty object type`);
  }
}

export const COLLECTION_TYPES: PropertyTypeName[] = ["set", "dictionary", "list"];

function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v !== "undefined")) as T;
}

export function normalizeRealmSchema(schema: (RealmObjectConstructor | ObjectSchema)[]): CanonicalObjectSchema[] {
  return schema.map(normalizeObjectSchema);
}

export function normalizeObjectSchema(arg: RealmObjectConstructor | ObjectSchema): CanonicalObjectSchema {
  if (typeof arg === "function") {
    assert.extends(arg, RealmObject);
    assert.object(arg.schema, "schema static");
    const schema = normalizeObjectSchema(arg.schema as ObjectSchema);
    schema.constructor = arg;
    return schema;
  } else {
    return {
      constructor: undefined,
      name: arg.name,
      primaryKey: arg.primaryKey,
      properties: Object.fromEntries(
        Object.entries(arg.properties).map(([name, property]) => {
          const canonicalPropertySchema = normalizePropertySchema(name, property);
          // A primary key is always indexed
          if (name === arg.primaryKey) {
            canonicalPropertySchema.indexed = true;
          }
          validateCanonicalPropertySchema(arg.name, canonicalPropertySchema);
          return [name, canonicalPropertySchema];
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
    return normalizePropertySchema(name, normalizePropertyType(schema));
  } else {
    // Type casting, since it is expected that normalizePropertyType moves an object linked type into `objectType`
    const normalizedType = normalizePropertyType(schema.type) as ObjectSchemaProperty & { type: PropertyTypeName };
    return {
      indexed: false,
      optional: false,
      mapTo: name, // TODO: Make this optional?
      ...removeUndefinedValues(schema),
      ...removeUndefinedValues(normalizedType),
      name,
    };
  }
}

export function normalizePropertyType(type: string): ObjectSchemaProperty {
  if (type.endsWith("[]")) {
    const item = normalizePropertyType(type.substring(0, type.length - 2));
    if (item.type !== "object" && item.objectType) {
      throw new Error(`Unexpected nested object type ${item.objectType}`);
    }
    return {
      type: "list",
      objectType: item.type === "object" ? item.objectType : item.type,
      optional: item.type === "object" ? false : item.optional,
    };
  } else if (type.endsWith("<>")) {
    const item = normalizePropertyType(type.substring(0, type.length - 2));
    if (item.objectType) {
      throw new Error(`Unexpected nested object type ${item.objectType}`);
    }
    return {
      type: "set",
      objectType: item.type,
      optional: item.optional,
    };
  } else if (type.endsWith("{}")) {
    const item = normalizePropertyType(type.substring(0, type.length - 2));
    if (item.objectType) {
      throw new Error(`Unexpected nested object type ${item.objectType}`);
    }
    return {
      type: "dictionary",
      objectType: item.type,
      optional: item.optional,
    };
  } else if (type.endsWith("?")) {
    return {
      optional: true,
      type: type.substring(0, type.length - 1),
    };
  } else if (type in TYPE_MAPPINGS) {
    // This type is directly mappable, so it can't be the name a user defined object schema.
    return { type };
  } else {
    return { type: "object", objectType: type, optional: true };
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
