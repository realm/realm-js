////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { expect } from "chai";
import Realm, { BSON, ObjectSchema, PropertySchema, PropertySchemaShorthand } from "realm";

import { describePerformance } from "../utils/benchmark";

type Value = ((realm: Realm) => unknown) | unknown;

const COLLECTION_MARKERS: Readonly<Record<string, string>> = {
  list: "[]",
  dictionary: "{}",
  set: "<>",
};

/**
 * Get a representative consistent name of the type depending on the schema.
 *
 * @example
 * "int?[]"                                            -> "int?[]"
 * { type: "list", objectType: "int", optional: true } -> "int?[]"
 */
function getTypeDisplayName(schema: PropertySchemaShorthand | PropertySchema) {
  const isShorthand = typeof schema === "string";
  if (isShorthand) {
    return schema;
  }

  const optionalMarker = schema.optional ? "?" : "";
  const collectionMarker = COLLECTION_MARKERS[schema.type] ?? "";

  return (schema.objectType || schema.type) + optionalMarker + collectionMarker;
}

type TestParameters = {
  propertySchema: PropertySchemaShorthand | PropertySchema;
  value: Value;
  extraObjectSchemas?: ObjectSchema[];
};

function describeTypeRead({ propertySchema, value, extraObjectSchemas = [] }: TestParameters) {
  const typeDisplayName = getTypeDisplayName(propertySchema);
  const objectSchemaName = typeDisplayName + "Class";
  const propertyName = typeDisplayName + "Prop";

  const defaultSchema: ObjectSchema = {
    name: objectSchemaName,
    properties: {
      [propertyName]: propertySchema,
    },
  };

  describePerformance(`reading property of type '${typeDisplayName}'`, {
    schema: [defaultSchema, ...extraObjectSchemas],
    benchmarkTitle: `reads ${typeDisplayName}`,
    before(this: Partial<RealmObjectContext> & RealmContext & Mocha.Context) {
      this.realm.write(() => {
        this.object = this.realm.create(objectSchemaName, {
          [propertyName]: typeof value === "function" ? value(this.realm) : value,
        });
        // Override toJSON to prevent this being serialized by Mocha Remote
        Object.defineProperty(this.object, "toJSON", { value: () => ({}) });
      });
      // Override toJSON to prevent this being serialized by Mocha Remote
      Object.defineProperty(this.realm, "toJSON", { value: () => ({}) });
    },
    test(this: RealmObjectContext) {
      const value = this.object[propertyName];
      // Performing a check to avoid the get of the property to be optimized away.
      if (typeof value === "undefined") {
        throw new Error("Expected a value");
      }
    },
  });
}

type SchemaValuePair = [PropertySchemaShorthand | PropertySchema, Value];

const cases: (TestParameters | SchemaValuePair)[] = [
  ["bool?", true],
  ["bool", true],
  ["int?", 123],
  ["int", 123],
  ["float", 123.456],
  ["double?", 123.456],
  ["double", 123.456],
  ["string?", "Hello!"],
  ["decimal128?", new BSON.Decimal128("123")],
  ["objectId?", new BSON.ObjectId("0000002a9a7969d24bea4cf4")],
  ["uuid?", new BSON.UUID()],
  ["date?", new Date("2000-01-01")],
  ["data?", new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09])],
  {
    propertySchema: "Car",
    value: (realm: Realm) => realm.create("Car", { model: "VW Touran" }),
    extraObjectSchemas: [{ name: "Car", properties: { model: "string" } }],
  },
  ["bool?[]", []],
  ["bool?<>", []],
  ["bool?{}", {}],
];

describe.skipIf(environment.performance !== true, "Property read performance", () => {
  for (const c of cases) {
    if (Array.isArray(c)) {
      const [propertySchema, value] = c;
      describeTypeRead({ propertySchema, value });
    } else {
      describeTypeRead(c);
    }
  }

  describe("Helpers", () => {
    it("getTypeDisplayName()", function () {
      expect(getTypeDisplayName("int")).equals("int");
      expect(getTypeDisplayName("int?")).equals("int?");
      expect(getTypeDisplayName("int?[]")).equals("int?[]");
      expect(getTypeDisplayName("Car")).equals("Car");
      expect(getTypeDisplayName({ type: "int" })).equals("int");
      expect(getTypeDisplayName({ type: "list", objectType: "int" })).equals("int[]");
      expect(getTypeDisplayName({ type: "list", objectType: "int", optional: true })).equals("int?[]");
      expect(getTypeDisplayName({ type: "dictionary", objectType: "int" })).equals("int{}");
      expect(getTypeDisplayName({ type: "set", objectType: "int" })).equals("int<>");
      expect(getTypeDisplayName({ type: "object", objectType: "Car" })).equals("Car");
      expect(getTypeDisplayName({ type: "object", objectType: "Car", optional: true })).equals("Car?");
    });
  });
});
