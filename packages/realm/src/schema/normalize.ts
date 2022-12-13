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

const COLLECTION_SHORTHAND_TO_NAME: Readonly<Record<string, string>> = {
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
  return !!type && !(isPrimitive(type) || isCollection(type) || type === "object" || type === "linkingObjects");
}

/**
 * Transform a user-provided Realm schema into its canonical form.
 */
export function normalizeRealmSchema(
  schema: Readonly<(RealmObjectConstructor | ObjectSchema)[]>,
): CanonicalObjectSchema[] {
  return schema.map(normalizeObjectSchema);
}

/**
 * Transform a user-provided object schema into its canonical form.
 */
export function normalizeObjectSchema(arg: RealmObjectConstructor | ObjectSchema): CanonicalObjectSchema {
  if (typeof arg === "function") {
    assert.extends(arg, RealmObject);
    assert.object(arg.schema, "schema static");
    const schema = normalizeObjectSchema(arg.schema as ObjectSchema);
    schema.ctor = arg;
    return schema;
  }

  // ---- THIS IF BLOCK HAS NOT YET BEEN REWRITTEN ----
  // TODO: Determine if we still want to support this (should show warning to users of future deprecation)
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

/**
 * Transform user-provided property schemas into their canonical forms.
 */
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

/**
 * Transform a user-provided property schema into its canonical form.
 */
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
    assert(!normalizedSchema.optional, errMessage(name, "Optional properties cannot be used as a primary key."));
    normalizedSchema.indexed = true;
  }

  return normalizedSchema;
}

/**
 * Transform and validate a user-provided property schema that is using
 * the shorthand string notation into its canonical form.
 */
