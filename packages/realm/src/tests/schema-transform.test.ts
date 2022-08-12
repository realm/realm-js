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

import { inspect } from "util";
import { expect } from "chai";

import { transformPropertySchema as fromBindingPropertySchema } from "../schema/from-binding";
import { transformPropertySchema as toBindingPropertySchema } from "../schema/to-binding";
import { normalizePropertySchema } from "../schema/normalize";
import { ObjectSchemaProperty } from "../schema";

const TEST_CASES: (string | ObjectSchemaProperty)[] = [
  "string",
  "string?",
  "string?[]",
  "string[]",
  "string{}",
  "string<>",
  "Person",
  "Person[]",
];

describe("schema transform", () => {
  for (const prop of TEST_CASES) {
    it(inspect(prop, { compact: true, breakLength: Number.MAX_SAFE_INTEGER }), () => {
      const PROP_NAME = "prop";
      const normalizedSchema = normalizePropertySchema(PROP_NAME, prop);
      const bindingSchema = toBindingPropertySchema(PROP_NAME, normalizedSchema);
      const reversedSchema = fromBindingPropertySchema({
        publicName: PROP_NAME,
        objectType: "",
        linkOriginPropertyName: "",
        isPrimary: false,
        isIndexed: false,
        columnKey: { value: 0n } as any,
        ...bindingSchema,
      });
      const normalizedReversedSchema = normalizePropertySchema(PROP_NAME, reversedSchema);
      expect(normalizedSchema).deep.equals(normalizedReversedSchema);
    });
  }
});
