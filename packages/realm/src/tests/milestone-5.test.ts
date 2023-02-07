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

import { expect } from "chai";
import { inspect } from "node:util";
import { Decimal128, ObjectId, UUID } from "bson";

import { List, PropertySchema, PropertyTypeName, Realm, Object as RealmObject } from "../index";
import { RealmContext, closeRealm, generateTempRealmPath } from "./utils";

type ValueFunction<T = unknown> = (realm: Realm) => T;
type TestFunction<T = unknown> = (result: unknown, input: T) => boolean;
type PropertyTest<T = unknown> = [T | ValueFunction<T>, T | TestFunction<T>];
type PropertySuite = [PropertyTypeName | PropertySchema, (unknown | PropertyTest)[]];

/**
  Int = 0,
  Bool = 1,
  String = 2,
  Data = 3,
  Date = 4,
  Float = 5,
  Double = 6,
  Object = 7,
  LinkingObjects = 8,
  Mixed = 9,
  ObjectId = 10,
  Decimal = 11,
  UUID = 12,
  Required = 0,
  Nullable = 64,
  Array = 128,
  Set = 256,
  Dictionary = 512,
  Collection = 896,
 */

function testArrayBuffer(value: unknown, expected: ArrayBuffer) {
  if (value instanceof ArrayBuffer) {
    expect(value.byteLength).equals(expected.byteLength);
    const view = new Int8Array(value);
    const expectedView = new Int8Array(expected);
    expect(view).deep.equals(expectedView);
  } else {
    throw new Error("Expected an ArrayBuffer");
  }
}

function testDate(value: unknown, input: Date) {
  if (value instanceof Date) {
    expect(value.getDate()).equals(input.getDate());
  } else {
    throw new Error("Expected a Date");
  }
}

function testNumber(value: unknown, input: number) {
  return expect(value).closeTo(input, Number.EPSILON);
}

function testObject(value: unknown, input: RealmObject) {
  if (value instanceof RealmObject) {
    expect(value._objectKey()).equals(input._objectKey());
  } else {
    throw new Error("Expected a RealmObject");
  }
}

function testObjectId(value: unknown, input: ObjectId) {
  if (value instanceof ObjectId) {
    expect(value.equals(input)).equals(true);
  } else {
    throw new Error("Expected an ObjectId");
  }
}

function testUUID(value: unknown, input: UUID) {
  if (value instanceof UUID) {
    expect(value.equals(input)).equals(true);
  } else {
    throw new Error("Expected a UUID");
  }
}

function testDecimal128(value: unknown, input: Decimal128) {
  if (value instanceof Decimal128) {
    expect(value.bytes).deep.equals(input.bytes);
  } else {
    throw new Error("Expected a Decimal128");
  }
}

function defaultTest(a: unknown, b: unknown) {
  expect(a).deep.equals(b);
}

function testList(value: unknown, input: unknown[], test = defaultTest) {
  if (value instanceof List) {
    expect(value.length).equals(input.length);
    for (const [index, item] of value.entries()) {
      test(item, input[index]);
    }
  } else {
    throw new Error("Expected a List");
  }
}

function testObjectList(value: unknown, input: unknown[]) {
  testList(value, input, testObject);
}

function testDataList(value: unknown, input: unknown[]) {
  testList(value, input, testArrayBuffer);
}

function createEmptyArrayBuffer() {
  return new ArrayBuffer(0);
}

function createArrayBuffer() {
  const value = new ArrayBuffer(12);
  const view = new Int32Array(value);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  return value;
}

