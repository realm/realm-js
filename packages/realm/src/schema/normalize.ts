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
  assert,
  flags,
} from "../internal";

type PropertyInfo = {
  readonly objectName: string;
  readonly propertyName: string;
  readonly propertySchema: string | ObjectSchemaProperty; // TODO: Type will change to: PropertySchema | PropertySchemaShorthand
};

interface PropertyInfoUsingObject extends PropertyInfo {
  readonly propertySchema: ObjectSchemaProperty;
}

interface PropertyInfoUsingShorthand extends PropertyInfo {
  readonly propertySchema: string;
}

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
  realmSchema: Readonly<(RealmObjectConstructor | ObjectSchema)[]>,
): CanonicalObjectSchema[] {
  return realmSchema.map(normalizeObjectSchema);
}

/**
 * Transform a user-provided object schema into its canonical form.
 */
export function normalizeObjectSchema(arg: RealmObjectConstructor | ObjectSchema): CanonicalObjectSchema {
  if (typeof arg === "function") {
    assert.extends(arg, RealmObject);
    assert.object(arg.schema, "schema static");
    const objectSchema = normalizeObjectSchema(arg.schema as ObjectSchema);
    objectSchema.ctor = arg;
    return objectSchema;
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

  sanitizeObjectSchema(arg);

  const primaryKeyFieldIsMissing = arg.primaryKey && !Object.hasOwn(arg.properties, arg.primaryKey);
  if (primaryKeyFieldIsMissing) {
    throw new Error(
      `Invalid schema for object '${arg.name}': '${arg.primaryKey}' is set as the primary key field but was not found in 'properties'.`,
    );
  }

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
  propertiesSchemas: PropertiesTypes,
  primaryKey?: string,
): Record<string, CanonicalObjectSchemaProperty> {
  const normalizedSchemas: Record<string, CanonicalObjectSchemaProperty> = {};
  for (const propertyName in propertiesSchemas) {
    normalizedSchemas[propertyName] = normalizePropertySchema(
      { objectName, propertyName, propertySchema: propertiesSchemas[propertyName] },
      primaryKey === propertyName,
    );
  }

  return normalizedSchemas;
}

/**
 * Transform a user-provided property schema into its canonical form.
 */
export function normalizePropertySchema(info: PropertyInfo, isPrimaryKey = false): CanonicalObjectSchemaProperty {
  const normalizedSchema =
    typeof info.propertySchema === "string"
      ? normalizePropertySchemaShorthand(info as PropertyInfoUsingShorthand)
      : normalizePropertySchemaObject(info as PropertyInfoUsingObject);

  if (isPrimaryKey) {
    assert(!normalizedSchema.optional, errMessage(info, "Optional properties cannot be used as a primary key."));
    normalizedSchema.indexed = true;
  }

  return normalizedSchema;
}

/**
 * Transform and validate a user-provided property schema that is using
 * the shorthand string notation into its canonical form.
 */
function normalizePropertySchemaShorthand(info: PropertyInfoUsingShorthand): CanonicalObjectSchemaProperty {
  let { propertySchema } = info;
  assert(propertySchema.length > 0, errMessage(info, "The type must be specified."));

  let type = "";
  let objectType: string | undefined;
  let optional = false;

  if (endsWithCollection(propertySchema)) {
    const end = propertySchema.substring(propertySchema.length - 2);
    type = COLLECTION_SHORTHAND_TO_NAME[end];

    propertySchema = propertySchema.substring(0, propertySchema.length - 2);
    assert(propertySchema.length > 0, errMessage(info, `The element type must be specified. (Example: 'int${end}')`));

    const isNestedCollection = endsWithCollection(propertySchema);
    assert(!isNestedCollection, errMessage(info, "Nested collections are not supported."));
  }

  if (propertySchema.endsWith("?")) {
    optional = true;

    propertySchema = propertySchema.substring(0, propertySchema.length - 1);
    assert(propertySchema.length > 0, errMessage(info, "The type must be specified. (Examples: 'int?', 'int?[]')"));

    const usingOptionalOnCollection = endsWithCollection(propertySchema);
    assert(
      !usingOptionalOnCollection,
      errMessage(
        info,
        "Collections cannot be optional. To allow elements of the collection to be optional, use '?' after the element type. (Examples: 'int?[]', 'int?{}', 'int?<>')",
      ),
    );
  }

  if (isPrimitive(propertySchema)) {
    if (isCollection(type)) {
      objectType = propertySchema;
    } else {
      type = propertySchema as PropertyTypeName;
    }
  } else if (isCollection(propertySchema)) {
    error(info, "Cannot use the collection name. (Examples: 'int[]' (list), 'int{}' (dictionary), 'int<>' (set))");
  } else if (propertySchema === "object") {
    error(info, "To define a relationship, use either 'ObjectName' or { type: 'object', objectType: 'ObjectName' }");
  } else if (propertySchema === "linkingObjects") {
    error(
      info,
      "To define an inverse relationship, use { type: 'linkingObjects', objectType: 'ObjectName', property: 'ObjectProperty' }",
    );
  } else {
    // User-defined types
    objectType = propertySchema;
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
        info,
        "Being optional is always 'false' for user-defined types in lists and sets and cannot be set to 'true'. Remove '?' or change the type.",
      ),
    );
    optional = false;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: info.propertyName,
    type: type as PropertyTypeName,
    optional,
    indexed: false,
    mapTo: info.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  objectType !== undefined && (normalizedSchema.objectType = objectType);

  return normalizedSchema;
}

