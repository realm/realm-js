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
  ObjectSchemaProperty,
  PrimitivePropertyTypeName,
  PropertiesTypes,
  PropertyTypeName,
  RealmObject,
  RealmObjectConstructor,
  TypeAssertionError,
  assert,
  flags,
} from "../internal";

type ObjectAndPropertyName = {
  readonly objectName: string;
  readonly propertyName: string;
};

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

const COLLECTION_SYMBOL_TO_NAME = {
  "[]": "list",
  "{}": "dictionary",
  "<>": "set",
};

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
    schema.ctor = arg;
    return schema;
  }

  // ---- THIS IF BLOCK HAS NOT YET BEEN REWRITTEN ----
  // TODO: Determine if we still want to support this
  if (Array.isArray(arg.properties)) {
    if (flags.ALLOW_VALUES_ARRAYS) {
      return normalizeObjectSchema({
        ...arg,
        // Build the PropertiesTypes object
        properties: Object.fromEntries(arg.properties.map(({ name, ...rest }) => [name, rest])),
      });
    }
    throw new Error("Array of properties are no longer supported. Use an object instead.");
  }
  // --------------------------------------------------

  return {
    name: arg.name,
    primaryKey: arg.primaryKey,
    asymmetric: !!arg.asymmetric,
    embedded: !!arg.embedded,
    properties: normalizePropertySchemas(arg.name, arg.properties, arg.primaryKey),
  };
}

function normalizePropertySchemas(
  objectName: string,
  schemas: PropertiesTypes,
  primaryKey?: string,
): Record<string, CanonicalObjectSchemaProperty> {
  const normalizedSchemas: Record<string, CanonicalObjectSchemaProperty> = {};
  for (const propertyName in schemas) {
    normalizedSchemas[propertyName] = normalizePropertySchema(
      { objectName, propertyName },
      schemas[propertyName],
      primaryKey === propertyName,
    );
  }

  return normalizedSchemas;
}

