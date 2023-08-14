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

import { openRealmBefore, openRealmBeforeEach } from "../hooks";
import { sleep } from "../utils/sleep";

type Item<ValueType = Realm.Mixed> = {
  dict: Realm.Dictionary<ValueType>;
};
const DictSchema: Realm.ObjectSchema = {
  name: "Dictionary",
  properties: {
    fields: "mixed{}",
  },
};
const Child: Realm.ObjectSchema = {
  name: "Children",
  properties: {
    num: "int",
  },
};
const TwoDictSchema: Realm.ObjectSchema = {
  name: "Dictionary",
  properties: {
    dict1: "mixed{}",
    dict2: "mixed{}",
  },
};
const EmbeddedChild = {
  name: "Children",
  embedded: true,
  properties: {
    num: "int",
  },
};

const DictTypedSchema: Realm.ObjectSchema = {
  name: "TypedDictionary",
  properties: {
    dict1: { type: "dictionary", objectType: "Children" }, // dictionary of objects is nullable by default
    dict2: { type: "dictionary", objectType: "Children", optional: true },
  },
};

const DictMixedSchema = {
  name: "MixedDictionary",
  properties: {
    dict1: "mixed{}",
    dict2: "mixed{}",
  },
};

type IDictSchema = {
  fields: Record<any, any>;
};
type ITwoDictSchema = {
  dict1: Record<any, any>;
  dict2: Record<any, any>;
};
type IEmbeddedChild = {
  num: number;
};
type IDictTypedSchema = {
  dict1: Record<string, IEmbeddedChild>;
  dict2: Record<string, IEmbeddedChild | null>;
};
type DictValues = { [key: string]: unknown };

