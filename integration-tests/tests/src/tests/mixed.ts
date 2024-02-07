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

import Realm, { BSON, ObjectSchema } from "realm";
import { expect } from "chai";

import { openRealmBefore, openRealmBeforeEach } from "../hooks";

interface ISingle {
  a: Realm.Mixed;
  b: Realm.Mixed;
  c: Realm.Mixed;
  d: Realm.Mixed;
}

interface IVertex {
  a: number;
  b: number;
  c: number;
}

interface IMixNested {
  a: Realm.Mixed;
  b: Realm.Mixed;
  c: Realm.Mixed;
  d: Realm.Mixed;
}

interface IMixedNullable {
  nullable: Realm.Mixed;
  nullable_list: Realm.Mixed[];
}

interface IMixedSchema {
  value: Realm.Mixed;
}

interface IMixedAndEmbedded {
  mixedValue: Realm.Mixed;
  embeddedObject: { value: Realm.Mixed };
}

interface IMixedWithDefaultCollections {
  mixedWithDefaultList: Realm.Mixed;
  mixedWithDefaultDictionary: Realm.Mixed;
}

interface ICollectionsOfMixed {
  list: Realm.List<Realm.Mixed>;
  dictionary: Realm.Dictionary<Realm.Mixed>;
  set: Realm.Set<Realm.Mixed>;
}

const SingleSchema: ObjectSchema = {
  name: "mixed",
  properties: {
    a: "mixed",
    b: "mixed",
    c: "mixed",
    d: "mixed",
  },
};

const VertexSchema: ObjectSchema = {
  name: "Vertex",
  properties: {
    a: "int",
    b: "int",
    c: "int",
  },
};

const MixNestedSchema: ObjectSchema = {
  name: "Nested",
  properties: {
    a: "mixed",
    b: "mixed",
    c: "mixed",
  },
};

const MixedNullableSchema: ObjectSchema = {
  name: "mixed",
  properties: {
    nullable: "mixed",
    nullable_list: "mixed[]",
  },
};

const MixedSchema: ObjectSchema = {
  name: "MixedClass",
  properties: {
    value: "mixed",
  },
};

const MixedAndEmbeddedSchema: ObjectSchema = {
  name: "MixedAndEmbedded",
  properties: {
    mixedValue: "mixed",
    embeddedObject: "EmbeddedObject?",
  },
};

const EmbeddedObjectSchema: ObjectSchema = {
  name: "EmbeddedObject",
  embedded: true,
  properties: {
    value: "mixed",
  },
};

const CollectionsOfMixedSchema: ObjectSchema = {
  name: "CollectionsOfMixed",
  properties: {
    list: "mixed[]",
    dictionary: "mixed{}",
    set: "mixed<>",
  },
};

const bool = true;
const int = 123;
const double = 123.456;
const d128 = BSON.Decimal128.fromString("6.022e23");
const string = "hello";
const date = new Date();
const oid = new BSON.ObjectId();
const uuid = new BSON.UUID();
const nullValue = null;
const uint8Values = [0, 1, 2, 4, 8];
const uint8Buffer = new Uint8Array(uint8Values).buffer;
// The `unmanagedRealmObject` is not added to the collections below since a managed
// Realm object will be added by the individual tests after one has been created.
const unmanagedRealmObject: IMixedSchema = { value: 1 };

/**
 * An array of values representing each Realm data type allowed as `Mixed`,
 * except for a managed Realm Object, a nested list, and a nested dictionary.
 */
const primitiveTypesList: unknown[] = [bool, int, double, d128, string, date, oid, uuid, nullValue, uint8Buffer];

/**
 * An object with values representing each Realm data type allowed as `Mixed`,
 * except for a managed Realm Object, a nested list, and a nested dictionary.
 */
const primitiveTypesDictionary: Record<string, unknown> = {
  bool,
  int,
  double,
  d128,
  string,
  date,
  oid,
  uuid,
  nullValue,
  uint8Buffer,
};

const MixedWithDefaultCollectionsSchema: ObjectSchema = {
  name: "MixedWithDefaultCollections",
  properties: {
    mixedWithDefaultList: { type: "mixed", default: [...primitiveTypesList] },
    mixedWithDefaultDictionary: { type: "mixed", default: { ...primitiveTypesDictionary } },
  },
};

