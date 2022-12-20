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
 * Transform a validated user-provided Realm schema into its canonical form.
 */
export function normalizeRealmSchema(
  realmSchema: Readonly<(RealmObjectConstructor | ObjectSchema)[]>,
): CanonicalObjectSchema[] {
  return realmSchema.map(normalizeObjectSchema);
}

/**
 * Transform a validated user-provided object schema into its canonical form.
 */
export function normalizeObjectSchema(arg: RealmObjectConstructor | ObjectSchema): CanonicalObjectSchema {
  if (typeof arg === "function") {
    const objectSchema = normalizeObjectSchema(arg.schema);
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

  const { name, primaryKey, asymmetric, embedded, properties } = arg;
  assert(name.length > 0, "Invalid schema for unnamed object: 'name' must be specified.");
  const primaryKeyFieldIsMissing = primaryKey && !Object.hasOwn(properties, primaryKey);
  assert(
    !primaryKeyFieldIsMissing,
    `Invalid schema for object '${name}': '${primaryKey}' is set as the primary key field but was not found in 'properties'.`,
  );
  assert(!asymmetric || !embedded, `Invalid schema for object '${name}': Cannot be both asymmetric and embedded.`);

  return {
    name,
    primaryKey,
    asymmetric: !!asymmetric,
    embedded: !!embedded,
    properties: normalizePropertySchemas(name, properties, primaryKey),
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
 * Transform a validated user-provided property schema that is using
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
 * Transform a validated user-provided property schema that is using
 * the relaxed object notation into its canonical form.
 */
function normalizePropertySchemaObject(info: PropertyInfoUsingObject): CanonicalObjectSchemaProperty {
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