describe("Dictionary", () => {
  before(() => {
    Realm.clearTestState();
  });
  describe("schema", () => {
    it("throws on invalid schema", () => {
      expect(() => {
        new Realm({
          schema: [
            {
              name: "Dictionary",
              properties: {
                a: "wwwww{}",
              },
            },
          ],
        });
      }).throws(
        "Schema validation failed due to the following errors:\n- Property 'Dictionary.a' of type 'dictionary' has unknown object type 'wwwww'",
      );
    });
  });
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

    it("throws when using Symbol as key", function (this: RealmContext) {
      const sym = Symbol("testSymbol");

      this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});

        expect(() => {
          //@ts-expect-error Testing invalid key.
          item.dict.set(sym, "value1");
        }).to.throw("Symbols cannot be used as keys of a dictionary");

        expect(() => {
          item.dict.set({ [sym]: "value2" });
        }).to.throw("Symbols cannot be used as keys of a dictionary");

        expect(() => {
          //@ts-expect-error Testing invalid key.
          item.dict[sym] = "value3";
        }).to.throw("Symbols cannot be used as keys of a dictionary");
      });
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
      expect(() => item.dict.forEach()).throws("is not a function");
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

    it("throws a meaningful error if accessed after deletion", function (this: RealmContext) {
      this.realm.write(() => {
        const item = this.realm.create<Item>("Item", {});
        const dict = item.dict;
        this.realm.delete(item);
        expect(() => {
          JSON.stringify(dict);
        }).throws(
          "Dictionary is no longer valid. Either the parent object was deleted or the containing Realm has been invalidated or closed.",
        );
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
    it("can have values updated", function (this: RealmContext) {
      let item = this.realm.write(() => {
        return this.realm.create<Item>("Item", {
          dict: { a: 1, b: 2, c: "hey" },
        });
      });
      expect(item.dict.a).equals(1);
      expect(item.dict.b).equals(2);
      expect(item.dict.c).equals("hey");
      item = this.realm.write(() => {
        return this.realm.create<Item>("Item", {
          dict: { a: 0, b: 0, c: "new value" },
        });
      });
      expect(item.dict.a).equals(0);
      expect(item.dict.b).equals(0);
      expect(item.dict.c).equals("new value");
    });

    it("can have values mutated", function (this: RealmContext) {
      const item = this.realm.write(() => {
        return this.realm.create<Item>("Item", {
          dict: { a: 1, b: 2, c: "hey" },
        });
      });
      expect(item.dict.a).equals(1);
      expect(item.dict.b).equals(2);
      expect(item.dict.c).equals("hey");
      this.realm.write(() => {
        item.dict.a = 0;
        item.dict.b = 0;
        item.dict.c = "new value";
      });
      expect(item.dict.a).equals(0);
      expect(item.dict.b).equals(0);
      expect(item.dict.c).equals("new value");
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

  describe("Dictionary queries", () => {
    openRealmBeforeEach({ schema: [DictSchema] });
    it("support filters", function (this: RealmContext) {
      const N = 100;
      for (let i = 0; i < N; i++) {
        this.realm.write(() => this.realm.create(DictSchema.name, { fields: { x: i, y: 2, z: 3 } }));
      }

      const data = this.realm.objects(DictSchema.name);
      expect(data.length).equals(N, "We expect ${N} objects.");

      const half = data.filtered("fields['x'] >= 50");
      const seventy = data.filtered("fields['x'] >= $0", 70);
      expect(half.length).equals(N / 2, "We expect only 50 items, matching for field x.");
      expect(seventy.length).equals(30, "We expect only 30 items, matching for field x.");
    });
  });

  // TODO: Refactor to not use a `sleep` and instead resolve a promise when the listener has fired the expected amount of times (and throw if that gets exceeded)
  describe("notifications", () => {
    openRealmBeforeEach({ schema: [DictSchema] });
    it("support update notifications", async function (this: RealmContext) {
      const UPDATES = 5;
      this.realm.write(() => this.realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
      const fields = this.realm.objects<IDictSchema>(DictSchema.name)[0].fields;
      let cnt = 0;
      fields.addListener((_: any, changeset: { modifications: any[] }) => {
        expect(fields.field1).equals(cnt, "fields.field1: ${fields.field1} should be equals to: cnt -> ${cnt}");
        // We ignore the first as it just reflect the creation in the line above.
        if (cnt > 0) {
          expect(changeset.modifications[0]).equals(
            "field1",
            "The changeset should reflect an update on field1 but it shows -> ${changeset.modifications[0]}",
          );
        }
        cnt++;
      });

      for (let i = 1; i <= UPDATES; i++) {
        this.realm.write(() => {
          fields.field1 = i;
        });
      }

      await sleep(1000);
      expect(this.realm.objects<IDictSchema>(DictSchema.name)[0].fields.field1).equals(5);
      expect(cnt).equals(UPDATES + 1, "We expect ${UPDATES + 1} updates.");
      fields.removeAllListeners();
      this.realm.close();
    });

    it("support insert notifications", async function (this: RealmContext) {
      this.realm.write(() => this.realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
      const ff = this.realm.objects<IDictSchema>(DictSchema.name)[0];
      let cnt = 0;
      const a = function (obj: any, changeset: any) {
        if (cnt === 1) {
          expect(obj.x2 !== undefined, "This field should be equal x2").to.be.true;
          expect(obj.x1 !== undefined, "This field should be equal x1").to.be.true;
          expect(changeset.deletions.length).equals(3);
          expect(changeset.insertions.length).equals(2);
          expect(changeset.modifications.length).equals(0);
        }
        if (cnt === 2) {
          expect(obj.x1 !== undefined, "This field should be equal x1").to.be.true;
          expect(obj.x5 !== undefined, "This field should be equal x5").to.be.true;
          expect(obj.x3 !== undefined, "This field should be equal x3").to.be.true;
          expect(changeset.deletions.length).equals(2);
          expect(changeset.insertions.length).equals(3);
          expect(changeset.modifications.length).equals(0);
        }
        if (cnt === 3) {
          const keys = Object.keys(obj);
          expect(keys[0]).equals("x1");
          expect(obj.x1).equals("hello");
          expect(changeset.deletions.length).equals(3);
          expect(changeset.insertions.length).equals(1);
          expect(changeset.modifications.length).equals(0);
        }
        cnt++;
      };
      ff.fields.addListener(a);
      // total object mutation.
      this.realm.write(() => {
        ff.fields = { x1: 1, x2: 2 };
      });
      // partial object mutation.
      this.realm.write(() => {
        ff.fields = { x1: 1, x3: 2, x5: 5 };
      });
      // deleting all but one field.
      this.realm.write(() => {
        ff.fields = { x1: "hello" };
      });
      await sleep(1000);
      expect(cnt).equals(4);
      ff.fields.removeAllListeners();
      this.realm.close();
    });

    it("support removeAll notifications", async function (this: RealmContext) {
      this.realm.write(() => this.realm.create(DictSchema.name, { fields: { x: 1, y: 2, z: 3 } }));
      const point = this.realm.objects<IDictSchema>(DictSchema.name)[0].fields;

      let cnt = 0;
      for (let i = 0; i < 10; i++) {
        point.addListener(() => {
          cnt++;
        });
      }

      point.removeAllListeners();
      this.realm.write(() => (point.x = 10));

      await sleep(1000);
      expect(cnt).equal(0);
      this.realm.close();
    });

    it("support removeListener notifications", async function (this: RealmContext) {
      const called = {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
      };
      this.realm.write(() => this.realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
      const fields = this.realm.objects<IDictSchema>(DictSchema.name)[0].fields;

      const a = function () {
        called.a++;
      };

      const b = function () {
        called.b++;
      };

      const c = function () {
        called.c++;
      };

      const d = function () {
        called.d++;
      };
      fields.addListener(a);
      fields.addListener(b);
      fields.addListener(c);
      fields.addListener(d);

      fields.removeListener(a);
      fields.removeListener(b);
      fields.removeListener(d);
      fields.removeListener(d);
      fields.removeListener(d);
      fields.removeListener(d);
      fields.removeListener(d);

      this.realm.write(() => {
        fields.field1 = 1;
      });

      await sleep(1000);
      expect(called.a).equal(0, "Function a");
      expect(called.b).equal(0, "Function b");
      expect(called.c).equal(2, "Function c");
      expect(called.d).equal(0, "Function d");
      fields.removeAllListeners();
      this.realm.close();
    });

    it("support removeListener notifications", async function (this: RealmContext) {
      this.realm.write(() => this.realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
      const fields = this.realm.objects<IDictSchema>(DictSchema.name)[0].fields;

      const a = () => {
        expect(false).equal(true, "Function a should be unsubscribed.");
      };
      const b = () => {
        expect(false).equal(true, "Function b should be unsubscribed.");
      };

      /*
            We try to remove listeners that doesn't exist in order to provoke to test out-of-bounds and stability.
         */

      fields.removeListener(a);
      fields.removeListener(a);
      fields.removeListener(b);
      fields.removeListener(b);

      this.realm.write(() => {
        fields.field1 = 1;
      });

      let correct = false;
      fields.addListener(() => {
        correct = true;
      });
      this.realm.write(() => {
        fields.field1 = 2;
      });

      await sleep(1000);
      expect(fields.field1).equal(2);
      expect(correct).equal(true, "This is expected to work.");
      fields.removeAllListeners();
      this.realm.close();
    });
  });

  describe("nested models", () => {
    openRealmBeforeEach({ schema: [TwoDictSchema, Child] });
    it("updates successfully", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(TwoDictSchema.name, {
          dict1: { children1: "x", children2: "y" },
          dict2: { children1: "y", children2: "x" },
        });
      });

      const dict_1 = this.realm.objects<ITwoDictSchema>(TwoDictSchema.name)[0].dict1;
      const dict_2 = this.realm.objects<ITwoDictSchema>(TwoDictSchema.name)[0].dict2;

      this.realm.write(() => {
        const child1 = this.realm.create(Child.name, { num: 555 });
        const child2 = this.realm.create(Child.name, { num: 666 });
        dict_1.set({ children1: child1, children2: child2 });
      });

      expect(dict_1.children1.num).equal(555, "We expect children1#555");
      expect(dict_1.children2.num).equal(666, "We expect children1#666");
      expect(dict_2.children1).equal("y", "We expect children1#y");
      expect(dict_2.children2).equal("x", "We expect children1#x");
    });
  });

  describe("embedded models", () => {
    openRealmBeforeEach({ schema: [DictTypedSchema, DictMixedSchema, EmbeddedChild] });
    it("inserts correctly", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(DictTypedSchema.name, {
          dict1: { children1: { num: 2 }, children2: { num: 3 } },
          dict2: { children1: { num: 4 }, children2: { num: 5 } },
        });
      });

      const dict_1 = this.realm.objects<IDictTypedSchema>(DictTypedSchema.name)[0].dict1;
      const dict_2 = this.realm.objects<IDictTypedSchema>(DictTypedSchema.name)[0].dict2;
      expect(dict_1.children1.num).equal(2, "We expect children1#2");
      expect(dict_1.children2.num).equal(3, "We expect children2#3");
      expect(dict_2.children1?.num).equal(4, "We expect children1#4");
      expect(dict_2.children2?.num).equal(5, "We expect children2#5");
    });

    it("throws on invalid input", function (this: RealmContext) {
      this.realm.write(() => {
        expect(() => {
          this.realm.create(DictMixedSchema.name, {
            dict1: { children1: { num: 2 }, children2: { num: 3 } },
            dict2: { children1: { num: 4 }, children2: { num: 5 } },
          });
        }).throws("Unable to convert an object with ctor 'Object' to a Mixed");
      });
    });
  });
});