describe("Mixed", () => {
  describe("primitive values", () => {
    openRealmBefore({ schema: [SingleSchema] });
    it("support primitives", function (this: RealmContext) {
      this.realm.write(() => this.realm.create(SingleSchema.name, { a: "xxxxxx", b: 555, c: true }));
      const data = this.realm.objects<ISingle>(SingleSchema.name)[0];
      expect(data.a).equals("xxxxxx", "should store xxxxxx");
      expect(data.b).equals(555, "should store 555");
      expect(data.c).equals(true, "should store boolean (true)");
    });

    it("support queries on mixed primitives", function (this: RealmContext) {
      const N = 100;
      for (let i = 0; i < N; i++) {
        this.realm.write(() => this.realm.create(SingleSchema.name, { a: "xxxxxx", b: "xxx", c: i }));
      }

      const data = this.realm.objects(SingleSchema.name);
      const section = data.filtered('a BEGINSWITH "x" AND b BEGINSWITH "x"');
      const half = data.filtered("c < 50");
      expect(section.length).equals(N, "We expect only 100 items.");
      expect(half.length).equals(N / 2, "We expect only 50 items.");
    });

    it("support complex primitive types", function (this: RealmContext) {
      const d128 = BSON.Decimal128.fromString("6.022e23");
      const oid = new BSON.ObjectId();
      const uuid = new BSON.UUID();
      const date = new Date();

      const data = this.realm.write(() =>
        this.realm.create<ISingle>(SingleSchema.name, { a: oid, b: uuid, c: d128, d: date }),
      );

      expect(typeof data.a === typeof oid, "should be the same type BSON.ObjectId");
      expect(String(data.a)).equals(oid.toString(), "should be the same BSON.ObjectId");
      expect(String(data.b)).equals(uuid.toString(), "Should be the same BSON.UUID");
      expect(String(data.c)).equals(d128.toString(), "Should be the same BSON.Decimal128");
      expect(String(data.d)).equals(date.toString(), "Should be the same Date");
    });

    it("support mixed mutability", function (this: RealmContext) {
      const d128 = BSON.Decimal128.fromString("6.022e23");
      const oid = new BSON.ObjectId();
      const uuid = new BSON.UUID();
      const date = new Date();
      const list = [1, "two"];
      const dictionary = { number: 1, string: "two" };

      const data = this.realm.write(() => this.realm.create<ISingle>(SingleSchema.name, { a: oid }));
      expect(typeof data.a === typeof oid, "should be the same type BSON.ObjectId");
      expect(String(data.a)).equals(oid.toString(), "should have the same content");

      this.realm.write(() => (data.a = uuid));
      expect(typeof data.a === typeof uuid, "should be the same type BSON.UUID");
      expect(String(data.a)).equals(uuid.toString(), "should have the same content BSON.UUID");

      this.realm.write(() => (data.a = date));
      expect(typeof data.a === typeof date, "should be the same type Date");
      expect(String(data.a)).equals(date.toString(), "should have the same content Date");

      this.realm.write(() => (data.a = d128));
      expect(String(data.a)).equals(d128.toString(), "Should be the same BSON.Decimal128");

      this.realm.write(() => (data.a = 12345678));
      expect(data.a).equals(12345678, "Should be the same 12345678");

      this.realm.write(() => (data.a = null));
      expect(data.a).equals(null);

      this.realm.write(() => (data.a = undefined));
      expect(data.a).equals(null);

      this.realm.write(() => (data.a = list));
      expect(data.a).to.be.instanceOf(Realm.List);
      expect((data.a as Realm.List<any>)[0]).equals(1);

      this.realm.write(() => (data.a = dictionary));
      expect(data.a).to.be.instanceOf(Realm.Dictionary);
      expect((data.a as Realm.Dictionary<any>).number).equals(1);
    });
  });

  describe("Nested types", () => {
    openRealmBefore({
      schema: [SingleSchema, VertexSchema, MixNestedSchema, MixedAndEmbeddedSchema, EmbeddedObjectSchema],
    });

    it("support nested types", function (this: RealmContext) {
      const obj1 = this.realm.write(() => {
        const r = this.realm.create<IVertex>(VertexSchema.name, { a: 1, b: 0, c: 0 });
        const r2 = this.realm.create<IVertex>(VertexSchema.name, { a: 0, b: 1, c: 0 });
        const r3 = this.realm.create<IVertex>(VertexSchema.name, { a: 0, b: 0, c: 1 });

        return this.realm.create<ISingle>(SingleSchema.name, { a: r, b: r2, c: r3, d: null });
      });

      expect((obj1.a as IVertex).a).equals(1, "Should be equal to 1");
      expect((obj1.a as IVertex).b).equals(0, "Should be equal 0");
      expect((obj1.a as IVertex).c).equals(0, "Should be equal 0");

      expect((obj1.b as IVertex).a).equals(0, "Should be equal 0");
      expect((obj1.b as IVertex).b).equals(1, "Should be equal 1");
      expect((obj1.b as IVertex).c).equals(0, "Should be equal 0");

      expect((obj1.c as IVertex).a).equals(0, "Should be equal 0");
      expect((obj1.c as IVertex).b).equals(0, "Should be equal 0");
      expect((obj1.c as IVertex).c).equals(1, "Should be equal 1");

      const obj2 = this.realm.write(() => {
        const r = this.realm.create(MixNestedSchema.name, { a: 0, b: -1 });
        const r1 = this.realm.create(MixNestedSchema.name, { a: 1, b: 0 });
        return this.realm.create<ISingle>(SingleSchema.name, { a: r, b: r1 });
      });

      expect((obj2.a as IVertex).a).equals(0, "Should be equal 0");
      expect((obj2.a as IVertex).b).equals(-1, "Should be equal -1");

      expect((obj2.b as IVertex).a).equals(1, "Should be equal 1");
      expect((obj2.b as IVertex).b).equals(0, "Should be equal 0");
    });

    it("throws if nested type is an embedded object", function (this: RealmContext) {
      this.realm.write(() => {
        // Create an object with an embedded object property.
        const { embeddedObject } = this.realm.create(MixedAndEmbeddedSchema.name, {
          mixedValue: null,
          embeddedObject: { value: 1 },
        });
        expect(embeddedObject).instanceOf(Realm.Object);

        // Create an object with the Mixed property being the embedded object.
        expect(() => this.realm.create(MixedAndEmbeddedSchema.name, { mixedValue: embeddedObject })).to.throw(
          "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
        );
      });
      const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
      // TODO: Length should equal 1 when this PR is merged: https://github.com/realm/realm-js/pull/6356
      // expect(objects.length).equals(1);
      expect(objects.length).equals(2);
      expect(objects[0].mixedValue).to.be.null;
    });
  });

  describe("Nullable types", () => {
    openRealmBefore({ schema: [MixedNullableSchema] });
    it("supports nullable types", function (this: RealmContext) {
      this.realm.write(() => this.realm.create(MixedNullableSchema.name, { nullable: undefined }));

      const value = this.realm.objects<IMixedNullable>(MixedNullableSchema.name)[0];
      this.realm.write(() => (value.nullable = null));
      this.realm.write(() => (value.nullable = undefined));

      this.realm.write(() => {
        value.nullable_list = [6, null, undefined, null, 5];
      });
      expect(value.nullable_list[0]).equals(6, "Should be equal 6");
      expect(value.nullable_list[1]).equals(null, "Should be equal null");
      expect(value.nullable_list[2]).equals(null, "Should be equal null");
      expect(value.nullable_list[3]).equals(null, "Should be equal null");
      expect(value.nullable_list[4]).equals(5, "Should be equal 5");
    });
  });

  describe("Collection types", () => {
    openRealmBeforeEach({
      schema: [
        MixedSchema,
        MixedAndEmbeddedSchema,
        MixedWithDefaultCollectionsSchema,
        CollectionsOfMixedSchema,
        EmbeddedObjectSchema,
      ],
    });

    function expectRealmList(value: unknown): asserts value is Realm.List<any> {
      expect(value).instanceOf(Realm.List);
    }

    function expectRealmDictionary(value: unknown): asserts value is Realm.Dictionary<any> {
      expect(value).instanceOf(Realm.Dictionary);
    }

    /**
     * Expects the provided value to be a {@link Realm.List} containing:
     * - All values in {@link primitiveTypesList}.
     * - The managed object of {@link unmanagedRealmObject}.
     * - If the provided value is not a leaf list, additionally:
     *   - A nested list with the same criteria.
     *   - A nested dictionary with the same criteria.
     */
    function expectListOfAllTypes(list: unknown) {
      expectRealmList(list);
      expect(list.length).to.be.greaterThanOrEqual(primitiveTypesList.length);

      let index = 0;
      for (const item of list) {
        if (item instanceof Realm.Object) {
          // @ts-expect-error Expecting `value` to exist.
          expect(item.value).equals(unmanagedRealmObject.value);
        } else if (item instanceof ArrayBuffer) {
          expectUint8Buffer(item);
        } else if (item instanceof Realm.List) {
          expectListOfAllTypes(item);
        } else if (item instanceof Realm.Dictionary) {
          expectDictionaryOfAllTypes(item);
        } else {
          expect(String(item)).equals(String(primitiveTypesList[index]));
        }
        index++;
      }
    }

    /**
     * Expects the provided value to be a {@link Realm.Dictionary} containing:
     * - All entries in {@link primitiveTypesDictionary}.
     * - Key `realmObject`: The managed object of {@link unmanagedRealmObject}.
     * - If the provided value is not a leaf dictionary, additionally:
     *   - Key `list`: A nested list with the same criteria.
     *   - Key `dictionary`: A nested dictionary with the same criteria.
     */
    function expectDictionaryOfAllTypes(dictionary: unknown) {
      expectRealmDictionary(dictionary);
      expect(Object.keys(dictionary)).to.include.members(Object.keys(primitiveTypesDictionary));

      for (const key in dictionary) {
        const value = dictionary[key];
        if (key === "realmObject") {
          expect(value).instanceOf(Realm.Object);
          expect(value.value).equals(unmanagedRealmObject.value);
        } else if (key === "uint8Buffer") {
          expectUint8Buffer(value);
        } else if (key === "list") {
          expectListOfAllTypes(value);
        } else if (key === "dictionary") {
          expectDictionaryOfAllTypes(value);
        } else {
          expect(String(value)).equals(String(primitiveTypesDictionary[key]));
        }
      }
    }

    /**
     * Expects the provided value to be a {@link Realm.List} containing:
     * - A `Realm.List` of:
     *   - A `Realm.List` of:
     *     - All values in {@link primitiveTypesList}.
     *     - The managed object of {@link unmanagedRealmObject}.
     */
    function expectListOfListsOfAllTypes(list: unknown) {
      expectRealmList(list);
      expect(list.length).equals(1);
      const [depth1] = list;
      expectRealmList(depth1);
      expect(depth1.length).equals(1);
      const [depth2] = depth1;
      expectListOfAllTypes(depth2);
    }

    /**
     * Expects the provided value to be a {@link Realm.List} containing:
     * - A `Realm.Dictionary` of:
     *   - Key `depth2`: A `Realm.Dictionary` of:
     *     - All entries in {@link primitiveTypesDictionary}.
     *     - Key `realmObject`: The managed object of {@link unmanagedRealmObject}.
     */
    function expectListOfDictionariesOfAllTypes(list: unknown) {
      expectRealmList(list);
      expect(list.length).equals(1);
      const [depth1] = list;
      expectRealmDictionary(depth1);
      expect(Object.keys(depth1).length).equals(1);
      const { depth2 } = depth1;
      expectDictionaryOfAllTypes(depth2);
    }

    /**
     * Expects the provided value to be a {@link Realm.Dictionary} containing:
     * - Key `depth1`: A `Realm.List` of:
     *   - A `Realm.List` of:
     *     - All values in {@link primitiveTypesList}.
     *     - The managed object of {@link unmanagedRealmObject}.
     */
    function expectDictionaryOfListsOfAllTypes(dictionary: unknown) {
      expectRealmDictionary(dictionary);
      expect(Object.keys(dictionary).length).equals(1);
      const { depth1 } = dictionary;
      expectRealmList(depth1);
      expect(depth1.length).equals(1);
      const [depth2] = depth1;
      expectListOfAllTypes(depth2);
    }

    /**
     * Expects the provided value to be a {@link Realm.Dictionary} containing:
     * - Key `depth1`: A `Realm.Dictionary` of:
     *   - Key `depth2`: A `Realm.Dictionary` of:
     *     - All entries in {@link primitiveTypesDictionary}.
     *     - Key `realmObject`: The managed object of {@link unmanagedRealmObject}.
     */
    function expectDictionaryOfDictionariesOfAllTypes(dictionary: unknown) {
      expectRealmDictionary(dictionary);
      expect(Object.keys(dictionary).length).equals(1);
      const { depth1 } = dictionary;
      expectRealmDictionary(depth1);
      expect(Object.keys(depth1).length).equals(1);
      const { depth2 } = depth1;
      expectDictionaryOfAllTypes(depth2);
    }

    function expectUint8Buffer(value: unknown) {
      expect(value).instanceOf(ArrayBuffer);
      expect([...new Uint8Array(value as ArrayBuffer)]).eql(uint8Values);
    }

    /**
     * @param realmObject A managed Realm object to include in each list and dictionary.
     */
    function getListOfCollectionsOfAllTypes(realmObject: Realm.Object<IMixedSchema>) {
      const leafList = [...primitiveTypesList, realmObject];
      const leafDictionary = { ...primitiveTypesDictionary, realmObject };

      return [
        ...leafList,
        [...leafList, [...leafList], { ...leafDictionary }],
        {
          ...leafDictionary,
          list: [...leafList],
          dictionary: { ...leafDictionary },
        },
      ];
    }

    /**
     * @param realmObject A managed Realm object to include in each list and dictionary.
     */
    function getDictionaryOfCollectionsOfAllTypes(realmObject: Realm.Object<IMixedSchema>) {
      const leafList = [...primitiveTypesList, realmObject];
      const leafDictionary = { ...primitiveTypesDictionary, realmObject };

      return {
        ...leafDictionary,
        list: [...leafList, [...leafList], { ...leafDictionary }],
        dictionary: {
          ...leafDictionary,
          list: [...leafList],
          dictionary: { ...leafDictionary },
        },
      } as Record<string, unknown>;
    }

    describe("CRUD operations", () => {
      describe("Create and access", () => {
        describe("List", () => {
          it("has all primitive types (input: JS Array)", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: [...primitiveTypesList, realmObject],
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectListOfAllTypes(list);
          });

          it("has all primitive types (input: Realm List)", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              // Create an object with a Realm List property type (i.e. not a Mixed type).
              const realmObjectWithList = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: [...primitiveTypesList, realmObject],
              });
              expectRealmList(realmObjectWithList.list);
              // Use the Realm List as the value for the Mixed property on a different object.
              return this.realm.create<IMixedSchema>(MixedSchema.name, { value: realmObjectWithList.list });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectListOfAllTypes(list);
          });

          it("has all primitive types (input: Default value)", function (this: RealmContext) {
            const { mixedWithDefaultList } = this.realm.write(() => {
              // Pass an empty object in order to use the default value from the schema.
              return this.realm.create<IMixedWithDefaultCollections>(MixedWithDefaultCollectionsSchema.name, {});
            });

            expect(this.realm.objects(MixedWithDefaultCollectionsSchema.name).length).equals(1);
            expectListOfAllTypes(mixedWithDefaultList);
          });

          it("has nested lists of all primitive types", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: [[[...primitiveTypesList, realmObject]]],
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectListOfListsOfAllTypes(list);
          });

          it("has nested dictionaries of all primitive types", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: [{ depth2: { ...primitiveTypesDictionary, realmObject } }],
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectListOfDictionariesOfAllTypes(list);
          });

          it("has mix of nested collections of all types", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: getListOfCollectionsOfAllTypes(realmObject),
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectListOfAllTypes(list);
          });

          it("inserts all primitive types via `push()`", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { value: [] });
            });
            expectRealmList(list);
            expect(list.length).equals(0);

            this.realm.write(() => {
              list.push(...primitiveTypesList);
              list.push(this.realm.create(MixedSchema.name, unmanagedRealmObject));
            });
            expectListOfAllTypes(list);
          });
        });

        describe("Dictionary", () => {
          it("has all primitive types (input: JS Object)", function (this: RealmContext) {
            const { createdWithProto, createdWithoutProto } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const createdWithProto = this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { ...primitiveTypesDictionary, realmObject },
              });
              const createdWithoutProto = this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: Object.assign(Object.create(null), {
                  ...primitiveTypesDictionary,
                  realmObject,
                }),
              });
              return { createdWithProto, createdWithoutProto };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(3);
            expectDictionaryOfAllTypes(createdWithProto.value);
            expectDictionaryOfAllTypes(createdWithoutProto.value);
          });

          it("has all primitive types (input: Realm Dictionary)", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              // Create an object with a Realm Dictionary property type (i.e. not a Mixed type).
              const realmObjectWithDictionary = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: { ...primitiveTypesDictionary, realmObject },
              });
              expectRealmDictionary(realmObjectWithDictionary.dictionary);
              // Use the Realm Dictionary as the value for the Mixed property on a different object.
              return this.realm.create<IMixedSchema>(MixedSchema.name, { value: realmObjectWithDictionary.dictionary });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectDictionaryOfAllTypes(dictionary);
          });

          it("has all primitive types (input: Default value)", function (this: RealmContext) {
            const { mixedWithDefaultDictionary } = this.realm.write(() => {
              // Pass an empty object in order to use the default value from the schema.
              return this.realm.create<IMixedWithDefaultCollections>(MixedWithDefaultCollectionsSchema.name, {});
            });

            expect(this.realm.objects(MixedWithDefaultCollectionsSchema.name).length).equals(1);
            expectDictionaryOfAllTypes(mixedWithDefaultDictionary);
          });

          it("can use the spread of embedded Realm object", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const { embeddedObject } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
                embeddedObject: { value: 1 },
              });
              expect(embeddedObject).instanceOf(Realm.Object);

              // Spread the embedded object in order to use its entries as a dictionary in Mixed.
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { ...embeddedObject },
              });
            });

            expectRealmDictionary(dictionary);
            expect(dictionary).deep.equals({ value: 1 });
          });

          it("can use the spread of custom non-Realm object", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              class CustomClass {
                constructor(public value: number) {}
              }
              const customObject = new CustomClass(1);

              // Spread the embedded object in order to use its entries as a dictionary in Mixed.
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { ...customObject },
              });
            });

            expectRealmDictionary(dictionary);
            expect(dictionary).deep.equals({ value: 1 });
          });

          it("has nested lists of all primitive types", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { depth1: [[...primitiveTypesList, realmObject]] },
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectDictionaryOfListsOfAllTypes(dictionary);
          });

          it("has nested dictionaries of all primitive types", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { depth1: { depth2: { ...primitiveTypesDictionary, realmObject } } },
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectDictionaryOfDictionariesOfAllTypes(dictionary);
          });

          it("has mix of nested collections of all types", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: getDictionaryOfCollectionsOfAllTypes(realmObject),
              });
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expectDictionaryOfAllTypes(dictionary);
          });

          it("inserts all primitive types via setter", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { value: {} });
            });
            expectRealmDictionary(dictionary);
            expect(Object.keys(dictionary).length).equals(0);

            this.realm.write(() => {
              for (const key in primitiveTypesDictionary) {
                dictionary[key] = primitiveTypesDictionary[key];
              }
              dictionary.realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
            });
            expectDictionaryOfAllTypes(dictionary);
          });

          it("inserts nested lists of all primitive types via setter", function (this: RealmContext) {
            const { dictionary, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { value: dictionary } = this.realm.create<IMixedSchema>(MixedSchema.name, { value: {} });
              return { dictionary, realmObject };
            });
            expectRealmDictionary(dictionary);
            expect(Object.keys(dictionary).length).equals(0);

            this.realm.write(() => {
              dictionary.depth1 = [[...primitiveTypesList, realmObject]];
            });
            expectDictionaryOfListsOfAllTypes(dictionary);
          });

          it("inserts nested dictionaries of all primitive types via setter", function (this: RealmContext) {
            const { dictionary, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { value: dictionary } = this.realm.create<IMixedSchema>(MixedSchema.name, { value: {} });
              return { dictionary, realmObject };
            });
            expectRealmDictionary(dictionary);
            expect(Object.keys(dictionary).length).equals(0);

            this.realm.write(() => {
              dictionary.depth1 = { depth2: { ...primitiveTypesDictionary, realmObject } };
            });
            expectDictionaryOfDictionariesOfAllTypes(dictionary);
          });

          it("inserts mix of nested collections of all types via setter", function (this: RealmContext) {
            const { dictionary, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { value: dictionary } = this.realm.create<IMixedSchema>(MixedSchema.name, { value: {} });
              return { dictionary, realmObject };
            });
            expectRealmDictionary(dictionary);
            expect(Object.keys(dictionary).length).equals(0);

            const unmanagedDictionary = getDictionaryOfCollectionsOfAllTypes(realmObject);
            this.realm.write(() => {
              for (const key in unmanagedDictionary) {
                dictionary[key] = unmanagedDictionary[key];
              }
            });
            expectDictionaryOfAllTypes(dictionary);
          });
        });
      });

      describe("Update", () => {
        describe("List", () => {
          it("updates top-level item to primitive via setter", function (this: RealmContext) {
            const { value: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: ["original", realmObject],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(2);
            expect(list[0]).equals("original");
            expect(list[1].value).equals("original");

            this.realm.write(() => {
              list[0] = "updated";
              list[1].value = "updated";
            });
            expect(list[0]).equals("updated");
            expect(list[1].value).equals("updated");

            this.realm.write(() => {
              list[0] = null;
              list[1] = null;
            });
            expect(list.length).equals(2);
            expect(list[0]).to.be.null;
            expect(list[1]).to.be.null;
          });

          it("updates top-level item to nested collections of all types via setter", function (this: RealmContext) {
            const { list, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { value: list } = this.realm.create<IMixedSchema>(MixedSchema.name, { value: ["original"] });
              return { list, realmObject };
            });
            expectRealmList(list);
            expect(list.length).equals(1);
            expect(list[0]).equals("original");

            this.realm.write(() => {
              list[0] = [[...primitiveTypesList, realmObject]];
            });
            expectListOfListsOfAllTypes(list);

            this.realm.write(() => {
              list[0] = { depth2: { ...primitiveTypesDictionary, realmObject } };
            });
            expectListOfDictionariesOfAllTypes(list);
          });
        });

        describe("Dictionary", () => {
          it("updates top-level entry to primitive via setter", function (this: RealmContext) {
            const { value: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                value: { string: "original", realmObject },
              });
            });
            expectRealmDictionary(dictionary);
            expect(Object.keys(dictionary).length).equals(2);
            expect(dictionary.string).equals("original");
            expect(dictionary.realmObject.value).equals("original");

            this.realm.write(() => {
              dictionary.string = "updated";
              dictionary.realmObject.value = "updated";
            });
            expect(dictionary.string).equals("updated");
            expect(dictionary.realmObject.value).equals("updated");

            this.realm.write(() => {
              dictionary.string = null;
              dictionary.realmObject = null;
            });
            expect(Object.keys(dictionary).length).equals(2);
            expect(dictionary.string).to.be.null;
            expect(dictionary.realmObject).to.be.null;
          });
        });
      });

      describe("Remove", () => {
        it("removes list items via `remove()`", function (this: RealmContext) {
          const { value: list } = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: ["original", realmObject],
            });
          });
          expectRealmList(list);
          expect(list.length).equals(2);

          this.realm.write(() => {
            list.remove(1);
          });
          expect(list.length).equals(1);
          expect(list[0]).equals("original");
        });

        it("removes dictionary entries via `remove()`", function (this: RealmContext) {
          const { value: dictionary } = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: { string: "original", realmObject },
            });
          });
          expectRealmDictionary(dictionary);
          expect(Object.keys(dictionary).length).equals(2);

          this.realm.write(() => {
            dictionary.remove("realmObject");
          });
          expect(Object.keys(dictionary).length).equals(1);
          expect(dictionary.string).equals("original");
          expect(dictionary.realmObject).to.be.undefined;
        });
      });
    });

    describe("Filtering", () => {
      it("filters by query path on list of all primitive types", function (this: RealmContext) {
        const expectedFilteredCount = 5;
        const mixedList = [...primitiveTypesList];
        const nonExistentValue = "nonExistentValue";

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { value: "not a list" });
          mixedList.push(this.realm.create(MixedSchema.name, { value: "not a list" }));

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { value: mixedList });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        let index = 0;
        for (const itemToMatch of mixedList) {
          // Objects with a list item that matches the `itemToMatch` at the GIVEN index.
          let filtered = objects.filtered(`value[${index}] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value[${index}] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          // Objects with a list item that matches the `itemToMatch` at ANY index.
          filtered = objects.filtered(`value[*] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value[*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          index++;
        }
      });

      it("filters by query path on dictionary of all primitive types", function (this: RealmContext) {
        const expectedFilteredCount = 5;
        const mixedDictionary = { ...primitiveTypesDictionary };
        const nonExistentValue = "nonExistentValue";
        const nonExistentKey = "nonExistentKey";

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { value: "not a dictionary" });
          mixedDictionary.realmObject = this.realm.create(MixedSchema.name, { value: "not a dictionary" });

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { value: mixedDictionary });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        const insertedValues = Object.values(mixedDictionary);

        for (const key in mixedDictionary) {
          const valueToMatch = mixedDictionary[key];

          // Objects with a dictionary value that matches the `valueToMatch` at the GIVEN key.
          let filtered = objects.filtered(`value['${key}'] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value['${key}'] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`value['${nonExistentKey}'] == $0`, valueToMatch);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`value.${key} == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value.${key} == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`value.${nonExistentKey} == $0`, valueToMatch);
          expect(filtered.length).equals(0);

          // Objects with a dictionary value that matches the `valueToMatch` at ANY key.
          filtered = objects.filtered(`value[*] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value[*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          // Objects with a dictionary containing a key that matches `key`.
          filtered = objects.filtered(`value.@keys == $0`, key);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value.@keys == $0`, nonExistentKey);
          expect(filtered.length).equals(0);

          // Objects with a dictionary with the key `key` matching any of the values inserted.
          filtered = objects.filtered(`value.${key} IN $0`, insertedValues);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`value.${key} IN $0`, [nonExistentValue]);
          expect(filtered.length).equals(0);
        }
      });
    });

    describe("Invalid operations", () => {
      it("throws when creating a set (input: JS Set)", function (this: RealmContext) {
        this.realm.write(() => {
          expect(() => this.realm.create(MixedSchema.name, { value: new Set() })).to.throw(
            "Using a Set as a Mixed value is not supported",
          );
        });

        const objects = this.realm.objects(MixedSchema.name);
        // TODO: Length should equal 0 when this PR is merged: https://github.com/realm/realm-js/pull/6356
        // expect(objects.length).equals(0);
        expect(objects.length).equals(1);
      });

      it("throws when creating a set (input: Realm Set)", function (this: RealmContext) {
        this.realm.write(() => {
          const { set } = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          expect(set).instanceOf(Realm.Set);
          expect(() => this.realm.create(MixedSchema.name, { value: set })).to.throw(
            "Using a RealmSet as a Mixed value is not supported",
          );
        });

        const objects = this.realm.objects(MixedSchema.name);
        // TODO: Length should equal 0 when this PR is merged: https://github.com/realm/realm-js/pull/6356
        // expect(objects.length).equals(0);
        expect(objects.length).equals(1);
      });

      it("throws when updating a list item to a set", function (this: RealmContext) {
        const { set, list } = this.realm.write(() => {
          const realmObjectWithSet = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          const realmObjectWithMixed = this.realm.create<IMixedSchema>(MixedSchema.name, { value: ["original"] });
          return { set: realmObjectWithSet.set, list: realmObjectWithMixed.value };
        });
        expectRealmList(list);
        expect(list[0]).equals("original");

        this.realm.write(() => {
          expect(() => (list[0] = new Set())).to.throw("Using a Set as a Mixed value is not supported");
          expect(() => (list[0] = set)).to.throw("Using a RealmSet as a Mixed value is not supported");
        });
        expect(list[0]).equals("original");
      });

      it("throws when updating a dictionary entry to a set", function (this: RealmContext) {
        const { set, dictionary } = this.realm.write(() => {
          const realmObjectWithSet = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          const realmObjectWithMixed = this.realm.create<IMixedSchema>(MixedSchema.name, {
            value: { string: "original" },
          });
          return { set: realmObjectWithSet.set, dictionary: realmObjectWithMixed.value };
        });
        expectRealmDictionary(dictionary);
        expect(dictionary.string).equals("original");

        this.realm.write(() => {
          expect(() => (dictionary.string = new Set())).to.throw("Using a Set as a Mixed value is not supported");
          expect(() => (dictionary.string = set)).to.throw("Using a RealmSet as a Mixed value is not supported");
        });
        expect(dictionary.string).equals("original");
      });

      it("throws when creating a list or dictionary with an embedded object", function (this: RealmContext) {
        this.realm.write(() => {
          // Create an object with an embedded object property.
          const { embeddedObject } = this.realm.create(MixedAndEmbeddedSchema.name, {
            embeddedObject: { value: 1 },
          });
          expect(embeddedObject).instanceOf(Realm.Object);

          // Create two objects with the Mixed property (`value`) being a list and
          // dictionary (respectively) containing the reference to the embedded object.
          expect(() => this.realm.create(MixedAndEmbeddedSchema.name, { mixedValue: [embeddedObject] })).to.throw(
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
          expect(() => this.realm.create(MixedAndEmbeddedSchema.name, { mixedValue: { embeddedObject } })).to.throw(
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
        });
        const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
        // TODO: Length should equal 1 when this PR is merged: https://github.com/realm/realm-js/pull/6356
        // expect(objects.length).equals(1);
        expect(objects.length).equals(3);
      });

      it("throws when setting a list or dictionary item to an embedded object", function (this: RealmContext) {
        this.realm.write(() => {
          // Create an object with an embedded object property.
          const { embeddedObject } = this.realm.create(MixedAndEmbeddedSchema.name, {
            embeddedObject: { value: 1 },
          });
          expect(embeddedObject).instanceOf(Realm.Object);

          // Create two objects with the Mixed property (`value`)
          // being an empty list and dictionary (respectively).
          const { mixedValue: list } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
            mixedValue: [],
          });
          expectRealmList(list);

          const { mixedValue: dictionary } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
            mixedValue: {},
          });
          expectRealmDictionary(dictionary);

          expect(() => (list[0] = embeddedObject)).to.throw(
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
          expect(
            () => (dictionary.prop = embeddedObject),
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
        });
        const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
        expect(objects.length).equals(3);
        // Check that the list and dictionary are still empty.
        expect((objects[1].mixedValue as Realm.List<any>).length).equals(0);
        expect(Object.keys(objects[2].mixedValue as Realm.Dictionary<any>).length).equals(0);
      });

      it("throws when setting a list or dictionary outside a transaction", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { value: "original" });
        });
        expect(created.value).equals("original");
        expect(() => (created.value = ["a list item"])).to.throw(
          "Cannot modify managed objects outside of a write transaction",
        );
        expect(() => (created.value = { key: "a dictionary value" })).to.throw(
          "Cannot modify managed objects outside of a write transaction",
        );
        expect(created.value).equals("original");
      });

      it("throws when setting a list item out of bounds", function (this: RealmContext) {
        const { value: list } = this.realm.write(() => {
          // Create an empty list as the Mixed value.
          return this.realm.create<IMixedSchema>(MixedSchema.name, { value: [] });
        });
        expectRealmList(list);
        expect(list.length).equals(0);

        expect(() => {
          this.realm.write(() => {
            list[0] = "primitive";
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.value' when empty");

        expect(() => {
          this.realm.write(() => {
            list[0] = [];
          });
        }).to.throw("Requested index 0 calling set_collection() on list 'MixedClass.value' when empty");

        expect(() => {
          this.realm.write(() => {
            list[0] = {};
          });
        }).to.throw("Requested index 0 calling set_collection() on list 'MixedClass.value' when empty");
      });

      it("invalidates the list when removed", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { value: [1] });
        });
        const list = created.value;
        expectRealmList(list);

        this.realm.write(() => {
          created.value = null;
        });
        expect(created.value).to.be.null;
        expect(() => list[0]).to.throw("List is no longer valid");
      });

      it("invalidates the dictionary when removed", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { value: { prop: 1 } });
        });
        const dictionary = created.value;
        expectRealmDictionary(dictionary);

        this.realm.write(() => {
          created.value = null;
        });
        expect(created.value).to.be.null;
        expect(() => dictionary.prop).to.throw("This collection is no more");
      });

      it("throws when exceeding the max nesting level", function (this: RealmContext) {
        // If `REALM_DEBUG`, the max nesting level is 4.
        expect(() => {
          this.realm.write(() => {
            this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: [1, [2, [3, [4, [5]]]]],
            });
          });
        }).to.throw("Max nesting level reached");

        expect(() => {
          this.realm.write(() => {
            this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: { depth1: { depth2: { depth3: { depth4: { depth5: "value" } } } } },
            });
          });
        }).to.throw("Max nesting level reached");
      });
    });
  });

  describe("Typed arrays in Mixed", () => {
    openRealmBeforeEach({ schema: [MixedSchema] });

    it("supports datatypes with binary data contents", function (this: RealmContext) {
      const uint8Values1 = [0, 1, 2, 4, 8];
      const uint8Values2 = [255, 128, 64, 32, 16, 8];
      const uint8Buffer1 = new Uint8Array(uint8Values1).buffer;
      const uint8Buffer2 = new Uint8Array(uint8Values2).buffer;
      this.realm.write(() => {
        this.realm.create("MixedClass", { value: uint8Buffer1 });
      });
      let mixedObjects = this.realm.objects<IMixedSchema>("MixedClass");
      let returnedData = [...new Uint8Array(mixedObjects[0].value as Iterable<number>)];
      expect(returnedData).eql(uint8Values1);

      this.realm.write(() => {
        mixedObjects[0].value = uint8Buffer2;
      });

      mixedObjects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint8Array(mixedObjects[0].value as Iterable<number>)];
      expect(returnedData).eql(uint8Values2);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // Test with empty array
      this.realm.write(() => {
        this.realm.create<IMixedSchema>("MixedClass", { value: new Uint8Array(0) });
      });

      const emptyArrayBuffer = mixedObjects[0].value;
      expect(emptyArrayBuffer).instanceOf(ArrayBuffer);
      expect((emptyArrayBuffer as ArrayBuffer).byteLength).equals(0);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // test with 16-bit values
      const uint16Values = [0, 512, 256, 65535];
      const uint16Buffer = new Uint16Array(uint16Values).buffer;
      this.realm.write(() => {
        this.realm.create("MixedClass", { value: uint16Buffer });
      });

      const uint16Objects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint16Array(uint16Objects[0].value as Iterable<number>)];
      expect(returnedData).eql(uint16Values);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // test with 32-bit values
      const uint32Values = [0, 121393, 121393, 317811, 514229, 4294967295];
      const uint32Buffer = new Uint32Array(uint32Values).buffer;
      this.realm.write(() => {
        this.realm.create("MixedClass", { value: uint32Buffer });
      });

      const uint32Objects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint32Array(uint32Objects[0].value as Iterable<number>)];
      expect(returnedData).eql(uint32Values);

      this.realm.close();
    });
  });
});
