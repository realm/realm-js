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
  CanonicalObjectSchema,
  CanonicalObjectSchemaProperty,
  CollectionPropertyTypeName,
  ObjectSchema,
  ObjectSchemaProperty, // TODO: Rename to PropertySchema
  PrimitivePropertyTypeName,
  PropertiesTypes,
  PropertyTypeName,
  RealmObject,
  RealmObjectConstructor,
  assert,
  flags,
} from "../internal";

const PRIMITIVE_TYPES = new Set<PrimitivePropertyTypeName>([
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

const COLLECTION_TYPES = new Set<CollectionPropertyTypeName>(["list", "dictionary", "set"]);

function isPrimitive(type: string | undefined): boolean {
  return PRIMITIVE_TYPES.has(type as PrimitivePropertyTypeName);
}

function isCollection(type: string | undefined): boolean {
  return COLLECTION_TYPES.has(type as CollectionPropertyTypeName);
}

function isUserDefined(type: string | undefined): boolean {
  return !!type && !isPrimitive(type) && !isCollection(type) && type !== "object" && type !== "linkingObjects";
}

export function normalizeRealmSchema(
  schema: Readonly<(RealmObjectConstructor | ObjectSchema)[]>,
): CanonicalObjectSchema[] {
  return schema.map(normalizeObjectSchema);
}

export function normalizeObjectSchema(arg: RealmObjectConstructor | ObjectSchema): CanonicalObjectSchema {
  if (typeof arg === "function") {
    assert.extends(arg, RealmObject);
    assert.object(arg.schema, "schema static");
    const schema = normalizeObjectSchema(arg.schema as ObjectSchema);
    schema.constructor = arg;
    return schema;
  }

  // ---- THIS IF BLOCK HAS NOT YET BEEN MODIFIED ----
  // TODO: Determine if we still want to support this
  if (Array.isArray(arg.properties)) {
    if (flags.ALLOW_VALUES_ARRAYS) {
      return normalizeObjectSchema({
        ...arg,
        // Build the PropertiesTypes object
        properties: Object.fromEntries(arg.properties.map(({ name, ...rest }) => [name, rest])),
      });
    }
    throw new Error("Array of properties are no longer supported");
  }
  // -------------------------------------------------

  return {
    constructor: undefined,
    name: arg.name,
    primaryKey: arg.primaryKey,
    asymmetric: !!arg.asymmetric,
    embedded: !!arg.embedded,
    properties: normalizePropertySchemas(arg.properties, arg.primaryKey),
  };
}

function normalizePropertySchemas(
  schemas: PropertiesTypes,
  primaryKey?: string,
): Record<string, CanonicalObjectSchemaProperty> {
  const normalizedSchemas: Record<string, CanonicalObjectSchemaProperty> = {};
  for (const name in schemas) {
    normalizedSchemas[name] = normalizePropertySchema(name, schemas[name], primaryKey === name);
  }

  return normalizedSchemas;
}

export function normalizePropertySchema(
  name: string,
  schema: string | ObjectSchemaProperty,
  isPrimaryKey = false,
): CanonicalObjectSchemaProperty {
  const normalizedSchema =
    typeof schema === "string"
      ? normalizePropertySchemaString(name, schema)
      : normalizePropertySchemaObject(name, schema);

  if (isPrimaryKey) {
    ensure(!normalizedSchema.optional, name, "Optional properties cannot be used as a primary key.");
    normalizedSchema.indexed = true;
  }

  return normalizedSchema;
}

function normalizePropertySchemaString(name: string, schema: string): CanonicalObjectSchemaProperty {
  ensure(schema.length > 0, name, "You must specify a type.");

  let type = "";
  let objectType: string | undefined;
  let optional = false;

  const endIsCollection = schema.endsWith("[]") || schema.endsWith("{}") || schema.endsWith("<>");
  if (endIsCollection) {
    const end = schema.substring(schema.length - 2);
    if (end === "[]") {
      type = "list";
    } else if (end === "{}") {
      type = "dictionary";
    } else {
      // end === "<>"
      type = "set";
    }
    schema = schema.substring(0, schema.length - 2);
    ensure(schema.length > 0, name, `The element type must be specified. See example: 'int${end}'`);
  }

  if (schema.endsWith("?")) {
    optional = true;
    schema = schema.substring(0, schema.length - 1);
    ensure(schema.length > 0, name, "The type must be specified. See examples: 'int?', 'int?[]'");
  }

  if (isPrimitive(schema)) {
    if (endIsCollection) {
      objectType = schema;
    } else {
      type = schema as PropertyTypeName;
    }
  } else if (isCollection(schema)) {
    error(name, "Cannot use the collection name. See examples: 'int[]' (list), 'int{}' (dictionary), 'int<>' (set).");
  } else if (schema === "object") {
    error(name, "To define a relationship, use either 'ObjectName' or { type: 'object', objectType: 'ObjectName' }");
  } else if (schema === "linkingObjects") {
    error(
      name,
      "To define an inverse relationship, use { type: 'linkingObjects', objectType: 'ObjectName', property: 'ObjectProperty' }",
    );
  } else {
    // User-defined types
    objectType = schema;
    if (!endIsCollection) {
      type = "object";
    }
  }

  const isImplicitlyNullable =
    type === "mixed" || type === "object" || objectType === "mixed" || isUserDefined(objectType);
  if (isImplicitlyNullable) {
    optional = true;
  }

  // Using 'assert()' here only for internal validation of logic.
  assert(type.length, "Logic error: Expected 'type' to not be empty.");

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name,
    type: type as PropertyTypeName,
    optional,
    indexed: false,
    mapTo: name,
    objectType,
  };

  return removeUndefinedFields(normalizedSchema);
}

function normalizePropertySchemaObject(name: string, schema: ObjectSchemaProperty): CanonicalObjectSchemaProperty {
  const { type, objectType } = schema;
  let { optional } = schema;

  ensure(type.length > 0, name, "'type' must be specified.");

  if (isPrimitive(type)) {
    ensure(objectType === undefined, name, `'objectType' cannot be defined when 'type' is '${type}'.`); // TODO: Maybe we should allow 'objectType' to be an empty string as well and not yell at the user.
  } else if (isCollection(type)) {
    ensure(isPrimitive(objectType) || isUserDefined(objectType), name, "A valid 'objectType' must be specified.");
  } else if (type === "object" || type === "linkingObjects") {
    ensure(isUserDefined(objectType), name, `A user-defined type must be specified through 'objectType'.`);
  } else {
    // 'type' is a user-defined type which is always invalid
    error(
      name,
      `If you meant to define a relationship, use { type: 'object', objectType: '${type}' } or { type: 'linkingObjects', objectType: '${type}', property: 'The ${type} property' }`,
    );
  }

  const isImplicitlyNullable =
    type !== "linkingObjects" &&
    (type === "mixed" || type === "object" || objectType === "mixed" || isUserDefined(objectType));
  if (isImplicitlyNullable) {
    const displayedType = type === "object" ? "user-defined" : "'mixed'";
    ensure(
      optional !== false, // Don't check for !optional, since 'undefined' is allowed
      name,
      `A ${displayedType} type can itself be a null value, so 'optional' cannot be set to 'false'.`,
    );
    optional = true;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!schema.indexed,
    mapTo: schema.mapTo || name,
    objectType,
    property: schema.property,
    default: schema.default,
  };

  return removeUndefinedFields(normalizedSchema);
}

function ensure(condition: boolean, propertyName: string, errMessage: string): void | never {
  if (!condition) {
    error(propertyName, errMessage);
  }
}

function error(propertyName: string, errMessage: string): never {
  // TODO: Create a SchemaParseError that extends Error
  throw new Error(`Invalid schema for property '${propertyName}': ${errMessage}`);
}

function removeUndefinedFields<T extends Record<string, unknown>>(object: T): T {
  const copiedObject = { ...object };
  for (const key in copiedObject) {
    if (copiedObject[key] === undefined) {
      delete copiedObject[key];
    }
  }

  return copiedObject;
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
