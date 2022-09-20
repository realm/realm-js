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
import { ObjectSchema } from "../schema";

export function validateConfiguration(arg: unknown): asserts arg is Configuration {
  assert.object(arg);
  const { path, schema } = arg;
  if (typeof path === "string") {
    assert(path.length > 0, "Expected a non-empty path or none at all");
  }
  if (schema) {
    assert.array(schema, "schema");
    schema.forEach(validateObjectSchema);
  }
}

export function validateObjectSchema(arg: unknown): asserts arg is ObjectSchema {
  assert.object(arg, "object schema");
  assert.string(arg.name, "name");
  assert.object(arg.properties, "properties");
}
