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
import Realm, { PropertySchema } from "realm";

import { openRealmBefore } from "../hooks";

type Item<ValueType = Realm.Mixed> = {
  dict: Realm.Dictionary<ValueType>;
};

type DictValues = { [key: string]: unknown };

describe("Dictionary", () => {
  describe("with unconstrained (mixed) values", () => {
    openRealmBefore({
      schema: [
        {
          name: "Item",
          properties: { dict: "mixed{}" },
        },
        {
          name: "Person",
          properties: { name: "string" },
        },
      ],
    });

    it("can be used as a property type in a schema", function (this: RealmContext) {
      expect(this.realm.isClosed).equals(false);
      const dictSchemaProperty = this.realm.schema[0].properties.dict as PropertySchema;
      expect(typeof dictSchemaProperty).equals("object");
      expect(dictSchemaProperty.type).equals("dictionary");
      expect(dictSchemaProperty.objectType).equals("mixed");
    });

    it("is an instance of Dictionary", function (this: RealmContext) {
      const item = this.realm.write(() => this.realm.create<Item>("Item", {}));
      expect(item.dict instanceof Realm.Dictionary);
    });

    it("can add/set values in multiple ways", function (this: RealmContext) {
      const item = this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        item.dict.set("key1", "value1");
        item.dict.set({ key2: "value2" });
        item.dict.key3 = "value3";
        return item;
      });

      expect(item.dict).deep.equals({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });

      //This is to verify that item.dict.key3 was not just an object property assignment
      expect(Object.keys(item.dict).length).deep.equals(3);

      this.realm.write(() => {
        item.dict.set("key1", "value1New");
        item.dict.set({ key2: "value2New" });
        item.dict.key3 = "value3New";
        return item;
      });

      expect(item.dict).deep.equals({
        key1: "value1New",
        key2: "value2New",
        key3: "value3New",
      });

      expect(Object.keys(item.dict).length).deep.equals(3);
    });

    it("set/remove methods return the dictionary", function (this: RealmContext) {
      const item = this.realm.write(() => this.realm.create<Item>("Item", {}));

      this.realm.write(() => item.dict.set("key1", "value1").set("key2", "value2"));

      expect(item.dict).deep.equals({
        key1: "value1",
        key2: "value2",
      });

      this.realm.write(() => item.dict.remove("key1").remove("key2"));

      expect(Object.keys(item.dict)).deep.equals([]);
    });

    const methodNames = [
      // "get",
      "set",
      "remove",
      "addListener",
      "removeListener",
      "removeAllListeners",
      "toJSON",
    ];
    for (const name of methodNames) {
      it(`exposes a method named '${name}'`, function (this: RealmContext) {
        const item = this.realm.write(() => this.realm.create<Item>("Item", {}));
        expect(typeof item.dict[name]).equals("function");
      });
    }

    it("iterating with forEach() throws", function (this: RealmContext) {
      const item = this.realm.write(() => {
        return this.realm.create<Item>("Item", {});
      });
      //@ts-expect-error accesses forEach on a dictionary which should not exist.
      expect(() => item.dict.forEach()).throws(TypeError, "item.dict.forEach is not a function");
    });

    it("can store string values using string keys", function (this: RealmContext) {
      const item = this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        item.dict.key1 = "hello";
        return item;
      });
      expect(item.dict.key1).equals("hello");
    });

    it("can store number values using string keys", function (this: RealmContext) {
      const item = this.realm.write(() =>
        this.realm.create<Item<number>>("Item", {
          dict: { key1: 0 },
        }),
      );

      expect(item.dict).deep.equals({ key1: 0 });
      this.realm.write(() => {
        // Assignment
        item.dict.key1 = 1234;
        item.dict.key2 = Number.MAX_VALUE;
        item.dict.key3 = Number.MIN_VALUE;
      });

      expect(item.dict).deep.equals({
        key1: 1234,
        key2: Number.MAX_VALUE,
        key3: Number.MIN_VALUE,
      });
    });

    it("can store boolean values using string keys", function (this: RealmContext) {
      const item = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          dict: {
            key1: true,
            key2: false,
          },
        }),
      );
      expect(item.dict).deep.equals({
        key1: true,
        key2: false,
      });

      this.realm.write(() => {
        item.dict.key1 = false;
        item.dict.key2 = true;
      });
      expect(item.dict).deep.equals({
        key1: false,
        key2: true,
      });
    });

    it("can store object link values using string keys", function (this: RealmContext) {
      const { alice, bob, item } = this.realm.write(() => {
        const alice = this.realm.create("Person", { name: "Alice" });
        const bob = this.realm.create("Person", { name: "Bob" });
        // Creation
        const item = this.realm.create<Item>("Item", {
          dict: {
            key1: alice,
          },
        });
        return { alice, bob, item };
      });
      expect(item.dict).deep.equals({
        key1: alice,
      });
      this.realm.write(() => {
        item.dict.key1 = bob;
      });
      expect(item.dict).deep.equals({
        key1: bob,
      });
    });

    // This is currently not supported
    it.skip("can store dictionary values using string keys", function (this: RealmContext) {
      const item = this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        const item2 = this.realm.create<Item>("Item", {});
        item2.dict.key1 = "Hello";
        item.dict.key1 = item2.dict;
        return item;
      });
      // @ts-expect-error We expect a dictionary inside dictionary
      expect(item.dict.key1.dict.key1).equals("hello");
    });

    it("can store a reference to itself using string keys", function (this: RealmContext) {
      const item = this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        item.dict.key1 = item;
        return item;
      });
      const value = item.dict.key1;
      if (value instanceof Realm.Object) {
        expect(value._objectKey()).equals(item._objectKey());
      } else {
        throw new Error("Expected a Realm.Object");
      }
    });

    it("is spreadable", function (this: RealmContext) {
      const item = this.realm.write(() => this.realm.create<Item>("Item", { dict: { key1: "hi" } }));
      expect({ ...item.dict, key2: "hello" }).deep.equals({ key1: "hi", key2: "hello" });
    });

    it("can JSON.stringify", function (this: RealmContext) {
      const values: DictValues = {
        key1: "hello",
        key2: 1234,
        key3: false,
        key4: null,
      };
      const item = this.realm.write(() => this.realm.create<Item>("Item", { dict: values }));
      const stringifiedAndParsed = JSON.parse(JSON.stringify(item.dict));
      expect(stringifiedAndParsed).deep.equals(values);
    });

    it("can JSON.stringify via the object", function (this: RealmContext) {
      const values: DictValues = {
        key1: "hello",
        key2: 1234,
        key3: false,
        key4: null,
      };
      const item = this.realm.write(() => this.realm.create<Item>("Item", { dict: values }));
      const stringifiedAndParsed = JSON.parse(JSON.stringify(item));
      expect(stringifiedAndParsed).deep.equals({ dict: values });
    });

    // TODO: Unskip once https://github.com/realm/realm-core/issues/4805 is fixed
    it.skip("throws a meaningful error if accessed after deletion", function (this: RealmContext) {
      this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        const dict = item.dict;
        this.realm.delete(item);
        expect(() => {
          JSON.stringify(dict);
        }).throws("Access to invalidated Dictionary object");
      });
    });

    it("can have values deleted", function (this: RealmContext) {
      this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {
          dict: { key1: "hi" },
        });
        expect(item.dict).deep.equals({ key1: "hi" });
        delete item.dict.key1;
        expect(Object.keys(item.dict)).deep.equals([]);
        // TODO: Investigate why this blocks
        // expect(item.dict).deep.equals({});
      });
    });
  });

  describe("toJSON", function () {
    openRealmBefore({
      schema: [
        {
          name: "Item",
          properties: { dict: "mixed{}" },
        },
      ],
    });

    it("calling toJSON on an object with a Dictionary field removes the Proxy from the Dictionary", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<Item>("Item", { dict: { something: "test" } });
      });
      const jsonObject = object.toJSON();

      // Previously this would throw on JSC, because the Dictionary was still a Proxy,
      // so modifying it tried to write to the Realm outside of a write transaction
      expect(() => {
        // @ts-expect-error We know the field is a dict.
        jsonObject.dict.something = "test2";
      }).to.not.throw();
    });
  });

  type ValueGenerator = (realm: Realm) => DictValues;

  type TypedDictionarySuite = {
    extraSchema?: Realm.ObjectSchema[];
    type: string;
    goodValues: DictValues | ValueGenerator;
    badValues: DictValues;
    expectedError: string;
  };

  function describeTypedSuite({ extraSchema = [], type, goodValues, badValues, expectedError }: TypedDictionarySuite) {
    return describe(`with constrained '${type}' values`, () => {
      openRealmBefore({
        schema: [
          {
            name: "Item",
            properties: { dict: `${type}{}` },
          },
          ...extraSchema,
        ],
      });

      it("can initialize", function (this: RealmContext) {
        this.realm.write(() => {
          const values = typeof goodValues === "function" ? goodValues(this.realm) : goodValues;
          const item = this.realm.create<Item>("Item", { dict: values });
          expect(item.dict).deep.equals(values);
        });
      });

      it("can assign", function (this: RealmContext) {
        this.realm.write(() => {
          const item = this.realm.create<Item>("Item", {});
          const values = typeof goodValues === "function" ? goodValues(this.realm) : goodValues;
          for (const [k, v] of Object.entries(values)) {
            item.dict[k] = v;
          }
          expect(item.dict).deep.equals(values);
        });
      });

      it("fails if type mismatch", function (this: RealmContext) {
        this.realm.write(() => {
          expect(() => {
            this.realm.create<Item>("Item", {
              dict: badValues,
            });
          }).throws(expectedError);
        });
      });
    });
  }

  describeTypedSuite({
    type: "int",
    goodValues: {
      key1: 0,
      key2: 0,
      key3: 0,
    },
    badValues: {
      key1: "this is a string",
    },
    expectedError: "Expected 'dict[\"key1\"]' to be a number or bigint, got a string",
  });

  describeTypedSuite({
    type: "string",
    goodValues: {
      key1: "hi",
      key2: "there",
    },
    badValues: {
      key1: false,
    },
    expectedError: "Expected 'dict[\"key1\"]' to be a string, got a boolean",
  });

  describeTypedSuite({
    type: "bool",
    goodValues: {
      key1: true,
      key2: false,
    },
    badValues: {
      key1: 1234,
    },
    expectedError: "Expected 'dict[\"key1\"]' to be a boolean, got a number",
  });

  describeTypedSuite({
    extraSchema: [{ name: "Person", properties: { name: "string" } }],
    type: "Person",
    goodValues: (realm) => ({
      key1: realm.create("Person", { name: "Alice" }),
    }),
    badValues: {
      key1: "unexpected string",
    },
    expectedError: "Expected 'dict[\"key1\"]' to be an object, got a string",
  });
});