/**
 * Transform and validate a user-provided property schema that is using
 * the relaxed object notation into its canonical form.
 */
function normalizePropertySchemaObject(info: PropertyInfoUsingObject): CanonicalObjectSchemaProperty {
  sanitizePropertySchema(info.objectName, info.propertyName, info.propertySchema);

  const { propertySchema } = info;
  const { type, objectType, property, default: defaultValue } = propertySchema;
  let { optional } = propertySchema;

  assert(type.length > 0, errMessage(info, "'type' must be specified."));
  assert(!isUsingShorthand(type), errMessageIfUsingShorthand(info, type));
  assert(!isUsingShorthand(objectType), errMessageIfUsingShorthand(info, objectType));

  if (isPrimitive(type)) {
    assert(objectType === undefined, errMessage(info, `'objectType' cannot be defined when 'type' is '${type}'.`));
  } else if (isCollection(type)) {
    assert(
      isPrimitive(objectType) || isUserDefined(objectType),
      errMessage(info, `A ${type} must contain only primitive or user-defined types specified through 'objectType'.`),
    );
  } else if (type === "object") {
    assert(isUserDefined(objectType), errMessage(info, "A user-defined type must be specified through 'objectType'."));
  } else if (type === "linkingObjects") {
    assert(isUserDefined(objectType), errMessage(info, "A user-defined type must be specified through 'objectType'."));
    assert(!!property, errMessage(info, "The linking object's property name must be specified through 'property'."));
  } else {
    // 'type' is a user-defined type
    error(
      info,
      `If you meant to define a relationship, use { type: 'object', objectType: '${type}' } or { type: 'linkingObjects', objectType: '${type}', property: 'The ${type} property' }`,
    );
  }

  if (optionalIsImplicitlyTrue(type, objectType)) {
    const displayed =
      type === "mixed" || objectType === "mixed"
        ? "'mixed' types"
        : "user-defined types as standalone objects and in dictionaries";
    assert(optional !== false, errMessage(info, `'optional' is always 'true' for ${displayed} and cannot be set to 'false'.`));
    optional = true;
  } else if (optionalIsImplicitlyFalse(type, objectType)) {
    const displayed = type === "linkingObjects" ? "linking objects" : "user-defined types in lists and sets";
    assert(optional !== true, errMessage(info, `'optional' is always 'false' for ${displayed} and cannot be set to 'true'.`));
    optional = false;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: info.propertyName,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!propertySchema.indexed,
    mapTo: propertySchema.mapTo || info.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  objectType !== undefined && (normalizedSchema.objectType = objectType);
  property !== undefined && (normalizedSchema.property = property);
  defaultValue !== undefined && (normalizedSchema.default = defaultValue);

  return normalizedSchema;
}

/**
 * Sanitize the top-level fields of a user-provided object schema by
 * validating the data types.
 */
export function sanitizeObjectSchema(objectSchema: unknown): asserts objectSchema is ObjectSchema {
  assert.object(objectSchema, "the object schema", false);
  assert.string(objectSchema.name, "the object schema name");
  assert.object(objectSchema.properties, `${objectSchema.name}.properties`, false);
  if (objectSchema.primaryKey !== undefined) {
    assert.string(objectSchema.primaryKey, `${objectSchema.name}.primaryKey`);
  }
  if (objectSchema.embedded !== undefined) {
    assert.boolean(objectSchema.embedded, `${objectSchema.name}.embedded`);
  }
  if (objectSchema.asymmetric !== undefined) {
    assert.boolean(objectSchema.asymmetric, `${objectSchema.name}.asymmetric`);
  }
  const validKeys = new Set<keyof ObjectSchema>(["name", "primaryKey", "embedded", "asymmetric", "properties"]);
  const invalidKeysUsed = filterInvalidKeys(objectSchema, validKeys);
  assert(
    !invalidKeysUsed.length,
    `Unexpected field(s) found on the schema for object '${objectSchema.name}': '${invalidKeysUsed.join("', '")}'.`,
  );
}

/**
 * Sanitize a user-provided property schema that ought to use the relaxed
 * object notation by validating the data types.
 */
export function sanitizePropertySchema(
  objectName: string,
  propertyName: string,
  propertySchema: unknown,
): asserts propertySchema is ObjectSchemaProperty {
  const displayedName = `${objectName}.${propertyName}`;
  assert.object(propertySchema, displayedName, false);
  assert.string(propertySchema.type, `${displayedName}.type`);
  if (propertySchema.objectType !== undefined) {
    assert.string(propertySchema.objectType, `${displayedName}.objectType`);
  }
  if (propertySchema.optional !== undefined) {
    assert.boolean(propertySchema.optional, `${displayedName}.optional`);
  }
  if (propertySchema.property !== undefined) {
    assert.string(propertySchema.property, `${displayedName}.property`);
  }
  if (propertySchema.indexed !== undefined) {
    assert.boolean(propertySchema.indexed, `${displayedName}.indexed`);
  }
  if (propertySchema.mapTo !== undefined) {
    assert.string(propertySchema.mapTo, `${displayedName}.mapTo`);
  }
  // Need to check keys of the canonical form rather than the relaxed
  // due to 'name' also being needed for schema-transform tests.
  const validKeys = new Set<keyof CanonicalObjectSchemaProperty>([
    "name",
    "type",
    "objectType",
    "property",
    "default",
    "optional",
    "indexed",
    "mapTo",
  ]);
  const invalidKeysUsed = filterInvalidKeys(propertySchema, validKeys);
  assert(
    !invalidKeysUsed.length,
    `Unexpected field(s) found on the schema for property '${displayedName}': '${invalidKeysUsed.join("', '")}'.`,
  );
}

/**
 * Get the keys of an object that are not part of the provided valid keys.
 */
function filterInvalidKeys(object: Record<string, unknown>, validKeys: Set<string>): string[] {
  return Object.keys(object).filter((key) => !validKeys.has(key));
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
 * Get a custom error message containing the shorthands if used.
 */
function errMessageIfUsingShorthand(info: PropertyInfo, input: string | undefined): string {
  const shorthands: string[] = [];

  if (input && endsWithCollection(input)) {
    shorthands.push(input.substring(input.length - 2));
    input = input.substring(0, input.length - 2);
  }

  if (input?.endsWith("?")) {
    shorthands.push("?");
  }

  return shorthands.length
    ? errMessage(info, `Cannot use shorthand '${shorthands.join("' and '")}' in combination with using an object.`)
    : "";
}

/**
 * Get an error message for an invalid property schema.
 */
function errMessage({ objectName, propertyName }: PropertyInfo, message: string): string {
  return `Invalid type declaration for property '${objectName}.${propertyName}': ${message}`;
}

/**
 * Throw an error caused by an invalid property schema.
 */
function error(info: PropertyInfo, message: string): never {
  // TODO: Create a SchemaParseError that extends Error?
  throw new Error(errMessage(info, message));
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