function normalizePropertySchemaString(name: ObjectAndPropertyName, schema: string): CanonicalObjectSchemaProperty {
  assert(schema.length > 0, errMessage(name, "The type must be specified."));

  let type = "";
  let objectType: string | undefined;
  let optional = false;

  if (endsWithCollection(schema)) {
    const end = schema.substring(schema.length - 2);
    type = COLLECTION_SHORTHAND_TO_NAME[end];

    schema = schema.substring(0, schema.length - 2);
    assert(schema.length > 0, errMessage(name, `The element type must be specified. See example: 'int${end}'`));

    const isNestedCollection = endsWithCollection(schema);
    assert(!isNestedCollection, errMessage(name, "Nested collections are not supported."));
  }

  if (schema.endsWith("?")) {
    optional = true;

    schema = schema.substring(0, schema.length - 1);
    assert(schema.length > 0, errMessage(name, "The type must be specified. See examples: 'int?', 'int?[]'"));

    const usingOptionalOnCollection = endsWithCollection(schema);
    assert(
      !usingOptionalOnCollection,
      errMessage(
        name,
        "Collections cannot be optional. To allow elements of the collection to be optional, use '?' after the element type. See examples: 'int?[]', 'int?{}', 'int?<>'.",
      ),
    );
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
    assert(
      !optional,
      errMessage(
        name,
        "'optional' is implicitly 'false' for user-defined types in lists and sets and cannot be set to 'true'. Remove '?' or change the type.",
      ),
    );
    optional = false;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: name.propertyName,
    type: type as PropertyTypeName,
    optional,
    indexed: false,
    mapTo: name.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  objectType !== undefined && (normalizedSchema.objectType = objectType);

  return normalizedSchema;
}

/**
 * Transform and validate a user-provided property schema that is using
 * the relaxed object notation into its canonical form.
 */
function normalizePropertySchemaObject(
  name: ObjectAndPropertyName,
  schema: ObjectSchemaProperty,
): CanonicalObjectSchemaProperty {
  sanitizePropertySchemaObject(name, schema);

  const { type, objectType, property, default: defaultValue } = schema;
  let { optional } = schema;

  assert(type.length > 0, errMessage(name, "'type' must be specified."));
  assert(!isUsingShorthand(type), errMessageIfUsingShorthand(name, type));
  assert(!isUsingShorthand(objectType), errMessageIfUsingShorthand(name, objectType));

  if (isPrimitive(type)) {
    assert(objectType === undefined, errMessage(name, `'objectType' cannot be defined when 'type' is '${type}'.`));
  } else if (isCollection(type)) {
    assert(isPrimitive(objectType) || isUserDefined(objectType), errMessage(name, "A valid 'objectType' must be specified."));
  } else if (type === "object") {
    assert(isUserDefined(objectType), errMessage(name, "A user-defined type must be specified through 'objectType'."));
  } else if (type === "linkingObjects") {
    assert(isUserDefined(objectType), errMessage(name, "A user-defined type must be specified through 'objectType'."));
    assert(!!property, errMessage(name, "The name of the property the object links to must be specified through 'property'."));
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
    assert(optional !== false, errMessage(name, `'optional' is implicitly 'true' for ${displayed} and cannot be set to 'false'.`));
    optional = true;
  } else if (optionalIsImplicitlyFalse(type, objectType)) {
    const displayed = type === "linkingObjects" ? "linking objects" : "user-defined types in lists and sets";
    assert(optional !== true, errMessage(name, `'optional' is implicitly 'false' for ${displayed} and cannot be set to 'true'.`));
    optional = false;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: name.propertyName,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!schema.indexed,
    mapTo: schema.mapTo || name.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  objectType !== undefined && (normalizedSchema.objectType = objectType);
  property !== undefined && (normalizedSchema.property = property);
  defaultValue !== undefined && (normalizedSchema.default = defaultValue);

  return normalizedSchema;
}

/**
 * Sanitize a user-provided property schema that ought to use the relaxed
 * object notation by validating the data types.
 */
export function sanitizePropertySchemaObject(
  name: ObjectAndPropertyName,
  schema: unknown,
): asserts schema is ObjectSchemaProperty {
  const displayedName = `${name.objectName}.${name.propertyName}`;

  assert.object(schema, displayedName); // NOTE: assert.object allows arrays
  if (Array.isArray(schema)) {
    throw new TypeAssertionError("an object", schema, displayedName);
  }
  assert.string(schema.type, `${displayedName}.type`);
  if (schema.objectType !== undefined) {
    assert.string(schema.objectType, `${displayedName}.objectType`);
  }
  if (schema.optional !== undefined) {
    assert.boolean(schema.optional, `${displayedName}.optional`);
  }
  if (schema.property !== undefined) {
    assert.string(schema.property, `${displayedName}.property`);
  }
  if (schema.indexed !== undefined) {
    assert.boolean(schema.indexed, `${displayedName}.indexed`);
  }
  if (schema.mapTo !== undefined) {
    assert.string(schema.mapTo, `${displayedName}.mapTo`);
  }
  const invalidKeysUsed = getInvalidPropertySchemaKeys(schema);
  assert(
    !invalidKeysUsed.length,
    `Unexpected field(s) found on the schema for property '${displayedName}': '${invalidKeysUsed.join("', '")}'.`,
  );
}

/**
 * Get the keys of the user-provided property schema that are not expected
 * to exist on the schema.
 */
function getInvalidPropertySchemaKeys(schema: Record<string, unknown>): string[] {
  // Need to check keys of the canonical form rather than the relaxed
  // due to 'name' also being needed for schema-transform tests.
  const allowedKeys = new Set<keyof CanonicalObjectSchemaProperty>([
    "name",
    "type",
    "objectType",
    "property",
    "default",
    "optional",
    "indexed",
    "mapTo",
  ]);
  const invalidKeysUsed: string[] = [];
  for (const key in schema) {
    if (!allowedKeys.has(key as keyof CanonicalObjectSchemaProperty)) {
      invalidKeysUsed.push(key);
    }
  }

  return invalidKeysUsed;
}

/**
 * Determine whether a property always is implicitly optional (nullable).
 */
function optionalIsImplicitlyTrue(type: string, objectType: string | undefined): boolean {
  return (
    type === "mixed" ||
    objectType === "mixed" ||
    type === "object" ||
    (type === "dictionary" && isUserDefined(objectType))
  );
}

/**
 * Determine whether a property always is implicitly non-optional (non-nullable).
 */
function optionalIsImplicitlyFalse(type: string, objectType: string | undefined): boolean {
  return (type === "list" || type === "set" || type === "linkingObjects") && isUserDefined(objectType);
}

/**
 * Determine whether a string ends with a shorthand collection ('[]' or '{}' or '<>').
 */
function endsWithCollection(input: string): boolean {
  const end = input.substring(input.length - 2);
  return !!COLLECTION_SHORTHAND_TO_NAME[end];
}

/**
 * Determine whether shorthand notation is being used.
 */
function isUsingShorthand(input: string | undefined): boolean {
  if (!input) {
    return false;
  }
  return endsWithCollection(input) || input.endsWith("?");
}

/**
 * Get a custom error message with the shorthands if used.
 */
function errMessageIfUsingShorthand(name: ObjectAndPropertyName, input: string | undefined): string {
  const shorthands: string[] = [];

  if (input && endsWithCollection(input)) {
    shorthands.push(input.substring(input.length - 2));
    input = input.substring(0, input.length - 2);
  }

  if (input?.endsWith("?")) {
    shorthands.push("?");
  }

  return shorthands.length
    ? errMessage(name, `Cannot use shorthand '${shorthands.join("' and '")}' in combination with using an object.`)
    : "";
}

/**
 * Get an error message for an invalid property schema.
 */
function errMessage(name: ObjectAndPropertyName, message: string): string {
  return `Invalid schema for property '${name.objectName}.${name.propertyName}': ${message}`;
}

/**
 * Throw an error caused by an invalid property schema.
 */
function error(name: ObjectAndPropertyName, message: string): never {
  // TODO: Create a SchemaParseError that extends Error?
  throw new Error(errMessage(name, message));
}

/**
 * Extract the base type and the type argument from a generic string notation.
 */
export function extractGeneric(type: string): { typeBase: string; typeArgument?: string } {
  const bracketStart = type.indexOf("<");
  const bracketEnd = type.indexOf(">", bracketStart);
  if (bracketStart === -1) {
    return { typeBase: type };
  }
  return { typeBase: type.substring(0, bracketStart), typeArgument: type.substring(bracketStart + 1, bracketEnd) };
}