const TESTS: PropertySuite[] = [
  [
    "int",
    [
      0,
      123,
      1_000_000,
      1_000_000_000,
      1_000_000_000_000,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      [10n, 10], // bigint is coerced to number when read from the binding
    ],
  ],
  ["bool", [true, false]],
  ["string", ["", "Hello!", "💣💥"]],
  [
    "data",
    [
      [createArrayBuffer, testArrayBuffer],
      [createEmptyArrayBuffer, testArrayBuffer],
    ],
  ],
  ["date", [[new Date("2022-11-04T12:00:00"), testDate]]],
  [
    "float",
    [
      0,
      123,
      -123,
      [Number.MIN_VALUE, testNumber],
      // [Number.MAX_VALUE, testNumber],
      // [3.4 * Math.pow(10, 37), testNumber],
    ],
  ],
  ["double", [0, 123, -123, [Number.MIN_VALUE, testNumber], [Number.MAX_VALUE - 1, testNumber]]],
  // We're testing objects extensively in previous milestones (and its hard to fit into this "framework")
  [{ type: "object", objectType: "MyObject" }, [[(realm: Realm) => realm.create("MyObject", {}), testObject]]],
  // TODO: We should add some tests for 👇
  ["linkingObjects", []],
  ["objectId", [[new ObjectId(ObjectId.generate()), testObjectId]]],
  ["uuid", [[new UUID(UUID.generate()), testUUID]]],
  ["decimal128", [[new Decimal128("123"), testDecimal128]]],
  [
    "mixed",
    /*
      Int = 0,
      Bool = 1,
      String = 2,
      Binary = 4,
      Mixed = 6,
      Timestamp = 8,
      Float = 9,
      Double = 10,
      Decimal = 11,
      Link = 12,
      LinkList = 13,
      ObjectId = 15,
      TypedLink = 16,
      UUID = 17,
    */
    [
      null,
      0,
      false,
      "hi!",
      "💣💥",
      [createArrayBuffer, testArrayBuffer],
      [createEmptyArrayBuffer, testArrayBuffer],
      [new Date("2022-11-04T12:00:00"), testDate],
      123.567,
      [10n, 10], // bigint is coerced to number when read from the binding
      [Number.MIN_VALUE, testNumber],
      [Number.MAX_VALUE, testNumber],
      [(realm: Realm) => realm.create("MyObject", {}), testObject],
      [new ObjectId(ObjectId.generate()), testObjectId],
      [new UUID(UUID.generate()), testUUID],
      [new Decimal128("123"), testDecimal128],
    ],
  ],
  [{ type: "list", objectType: "int" }, [[[1, 2, 3], testList]]],
  [{ type: "list", objectType: "bool" }, [[[true, false], testList]]],
  [{ type: "list", objectType: "bool", optional: true }, [[[true, false, null], testList]]],
  [{ type: "list", objectType: "string" }, [[["hi", "💣💥"], testList]]],
  [{ type: "list", objectType: "string", optional: true }, [[["hi", "💣💥", null], testList]]],
  [{ type: "list", objectType: "data" }, [[() => [createArrayBuffer(), createEmptyArrayBuffer()], testDataList]]],
  [{ type: "list", objectType: "MyObject" }, [[(realm: Realm) => [realm.create("MyObject", {})], testObjectList]]],
];

type PropertyTestContext = RealmContext & { value: unknown };

describe("Milestone #5", () => {
  for (const [type, cases] of TESTS) {
    describe(`property of type ${inspect(type)}`, () => {
      for (const c of cases) {
        const [valueArg, expected] = (Array.isArray(c) ? c : [c, c]) as PropertyTest;
        describe("when value is " + (typeof valueArg === "function" ? "to be determined" : inspect(valueArg)), () => {
          after(closeRealm);

          it("is supported when declaring schema", function (this: PropertyTestContext) {
            this.realm = new Realm({
              path: generateTempRealmPath(),
              inMemory: true,
              schema: [{ name: "MyObject", properties: { prop: type } }],
            });
          });

          it("is supported via realm.create", function (this: PropertyTestContext) {
            this.realm.write(() => {
              this.value = typeof valueArg === "function" ? (valueArg as ValueFunction)(this.realm) : valueArg;
              this.realm.create("MyObject", { prop: this.value });
            });
          });

          it("is supported via property set", function (this: PropertyTestContext) {
            const [obj] = this.realm.objects("MyObject");
            expect(obj).instanceOf(RealmObject);
            this.realm.write(() => {
              obj.prop = this.value;
            });
          });

          it("is supported via property get", function (this: PropertyTestContext) {
            const [obj] = this.realm.objects("MyObject");
            expect(obj).instanceOf(RealmObject);
            if (typeof expected === "function") {
              const result = expected(obj.prop, this.value);
              if (typeof result === "boolean") {
                expect(result).equals(true, "Test failure");
              }
            } else {
              expect(obj.prop).equals(expected);
            }
          });
        });
      }
    });
  }

  describe("lists", () => {
    type MyClass = { numbers: List<number> };

    beforeEach(function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        inMemory: true,
        schema: [{ name: "MyClass", properties: { numbers: "int[]" } }],
      });
      this.realm.write(() => {
        this.realm.create("MyClass", { numbers: [10, 20, 30] });
      });
    });

    afterEach(closeRealm);

    it("enables index access", function (this: RealmContext) {
      const [obj] = this.realm.objects<MyClass>("MyClass");
      expect(obj.numbers[0]).equals(10);
      expect(obj.numbers[1]).equals(20);
      expect(obj.numbers[2]).equals(30);
    });
  });
});
