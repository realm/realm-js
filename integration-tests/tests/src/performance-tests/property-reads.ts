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

import { Realm } from "realm";

import { describePerformance } from "../utils/benchmark";

type Value = ((realm: Realm) => unknown) | unknown;

function getTypeName(type: Realm.PropertySchemaShorthand | Realm.PropertySchema) {
  if (typeof type === "object") {
    const prefix = type.optional ? "optional " : "";
    if (type.objectType) {
      return prefix + `${type.type}<${type.objectType}>`;
    } else {
      return prefix + type.type;
    }
  } else {
    return type;
  }
}

type TestParameters = {
  name?: string;
  type: Realm.PropertySchemaShorthand | Realm.PropertySchema;
  value: Value;
  schema?: Realm.ObjectSchema[];
};

function describeTypeRead({ type, value, schema = [] }: TestParameters) {
  const typeName = getTypeName(type);
  const objectSchemaName = type + "Class";
  const propertyName = type + "Prop";

  const defaultSchema = {
    name: objectSchemaName,
    properties: {
      [propertyName]: type,
    },
  };

  describePerformance(`reading property of type '${typeName}'`, {
    schema: [defaultSchema, ...schema],
    benchmarkTitle: `reads ${typeName}`,
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
      if (typeof value === "undefined") {
        // Performing a check to avoid the get of the property to be optimized away
        throw new Error("Expected a value");
      }
    },
  });
}

const cases: Array<TestParameters | [Realm.PropertySchemaShorthand | Realm.PropertySchema, Value]> = [
  ["bool?", true],
  ["bool", true],
  ["int?", 123],
  ["int", 123],
  ["float", 123.456],
  ["double?", 123.456],
  ["double", 123.456],
  ["string?", "Hello!"],
  ["decimal128?", new Realm.BSON.Decimal128("123")],
  ["objectId?", new Realm.BSON.ObjectId("0000002a9a7969d24bea4cf4")],
  ["uuid?", new Realm.BSON.UUID()],
  ["date?", new Date("2000-01-01")],
  ["data?", new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09])],
  {
    type: "Car",
    schema: [{ name: "Car", properties: { model: "string" } }],
    value: (realm: Realm) => realm.create("Car", { model: "VW Touran" }),
  },
  ["bool?[]", []],
  ["bool?<>", []],
  ["bool?{}", {}],
];

describe.skipIf(environment.performance !== true, "Property read performance", () => {
  for (const c of cases) {
    if (Array.isArray(c)) {
      const [type, value] = c;
      describeTypeRead({ type, value });
    } else {
      describeTypeRead(c);
    }
  }
});
