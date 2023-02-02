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

import { fromBindingPropertySchema } from "../schema/from-binding";
import { toBindingPropertySchema } from "../schema/to-binding";
import { normalizePropertySchema } from "../schema/normalize";
import { PropertySchema } from "../schema";

const TEST_CASES: (string | PropertySchema)[] = [
  "string",
  "string?",
  "string?[]",
  "string[]",
  "string{}",
  "string<>",
  "Person",
  "Person[]",
  { type: "linkingObjects", property: "friend", objectType: "Person" },
];

describe("schema transform", () => {
  for (const prop of TEST_CASES) {
    it(inspect(prop, { compact: true, breakLength: Number.MAX_SAFE_INTEGER }), () => {
      const objectName = "MyObject";
      const propertyName = "prop";
      const normalizedSchema = normalizePropertySchema({ objectName, propertyName, propertySchema: prop });
      const bindingSchema = toBindingPropertySchema(propertyName, normalizedSchema);
      const reversedSchema = fromBindingPropertySchema({
        publicName: propertyName,
        objectType: "",
        linkOriginPropertyName: "",
        isPrimary: false,
        isIndexed: false,
        columnKey: { value: 0n } as any,
        ...bindingSchema,
      });
      const normalizedReversedSchema = normalizePropertySchema({
        objectName,
        propertyName,
        propertySchema: reversedSchema,
      });
      expect(normalizedReversedSchema).deep.equals(normalizedSchema);
    });
  }
});