export function normalizePropertySchema(
  name: ObjectAndPropertyName,
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

function normalizePropertySchemaString(name: ObjectAndPropertyName, schema: string): CanonicalObjectSchemaProperty {
  ensure(schema.length > 0, name, "The type must be specified.");

  let type = "";
  let objectType: string | undefined;
  let optional = false;

  if (schema.endsWith("[]") || schema.endsWith("{}") || schema.endsWith("<>")) {
    const end = schema.substring(schema.length - 2) as "[]" | "{}" | "<>";
    type = COLLECTION_SYMBOL_TO_NAME[end];

    schema = schema.substring(0, schema.length - 2);
    ensure(schema.length > 0, name, `The element type must be specified. See example: 'int${end}'`);
  }

  if (schema.endsWith("?")) {
    optional = true;
    schema = schema.substring(0, schema.length - 1);
    ensure(schema.length > 0, name, "The type must be specified. See examples: 'int?', 'int?[]'");
  }

  if (isPrimitive(schema)) {
    if (isCollection(type)) {
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
    if (!isCollection(type)) {
      type = "object";
    }
  }

  if (optionalIsImplicitlyTrue(type, objectType)) {
    optional = true;
  } else if (optionalIsImplicitlyFalse(type, objectType)) {
    ensure(
      !optional,
      name,
      "'optional' is implicitly 'false' for user-defined types in lists and sets and cannot be set to 'true'. Remove '?' or change the type.",
    );
    optional = false;
  }

  return {
    name: name.propertyName,
    type: type as PropertyTypeName,
    optional,
    indexed: false,
    mapTo: name.propertyName,
    objectType,
  };
}

function normalizePropertySchemaObject(name: ObjectAndPropertyName, schema: ObjectSchemaProperty): CanonicalObjectSchemaProperty {
  sanitizePropertySchemaObject(name, schema);

  const { type, objectType, property } = schema;
  let { optional } = schema;

  ensure(type.length > 0, name, "'type' must be specified.");
  ensure(!isUsingShorthand(type), name, errMessageIfUsingShorthand(type));
  ensure(!isUsingShorthand(objectType), name, errMessageIfUsingShorthand(objectType));

  if (isPrimitive(type)) {
    ensure(objectType === undefined, name, `'objectType' cannot be defined when 'type' is '${type}'.`);
  } else if (isCollection(type)) {
    ensure(isPrimitive(objectType) || isUserDefined(objectType), name, "A valid 'objectType' must be specified.");
  } else if (type === "object") {
    ensure(isUserDefined(objectType), name, "A user-defined type must be specified through 'objectType'.");
  } else if (type === "linkingObjects") {
    ensure(isUserDefined(objectType), name, "A user-defined type must be specified through 'objectType'.");
    ensure(!!property, name, "The name of the property the object links to must be specified through 'property'.");
  } else {
    // 'type' is a user-defined type
    error(
      name,
      `If you meant to define a relationship, use { type: 'object', objectType: '${type}' } or { type: 'linkingObjects', objectType: '${type}', property: 'The ${type} property' }`,
    );
  }

  if (optionalIsImplicitlyTrue(type, objectType)) {
    const displayed =
      type === "mixed" || objectType === "mixed"
        ? "'mixed' types"
        : "user-defined types as single objects and in dictionaries";
    ensure(optional !== false, name, `'optional' is implicitly 'true' for ${displayed} and cannot be set to 'false'.`);
    optional = true;
  } else if (optionalIsImplicitlyFalse(type, objectType)) {
    const displayed = type === "linkingObjects" ? "linking objects" : "user-defined types in lists and sets";
    ensure(optional !== true, name, `'optional' is implicitly 'false' for ${displayed} and cannot be set to 'true'.`);
    optional = false;
  }

  return {
    name: name.propertyName,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!schema.indexed,
    mapTo: schema.mapTo || name.propertyName,
    objectType,
    property,
    default: schema.default,
  };
}

function optionalIsImplicitlyTrue(type: string, objectType: string | undefined): boolean {
  return (
    type === "mixed" ||
    objectType === "mixed" ||
    type === "object" ||
    (type === "dictionary" && isUserDefined(objectType))
  );
}

function optionalIsImplicitlyFalse(type: string, objectType: string | undefined): boolean {
  return (type === "list" || type === "set" || type === "linkingObjects") && isUserDefined(objectType);
}

function isUsingShorthand(input: string | undefined): boolean {
  if (!input) {
    return false;
  }
  return input.endsWith("[]") || input.endsWith("{}") || input.endsWith("<>") || input.endsWith("?");
}

function errMessageIfUsingShorthand(input: string | undefined): string {
  let shorthands = "";

  if (input?.endsWith("[]") || input?.endsWith("{}") || input?.endsWith("<>")) {
    shorthands += `'${input.substring(input.length - 2)}'`;
    input = input.substring(0, input.length - 2);
  }

  if (input?.endsWith("?")) {
    shorthands += shorthands ? " and '?'" : "'?'";
  }

  return shorthands ? `Cannot use shorthand notation ${shorthands} in combination with using an object.` : "";
}

export function sanitizePropertySchemaObject(name: ObjectAndPropertyName, input: unknown): void {
  const displayedName = `${name.objectName}.${name.propertyName}`;

  assert.object(input, displayedName); // NOTE: assert.object allows arrays
  if (Array.isArray(input)) {
    throw new TypeAssertionError("an object", input, displayedName);
  }
  assert.string(input.type, `${displayedName}.type`);
  if (input.objectType !== undefined) {
    assert.string(input.objectType, `${displayedName}.objectType`);
  }
  if (input.optional !== undefined) {
    assert.boolean(input.optional, `${displayedName}.optional`);
  }
  if (input.property !== undefined) {
    assert.string(input.property, `${displayedName}.property`);
  }
  if (input.indexed !== undefined) {
    assert.boolean(input.indexed, `${displayedName}.indexed`);
  }
  if (input.mapTo !== undefined) {
    assert.string(input.mapTo, `${displayedName}.mapTo`);
  }

  const validProperties = new Set([
    "name", // From the canonical type (needed for schema-transform tests)
    "type",
    "objectType",
    "property",
    "default",
    "optional",
    "indexed",
    "mapTo",
  ]);
  const invalidPropertiesUsed: string[] = [];
  for (const property in input) {
    if (!validProperties.has(property)) {
      invalidPropertiesUsed.push(property);
    }
  }
  assert(
    !invalidPropertiesUsed.length,
    `Unexpected field(s) found on the schema for property '${name.objectName}.${name.propertyName}': ` +
      `'${invalidPropertiesUsed.join("', '")}'.`,
  );
}

function ensure(condition: boolean, name: ObjectAndPropertyName, errMessage: string): void | never {
  if (!condition) {
    error(name, errMessage);
  }
}

function error(name: ObjectAndPropertyName, message: string): never {
  // TODO: Create a SchemaParseError that extends Error?
  throw new Error(`Invalid schema for property '${name.objectName}.${name.propertyName}': ${message}`);
}

export function extractGeneric(type: string): { typeBase: string; typeArgument?: string } {
  const bracketStart = type.indexOf("<");
  const bracketEnd = type.indexOf(">", bracketStart);
  if (bracketStart === -1) {
    return { typeBase: type };
  }
  return { typeBase: type.substring(0, bracketStart), typeArgument: type.substring(bracketStart + 1, bracketEnd) };
}
