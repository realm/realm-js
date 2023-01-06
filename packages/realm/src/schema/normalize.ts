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
  PrimitivePropertyTypeName,
  PropertiesTypes,
  PropertySchema,
  PropertySchemaShorthand,
  PropertyTypeName,
  RealmObjectConstructor,
  UserTypeName,
  assert,
  flags,
} from "../internal";

type PropertyInfo = {
  readonly objectName: string;
  readonly propertyName: string;
  readonly propertySchema: PropertySchema | PropertySchemaShorthand;
  readonly isPrimaryKey?: boolean;
};

interface PropertyInfoUsingObject extends PropertyInfo {
  readonly propertySchema: PropertySchema;
}

interface PropertyInfoUsingShorthand extends PropertyInfo {
  readonly propertySchema: PropertySchemaShorthand;
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

function isPrimitive(type: string | undefined): type is PrimitivePropertyTypeName {
  return PRIMITIVE_TYPES.has(type as PrimitivePropertyTypeName);
}

function isCollection(type: string | undefined): type is CollectionPropertyTypeName {
  return COLLECTION_TYPES.has(type as CollectionPropertyTypeName);
}

function isUserDefined(type: string | undefined): type is UserTypeName {
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
    normalizedSchemas[propertyName] = normalizePropertySchema({
      objectName,
      propertyName,
      propertySchema: propertiesSchemas[propertyName],
      isPrimaryKey: primaryKey === propertyName,
    });
  }

  return normalizedSchemas;
}

/**
 * Transform a user-provided property schema into its canonical form.
 */
export function normalizePropertySchema(info: PropertyInfo): CanonicalObjectSchemaProperty {
  const isUsingShorthand = typeof info.propertySchema === "string";
  const normalizedSchema = isUsingShorthand
    ? normalizePropertySchemaShorthand(info as PropertyInfoUsingShorthand)
    : normalizePropertySchemaObject(info as PropertyInfoUsingObject);

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
  let optional: boolean | undefined;

  if (hasCollectionSuffix(propertySchema)) {
    const suffixLength = 2;
    const suffix = propertySchema.substring(propertySchema.length - suffixLength);
    type = COLLECTION_SHORTHAND_TO_NAME[suffix];

    propertySchema = propertySchema.substring(0, propertySchema.length - 2);
    assert(propertySchema.length > 0, errMessage(info, `The element type must be specified (Example: 'int${suffix}')`));

    const isNestedCollection = hasCollectionSuffix(propertySchema);
    assert(!isNestedCollection, errMessage(info, "Nested collections are not supported."));
  }

  if (propertySchema.endsWith("?")) {
    optional = true;

    propertySchema = propertySchema.substring(0, propertySchema.length - 1);
    assert(propertySchema.length > 0, errMessage(info, "The type must be specified. (Examples: 'int?' and 'int?[]')"));

    const usingOptionalOnCollection = hasCollectionSuffix(propertySchema);
    assert(
      !usingOptionalOnCollection,
      errMessage(
        info,
        "Collections cannot be optional. To allow elements of the collection to be optional, use '?' after the element type. (Examples: 'int?[]', 'int?{}', and 'int?<>')",
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
    error(
      info,
      `Cannot use the collection name ${propertySchema}. (Examples: 'int[]' (list), 'int{}' (dictionary), and 'int<>' (set))`,
    );
  } else if (propertySchema === "object") {
    error(
      info,
      "To define a relationship, use either 'MyObjectType' or { type: 'object', objectType: 'MyObjectType' }",
    );
  } else if (propertySchema === "linkingObjects") {
    error(
      info,
      "To define an inverse relationship, use { type: 'linkingObjects', objectType: 'MyObjectType', property: 'myObjectTypesProperty' }",
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
        "User-defined types in lists and sets are always non-optional and cannot be made optional. Remove '?' or change the type.",
      ),
    );
    optional = false;
  }

  if (info.isPrimaryKey) {
    assert(!optional, errMessage(info, "Optional properties cannot be used as a primary key."));
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: info.propertyName,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!info.isPrimaryKey,
    mapTo: info.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  if (objectType !== undefined) normalizedSchema.objectType = objectType;

  return normalizedSchema;
}

/**
 * Transform a validated user-provided property schema that is using
 * the relaxed object notation into its canonical form.
 */
function normalizePropertySchemaObject(info: PropertyInfoUsingObject): CanonicalObjectSchemaProperty {
  const { propertySchema } = info;
  const { type, objectType, property, default: defaultValue } = propertySchema;
  let { optional, indexed } = propertySchema;

  assert(type.length > 0, errMessage(info, "'type' must be specified."));
  assertNotUsingShorthand(type, info);
  assertNotUsingShorthand(objectType, info);

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

  if (type !== "linkingObjects") {
    assert(property === undefined, errMessage(info, "'property' can only be specified if 'type' is 'linkingObjects'."));
  }

  if (optionalIsImplicitlyTrue(type, objectType)) {
    const displayed =
      type === "mixed" || objectType === "mixed"
        ? "'mixed' types"
        : "User-defined types as standalone objects and in dictionaries";
    assert(optional !== false, errMessage(info, `${displayed} are always optional and cannot be made non-optional.`));
    optional = true;
  } else if (optionalIsImplicitlyFalse(type, objectType)) {
    assert(
      optional !== true,
      errMessage(info, "User-defined types in lists and sets are always non-optional and cannot be made optional."),
    );
    optional = false;
  }

  if (info.isPrimaryKey) {
    assert(!optional, errMessage(info, "Optional properties cannot be used as a primary key."));
    assert(indexed !== false, errMessage(info, "Primary keys must always be indexed."));
    indexed = true;
  }

  const normalizedSchema: CanonicalObjectSchemaProperty = {
    name: info.propertyName,
    type: type as PropertyTypeName,
    optional: !!optional,
    indexed: !!indexed,
    mapTo: propertySchema.mapTo || info.propertyName,
  };
  // Add optional properties only if defined (tests expect no 'undefined' properties)
  if (objectType !== undefined) normalizedSchema.objectType = objectType;
  if (property !== undefined) normalizedSchema.property = property;
  if (defaultValue !== undefined) normalizedSchema.default = defaultValue;

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
function hasCollectionSuffix(input: string): boolean {
  const end = input.substring(input.length - 2);
  return !!COLLECTION_SHORTHAND_TO_NAME[end];
}

/**
 * Assert that shorthand notation is not being used.
 */
function assertNotUsingShorthand(input: string | undefined, info: PropertyInfo): void {
  const shorthands: string[] = [];

  if (input && hasCollectionSuffix(input)) {
    shorthands.push(input.substring(input.length - 2));
    input = input.substring(0, input.length - 2);
  }

  if (input?.endsWith("?")) {
    shorthands.push("?");
  }

  assert(
    !shorthands.length,
    errMessage(
      info,
      `Cannot use shorthand '${shorthands.join("' and '")}' in 'type' or 'objectType' when defining property objects.`,
    ),
  );
}

/**
 * Get an error message for an invalid property schema.
 */
function errMessage({ objectName, propertyName }: PropertyInfo, message: string): string {
  return `Invalid type declaration for property '${propertyName}' on '${objectName}': ${message}`;
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
