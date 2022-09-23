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
import { Configuration } from "../Configuration";
import { DefaultObject, ObjectSchema } from "../schema";
import { Object as RealmObject } from "../Object";

export function validateConfiguration(arg: unknown): asserts arg is Configuration {
  assert.object(arg);
  const { path, schema } = arg;
  if (typeof path === "string") {
    assert(path.length > 0, "Expected a non-empty path or none at all");
  }
  if (schema) {
    validateRealmSchema(schema);
  }
}

export function validateRealmSchema(schema: unknown): asserts schema is Configuration["schema"][] {
  assert.array(schema, "schema");
  schema.forEach(validateObjectSchema);
  // TODO: Assert that backlinks point to object schemas that are actually declared
}

export function validateObjectSchema(arg: unknown): asserts arg is ObjectSchema {
  if (typeof arg === "function") {
    // Class based model
    const clazz = arg as unknown as DefaultObject;
    // We assert this later, but want a custom error message
    if (!(arg.prototype instanceof RealmObject)) {
      const schemaName = clazz.schema && (clazz.schema as DefaultObject).name;
      if (typeof schemaName === "string" && schemaName != arg.name) {
        throw new TypeError(`Class '${arg.name}' (declaring '${schemaName}' schema) must extend Realm.Object`);
      } else {
        throw new TypeError(`Class '${arg.name}' must extend Realm.Object`);
      }
    }
    assert.object(clazz.schema, "schema static");
    validateObjectSchema(clazz.schema);
  } else {
    assert.object(arg, "object schema");
    assert.string(arg.name, "name");
    assert.object(arg.properties, "properties");
  }
}
