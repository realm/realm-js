////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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
  CanonicalPropertySchema,
  Configuration,
  DefaultObject,
  ObjectSchema,
  PropertySchema,
  RealmObject,
  RealmObjectConstructor,
  assert,
} from "../internal";

// Need to use `CanonicalObjectSchema` rather than `ObjectSchema` due to some
// integration tests using `openRealmHook()`. That function sets `this.realm`
// to the opened realm whose schema is a `CanonicalObjectSchema[]`. Consequently,
// the key `"ctor"` (which doesn't exist on `ObjectSchema`) also needs to be allowed.
const OBJECT_SCHEMA_KEYS = new Set<keyof CanonicalObjectSchema>([
  "name",
  "primaryKey",
  "embedded",
  "asymmetric",
  "properties",
  // Not part of `ObjectSchema`
  "ctor",
]);

// Need to use `CanonicalPropertySchema` rather than `PropertySchema`
// due to the same reasons as above.
const PROPERTY_SCHEMA_KEYS = new Set<keyof CanonicalPropertySchema>([
  "type",
  "objectType",
  "property",
  "default",
  "optional",
  "indexed",
  "mapTo",
  // Not part of `PropertySchema`
  "name",
]);

/**
 * Validate the data types of the fields of a user-provided realm schema.
 */
export function validateRealmSchema(realmSchema: unknown): asserts realmSchema is Configuration["schema"][] {
  assert.array(realmSchema, "realm schema");
  for (const objectSchema of realmSchema) {
    validateObjectSchema(objectSchema);
  }
  // TODO: Assert that backlinks point to object schemas that are actually declared
}

/**
 * Validate the data types of the fields of a user-provided object schema.
 */
export function validateObjectSchema(
  objectSchema: unknown,
): asserts objectSchema is RealmObjectConstructor | ObjectSchema {
  // Schema is passed via a class based model (RealmObjectConstructor)
  if (typeof objectSchema === "function") {
    const clazz = objectSchema as unknown as DefaultObject;
    // We assert this later, but want a custom error message
    if (!(objectSchema.prototype instanceof RealmObject)) {
      const schemaName = clazz.schema && (clazz.schema as DefaultObject).name;
      if (typeof schemaName === "string" && schemaName !== objectSchema.name) {
        throw new TypeError(`Class '${objectSchema.name}' (declaring '${schemaName}' schema) must extend Realm.Object`);
      } else {
        throw new TypeError(`Class '${objectSchema.name}' must extend Realm.Object`);
      }
    }
    assert.object(clazz.schema, "schema static");
    validateObjectSchema(clazz.schema);
  }
  // Schema is passed as an object (ObjectSchema)
  else {
    assert.object(objectSchema, "object schema", { allowArrays: false });
    const { name: objectName, properties, primaryKey, asymmetric, embedded } = objectSchema;
    assert.string(objectName, "'name' on object schema");
    assert.object(properties, `'properties' on '${objectName}'`, { allowArrays: false });
    if (primaryKey !== undefined) {
      assert.string(primaryKey, `'primaryKey' on '${objectName}'`);
    }
    if (embedded !== undefined) {
      assert.boolean(embedded, `'embedded' on '${objectName}'`);
    }
    if (asymmetric !== undefined) {
      assert.boolean(asymmetric, `'asymmetric' on '${objectName}'`);
    }

    const invalidKeysUsed = filterInvalidKeys(objectSchema, OBJECT_SCHEMA_KEYS);
    assert(
      !invalidKeysUsed.length,
      `Unexpected field(s) found on the schema for object '${objectName}': '${invalidKeysUsed.join("', '")}'.`,
    );

    for (const propertyName in properties) {
      const propertySchema = properties[propertyName];
      const isUsingShorthand = typeof propertySchema === "string";
      if (!isUsingShorthand) {
        validatePropertySchema(objectName, propertyName, propertySchema);
      }
    }
  }
}

/**
 * Validate the data types of a user-provided property schema that ought to use the
 * relaxed object notation.
 */
export function validatePropertySchema(
  objectName: string,
  propertyName: string,
  propertySchema: unknown,
): asserts propertySchema is PropertySchema {
  assert.object(propertySchema, `'${propertyName}' on '${objectName}'`, { allowArrays: false });
  const { type, objectType, optional, property, indexed, mapTo } = propertySchema;
  assert.string(type, `'${propertyName}.type' on '${objectName}'`);
  if (objectType !== undefined) {
    assert.string(objectType, `'${propertyName}.objectType' on '${objectName}'`);
  }
  if (optional !== undefined) {
    assert.boolean(optional, `'${propertyName}.optional' on '${objectName}'`);
  }
  if (property !== undefined) {
    assert.string(property, `'${propertyName}.property' on '${objectName}'`);
  }
  if (indexed !== undefined) {
    assert.boolean(indexed, `'${propertyName}.indexed' on '${objectName}'`);
  }
  if (mapTo !== undefined) {
    assert.string(mapTo, `'${propertyName}.mapTo' on '${objectName}'`);
  }
  const invalidKeysUsed = filterInvalidKeys(propertySchema, PROPERTY_SCHEMA_KEYS);
  assert(
    !invalidKeysUsed.length,
    `Unexpected field(s) found on the schema for property '${propertyName}' on '${objectName}': '${invalidKeysUsed.join(
      "', '",
    )}'.`,
  );
}

/**
 * Get the keys of an object that are not part of the provided valid keys.
 */
function filterInvalidKeys(object: Record<string, unknown>, validKeys: Set<string>): string[] {
  return Object.keys(object).filter((key) => !validKeys.has(key));
}
