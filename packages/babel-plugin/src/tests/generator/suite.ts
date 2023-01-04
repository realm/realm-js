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

import { PropertySchema } from "realm";
import { generatePropertyCode, generatePropertyVariants, PropertyTestOptions } from "./variants";
import { extractSchema, transformProperty } from "./transform";

type PropertySuiteOptions = {
  type: string;
  objectTypes?: (undefined | string)[];
  defaults?: ({ source: string } | unknown)[];
  optionals?: boolean[];
};

function inferSchema(options: PropertyTestOptions) {
  const property: PropertySchema = { type: options.type };
  if (typeof options.default !== "undefined") {
    property.default = options.default;
  }
  if (options.optional) {
    property.optional = true;
  }
  if (options.objectType) {
    property.objectType = options.objectType;
  }
  return { [options.name]: property };
}

export function describeProperty(
  title: string,
  { type, objectTypes, defaults = [undefined], optionals = [false, true] }: PropertySuiteOptions,
): void {
  describe(title, () => {
    for (const d of defaults) {
      for (const optional of optionals) {
        for (const objectType of objectTypes || [undefined]) {
          const name = "prop";
          const testOptions: PropertyTestOptions = { type, objectType, default: d, name, optional };
          const variants = generatePropertyVariants(testOptions);
          for (const variant of variants) {
            const propertyCode = generatePropertyCode(variant);
            it(`transforms \`${propertyCode}\``, () => {
              const transformCode = transformProperty(propertyCode);
              const parsedSchema = extractSchema(transformCode);
              const expectedSchema = inferSchema(testOptions);
              expect(parsedSchema?.properties).toStrictEqual(expectedSchema);
            });
          }
        }
      }
    }
  });
}
