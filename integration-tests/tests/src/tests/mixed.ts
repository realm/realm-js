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
  mixed: Realm.Mixed;
}

interface IMixedAndEmbedded {
  mixed: Realm.Mixed;
  embeddedObject: { mixed: Realm.Mixed };
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
    mixed: "mixed",
  },
};

const MixedAndEmbeddedSchema: ObjectSchema = {
  name: "MixedAndEmbedded",
  properties: {
    mixed: "mixed",
    embeddedObject: "EmbeddedObject?",
  },
};

const EmbeddedObjectSchema: ObjectSchema = {
  name: "EmbeddedObject",
  embedded: true,
  properties: {
    mixed: "mixed",
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
const int = BigInt(123);
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
const unmanagedRealmObject: IMixedSchema = { mixed: 1 };

/**
 * An array of values representing each Realm data type allowed as `Mixed`,
 * except for a managed Realm Object, a nested list, and a nested dictionary.
 */
const primitiveTypesList: readonly unknown[] = [
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
];

/**
 * An object with values representing each Realm data type allowed as `Mixed`,
 * except for a managed Realm Object, a nested list, and a nested dictionary.
 */
const primitiveTypesDictionary: Readonly<Record<string, unknown>> = {
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
      // Create an object with an embedded object property.
      const { embeddedObject } = this.realm.write(() => {
        return this.realm.create(MixedAndEmbeddedSchema.name, {
          mixed: null,
          embeddedObject: { mixed: 1 },
        });
      });
      expect(embeddedObject).instanceOf(Realm.Object);

      // Create an object with the Mixed property being the embedded object.
      expect(() => {
        this.realm.write(() => {
          this.realm.create(MixedAndEmbeddedSchema.name, { mixed: embeddedObject });
        });
      }).to.throw("Using an embedded object (EmbeddedObject) as a Mixed value is not supported");

      const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].mixed).to.be.null;
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

    function expectRealmList(value: unknown): asserts value is Realm.List<unknown> {
      expect(value).instanceOf(Realm.List);
    }

    function expectRealmDictionary(value: unknown): asserts value is Realm.Dictionary<unknown> {
      expect(value).instanceOf(Realm.Dictionary);
    }

    function expectRealmResults(value: unknown): asserts value is Realm.Results<unknown> {
      expect(value).instanceOf(Realm.Results);
    }

    /**
     * Expects the provided value to contain:
     * - All values in {@link primitiveTypesList}.
     * - Optionally the managed object of {@link unmanagedRealmObject}.
     * - If the provided value is not a leaf list, additionally:
     *   - A nested list with the same criteria.
     *   - A nested dictionary with the same criteria.
     */
    function expectOrderedCollectionOfAllTypes(collection: Realm.List | Realm.Results) {
      expect(collection.length).greaterThanOrEqual(primitiveTypesList.length);

      let index = 0;
      for (const item of collection) {
        if (item instanceof Realm.Object) {
          // @ts-expect-error Expecting `mixed` to exist.
          expect(item.mixed).equals(unmanagedRealmObject.mixed);
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
     * Expects the provided value to be a {@link Realm.List} containing
     * items with the same criteria as {@link expectOrderedCollectionOfAllTypes}.
     */
    function expectListOfAllTypes(list: unknown): asserts list is Realm.List<unknown> {
      expectRealmList(list);
      expectOrderedCollectionOfAllTypes(list);
    }

    /**
     * Expects the provided value to be a {@link Realm.Results} containing
     * items with the same criteria as {@link expectOrderedCollectionOfAllTypes}.
     */
    function expectResultsOfAllTypes(results: unknown): asserts results is Realm.Results<unknown> {
      expectRealmResults(results);
      expectOrderedCollectionOfAllTypes(results);
    }

    /**
     * Expects the provided value to be a {@link Realm.Dictionary} containing:
     * - All entries in {@link primitiveTypesDictionary}.
     * - Optional key `realmObject`: The managed object of {@link unmanagedRealmObject}.
     * - If the provided value is not a leaf dictionary, additionally:
     *   - Key `list`: A nested list with the same criteria.
     *   - Key `dictionary`: A nested dictionary with the same criteria.
     */
    function expectDictionaryOfAllTypes(dictionary: unknown): asserts dictionary is Realm.Dictionary<unknown> {
      expectRealmDictionary(dictionary);
      expect(Object.keys(dictionary)).to.include.members(Object.keys(primitiveTypesDictionary));

      for (const key in dictionary) {
        const value = dictionary[key];
        if (key === "realmObject") {
          expect(value).instanceOf(Realm.Object);
          // @ts-expect-error Expecting `mixed` to exist.
          expect(value.mixed).equals(unmanagedRealmObject.mixed);
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
    function expectListOfListsOfAllTypes(list: unknown): asserts list is Realm.List<unknown> {
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
    function expectListOfDictionariesOfAllTypes(list: unknown): asserts list is Realm.List<unknown> {
      expectRealmList(list);
      expect(list.length).equals(1);
      const [depth1] = list;
      expectRealmDictionary(depth1);
      expectKeys(depth1, ["depth2"]);
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
    function expectDictionaryOfListsOfAllTypes(dictionary: unknown): asserts dictionary is Realm.Dictionary<unknown> {
      expectRealmDictionary(dictionary);
      expectKeys(dictionary, ["depth1"]);
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
    function expectDictionaryOfDictionariesOfAllTypes(
      dictionary: unknown,
    ): asserts dictionary is Realm.Dictionary<unknown> {
      expectRealmDictionary(dictionary);
      expectKeys(dictionary, ["depth1"]);
      const { depth1 } = dictionary;
      expectRealmDictionary(depth1);
      expectKeys(depth1, ["depth2"]);
      const { depth2 } = depth1;
      expectDictionaryOfAllTypes(depth2);
    }

    function expectUint8Buffer(value: unknown): asserts value is ArrayBuffer {
      expect(value).instanceOf(ArrayBuffer);
      expect([...new Uint8Array(value as ArrayBuffer)]).eql(uint8Values);
    }

    /**
     * Builds an unmanaged list containing:
     * - All values in {@link primitiveTypesList}.
     * - For each depth except the last, additionally:
     *   - A nested list with the same criteria.
     *   - A nested dictionary with the same criteria.
     */
    function buildListOfCollectionsOfAllTypes({ depth, list = [] }: { depth: number; list?: unknown[] }) {
      expect(depth).greaterThan(0);
      expect(list.length).equals(0);

      list.push(...primitiveTypesList);
      if (depth > 1) {
        list.push(buildListOfCollectionsOfAllTypes({ depth: depth - 1 }));
        list.push(buildDictionaryOfCollectionsOfAllTypes({ depth: depth - 1 }));
      }

      return list;
    }

    /**
     * Builds an unmanaged dictionary containing:
     * - All entries in {@link primitiveTypesDictionary}.
     * - For each depth except the last, additionally:
     *   - Key `list`: A nested list with the same criteria.
     *   - Key `dictionary`: A nested dictionary with the same criteria.
     */
    function buildDictionaryOfCollectionsOfAllTypes({
      depth,
      dictionary = {},
    }: {
      depth: number;
      dictionary?: Record<string, unknown>;
    }) {
      expect(depth).greaterThan(0);
      expect(Object.keys(dictionary).length).equals(0);

      Object.assign(dictionary, primitiveTypesDictionary);
      if (depth > 1) {
        dictionary.list = buildListOfCollectionsOfAllTypes({ depth: depth - 1 });
        dictionary.dictionary = buildDictionaryOfCollectionsOfAllTypes({ depth: depth - 1 });
      }

      return dictionary;
    }

    function expectKeys(dictionary: Realm.Dictionary, keys: string[]) {
      expect(Object.keys(dictionary)).members(keys);
    }

    describe("CRUD operations", () => {
      describe("Create and access", () => {
        describe("List", () => {
          it("has all primitive types (input: JS Array)", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [...primitiveTypesList, realmObject];

              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedList,
              }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              }).list;

              return { list1, list2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectListOfAllTypes(list1);
            expectListOfAllTypes(list2);
          });

          it("has all primitive types (input: Realm List)", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [...primitiveTypesList, realmObject];

              // Create an object with a Realm List property type (i.e. not a Mixed type).
              const listToInsert = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              }).list;
              expectRealmList(listToInsert);

              // Use the Realm List as the value for the Mixed property on a different object.
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: listToInsert }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: listToInsert,
              }).list;

              return { list1, list2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(2);
            expectListOfAllTypes(list1);
            expectListOfAllTypes(list2);
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
            const { list1, list2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [[[...primitiveTypesList, realmObject]]];

              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              }).list;

              return { list1, list2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectListOfListsOfAllTypes(list1);
            expectListOfListsOfAllTypes(list2);
          });

          it("has nested dictionaries of all primitive types", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [{ depth2: { ...primitiveTypesDictionary, realmObject } }];

              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              }).list;

              return { list1, list2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectListOfDictionariesOfAllTypes(list1);
            expectListOfDictionariesOfAllTypes(list2);
          });

          it("has mix of nested collections of all types", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const unmanagedList = buildListOfCollectionsOfAllTypes({ depth: 4 });

              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              }).list;

              return { list1, list2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(1);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectListOfAllTypes(list1);
            expectListOfAllTypes(list2);
          });

          it("inserts all primitive types via `push()`", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, { list: [] }).list;

              return { list1, list2 };
            });
            expectRealmList(list1);
            expectRealmList(list2);
            expect(list1.length).equals(0);
            expect(list2.length).equals(0);

            this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              list1.push(...primitiveTypesList, realmObject);
              list2.push(...primitiveTypesList, realmObject);
            });
            expectListOfAllTypes(list1);
            expectListOfAllTypes(list2);
          });

          it("inserts nested lists of all primitive types via `push()`", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, { list: [] }).list;

              return { list1, list2 };
            });
            expectRealmList(list1);
            expectRealmList(list2);
            expect(list1.length).equals(0);
            expect(list2.length).equals(0);

            this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [[...primitiveTypesList, realmObject]];

              list1.push(unmanagedList);
              list2.push(unmanagedList);
            });
            expectListOfListsOfAllTypes(list1);
            expectListOfListsOfAllTypes(list2);
          });

          it("inserts nested dictionaries of all primitive types via `push()`", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, { list: [] }).list;

              return { list1, list2 };
            });
            expectRealmList(list1);
            expectRealmList(list2);
            expect(list1.length).equals(0);
            expect(list2.length).equals(0);

            this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = { depth2: { ...primitiveTypesDictionary, realmObject } };

              list1.push(unmanagedDictionary);
              list2.push(unmanagedDictionary);
            });
            expectListOfDictionariesOfAllTypes(list1);
            expectListOfDictionariesOfAllTypes(list2);
          });

          it("inserts mix of nested collections of all types via `push()`", function (this: RealmContext) {
            const { list1, list2 } = this.realm.write(() => {
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, { list: [] }).list;

              return { list1, list2 };
            });
            expectRealmList(list1);
            expectRealmList(list2);
            expect(list1.length).equals(0);
            expect(list2.length).equals(0);

            const unmanagedList = buildListOfCollectionsOfAllTypes({ depth: 4 });
            this.realm.write(() => {
              for (const item of unmanagedList) {
                list1.push(item);
                list2.push(item);
              }
            });
            expectListOfAllTypes(list1);
            expectListOfAllTypes(list2);
          });

          it("returns different reference for each access", function (this: RealmContext) {
            const unmanagedList: unknown[] = [];
            const { created1, created2 } = this.realm.write(() => {
              const created1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList });
              const created2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: unmanagedList,
              });

              return { created1, created2 };
            });
            expectRealmList(created1.mixed);
            expectRealmList(created2.list);

            // @ts-expect-error Testing different types.
            expect(created1.mixed === unmanagedList).to.be.false;
            expect(created1.mixed === created1.mixed).to.be.false;
            expect(Object.is(created1.mixed, created1.mixed)).to.be.false;

            // @ts-expect-error Testing different types.
            expect(created2.list === unmanagedList).to.be.false;
            expect(created2.list === created2.list).to.be.false;
            expect(Object.is(created2.list, created2.list)).to.be.false;

            const { list1, list2 } = this.realm.write(() => {
              const list1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [unmanagedList] }).mixed;
              const list2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                list: [unmanagedList],
              }).list;

              return { list1, list2 };
            });
            expectRealmList(list1);
            expectRealmList(list2);

            expect(list1[0] === unmanagedList).to.be.false;
            expect(list1[0] === list1[0]).to.be.false;
            expect(Object.is(list1[0], list1[0])).to.be.false;

            expect(list2[0] === unmanagedList).to.be.false;
            expect(list2[0] === list2[0]).to.be.false;
            expect(Object.is(list2[0], list2[0])).to.be.false;
          });
        });

        describe("Dictionary", () => {
          it("has all primitive types (input: JS Object)", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = { ...primitiveTypesDictionary, realmObject };

              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedDictionary,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("has all primitive types (input: JS Object w/o proto)", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = Object.assign(Object.create(null), {
                ...primitiveTypesDictionary,
                realmObject,
              });

              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedDictionary,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("has all primitive types (input: Realm Dictionary)", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);

              // Create an object with a Realm Dictionary property type (i.e. not a Mixed type).
              const dictionaryToInsert = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: { ...primitiveTypesDictionary, realmObject },
              }).dictionary;
              expectRealmDictionary(dictionaryToInsert);

              // Use the Realm Dictionary as the value for the Mixed property on a different object.
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: dictionaryToInsert,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: dictionaryToInsert,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(2);
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
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
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const { embeddedObject } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
                embeddedObject: { mixed: 1 },
              });
              expect(embeddedObject).instanceOf(Realm.Object);

              // Spread the embedded object in order to use its entries as a dictionary in Mixed.
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { ...embeddedObject },
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: { ...embeddedObject },
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedAndEmbeddedSchema.name).length).equals(1);
            expect(this.realm.objects(MixedSchema.name).length).equals(1);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(dictionary1).deep.equals({ mixed: 1 });
            expect(dictionary2).deep.equals({ mixed: 1 });
          });

          it("can use the spread of custom non-Realm object", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              class CustomClass {
                constructor(public value: number) {}
              }
              const customObject = new CustomClass(1);

              // Spread the custom object in order to use its entries as a dictionary in Mixed.
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { ...customObject },
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: { ...customObject },
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(1);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(dictionary1).deep.equals({ value: 1 });
            expect(dictionary2).deep.equals({ value: 1 });
          });

          it("has nested lists of all primitive types", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = { depth1: [[...primitiveTypesList, realmObject]] };

              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedDictionary,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectDictionaryOfListsOfAllTypes(dictionary1);
            expectDictionaryOfListsOfAllTypes(dictionary2);
          });

          it("has nested dictionaries of all primitive types", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = { depth1: { depth2: { ...primitiveTypesDictionary, realmObject } } };

              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedDictionary,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(2);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectDictionaryOfDictionariesOfAllTypes(dictionary1);
            expectDictionaryOfDictionariesOfAllTypes(dictionary2);
          });

          it("has mix of nested collections of all types", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const unmanagedDictionary = buildDictionaryOfCollectionsOfAllTypes({ depth: 4 });

              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: unmanagedDictionary,
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              }).dictionary;

              return { dictionary1, dictionary2 };
            });

            expect(this.realm.objects(MixedSchema.name).length).equals(1);
            expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(1);
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("inserts all primitive types via setter", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: {} }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: {},
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(Object.keys(dictionary1).length).equals(0);
            expect(Object.keys(dictionary2).length).equals(0);

            this.realm.write(() => {
              for (const key in primitiveTypesDictionary) {
                const value = primitiveTypesDictionary[key];
                dictionary1[key] = value;
                dictionary2[key] = value;
              }
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              dictionary1.realmObject = realmObject;
              dictionary2.realmObject = realmObject;
            });
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("inserts nested lists of all primitive types via setter", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: {} }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: {},
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(Object.keys(dictionary1).length).equals(0);
            expect(Object.keys(dictionary2).length).equals(0);

            this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedList = [[...primitiveTypesList, realmObject]];

              dictionary1.depth1 = unmanagedList;
              dictionary2.depth1 = unmanagedList;
            });
            expectDictionaryOfListsOfAllTypes(dictionary1);
            expectDictionaryOfListsOfAllTypes(dictionary2);
          });

          it("inserts nested dictionaries of all primitive types via setter", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: {} }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: {},
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(Object.keys(dictionary1).length).equals(0);
            expect(Object.keys(dictionary2).length).equals(0);

            this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const unmanagedDictionary = { depth2: { ...primitiveTypesDictionary, realmObject } };

              dictionary1.depth1 = unmanagedDictionary;
              dictionary2.depth1 = unmanagedDictionary;
            });
            expectDictionaryOfDictionariesOfAllTypes(dictionary1);
            expectDictionaryOfDictionariesOfAllTypes(dictionary2);
          });

          it("inserts mix of nested collections of all types via setter", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: {} }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: {},
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(Object.keys(dictionary1).length).equals(0);
            expect(Object.keys(dictionary2).length).equals(0);

            const unmanagedDictionary = buildDictionaryOfCollectionsOfAllTypes({ depth: 4 });
            this.realm.write(() => {
              for (const key in unmanagedDictionary) {
                const value = unmanagedDictionary[key];
                dictionary1[key] = value;
                dictionary2[key] = value;
              }
            });
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("inserts mix of nested collections of all types via `set()` overloads", function (this: RealmContext) {
            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: {} }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: {},
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);
            expect(Object.keys(dictionary1).length).equals(0);
            expect(Object.keys(dictionary2).length).equals(0);

            const unmanagedDictionary = buildDictionaryOfCollectionsOfAllTypes({ depth: 4 });
            this.realm.write(() => {
              dictionary1.set(unmanagedDictionary);
              dictionary2.set(unmanagedDictionary);
            });
            expectDictionaryOfAllTypes(dictionary1);
            expectDictionaryOfAllTypes(dictionary2);
          });

          it("returns different reference for each access", function (this: RealmContext) {
            const unmanagedDictionary: Record<string, unknown> = {};
            const { created1, created2 } = this.realm.write(() => {
              const created1 = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedDictionary });
              const created2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: unmanagedDictionary,
              });

              return { created1, created2 };
            });
            expectRealmDictionary(created1.mixed);
            expectRealmDictionary(created2.dictionary);

            expect(created1.mixed === unmanagedDictionary).to.be.false;
            expect(created1.mixed === created1.mixed).to.be.false;
            expect(Object.is(created1.mixed, created1.mixed)).to.be.false;

            expect(created2.dictionary === unmanagedDictionary).to.be.false;
            expect(created2.dictionary === created2.dictionary).to.be.false;
            expect(Object.is(created2.dictionary, created2.dictionary)).to.be.false;

            const { dictionary1, dictionary2 } = this.realm.write(() => {
              const dictionary1 = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { key: unmanagedDictionary },
              }).mixed;
              const dictionary2 = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
                dictionary: { key: unmanagedDictionary },
              }).dictionary;

              return { dictionary1, dictionary2 };
            });
            expectRealmDictionary(dictionary1);
            expectRealmDictionary(dictionary2);

            expect(dictionary1.key === unmanagedDictionary).to.be.false;
            expect(dictionary1.key === dictionary1.key).to.be.false;
            expect(Object.is(dictionary1.key, dictionary1.key)).to.be.false;

            expect(dictionary2.key === unmanagedDictionary).to.be.false;
            expect(dictionary2.key === dictionary2.key).to.be.false;
            expect(Object.is(dictionary2.key, dictionary2.key)).to.be.false;
          });
        });

        describe("Results", () => {
          describe("from List", () => {
            describe("snapshot()", () => {
              it("has all primitive types", function (this: RealmContext) {
                const { mixed: list } = this.realm.write(() => {
                  const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
                  const unmanagedList = [...primitiveTypesList, realmObject];
                  return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList });
                });
                expectRealmList(list);
                expectResultsOfAllTypes(list.snapshot());
              });

              it("has mix of nested collections of all types", function (this: RealmContext) {
                const { mixed: list } = this.realm.write(() => {
                  const unmanagedList = buildListOfCollectionsOfAllTypes({ depth: 4 });
                  return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList });
                });
                expectRealmList(list);
                expectResultsOfAllTypes(list.snapshot());
              });
            });

            describe("objects().filtered()", () => {
              it("has all primitive types", function (this: RealmContext) {
                this.realm.write(() => {
                  const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
                  const unmanagedList = [...primitiveTypesList, realmObject];
                  this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList });
                });

                const results = this.realm.objects<IMixedSchema>(MixedSchema.name);
                expectRealmResults(results);
                expect(results.length).equals(2);

                const list = results[1].mixed;
                expectListOfAllTypes(list);
              });

              it("has mix of nested collections of all types", function (this: RealmContext) {
                this.realm.write(() => {
                  const unmanagedList = buildListOfCollectionsOfAllTypes({ depth: 4 });
                  this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedList });
                });

                const results = this.realm.objects<IMixedSchema>(MixedSchema.name);
                expectRealmResults(results);
                expect(results.length).equals(1);

                const list = results[0].mixed;
                expectListOfAllTypes(list);
              });
            });
          });

          describe("from Dictionary", () => {
            describe("objects().filtered()", () => {
              it("has all primitive types", function (this: RealmContext) {
                this.realm.write(() => {
                  const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
                  const unmanagedDictionary = { ...primitiveTypesDictionary, realmObject };
                  this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedDictionary });
                });

                const results = this.realm.objects<IMixedSchema>(MixedSchema.name);
                expectRealmResults(results);
                expect(results.length).equals(2);

                const dictionary = results[1].mixed;
                expectDictionaryOfAllTypes(dictionary);
              });

              it("has mix of nested collections of all types", function (this: RealmContext) {
                this.realm.write(() => {
                  const unmanagedDictionary = buildDictionaryOfCollectionsOfAllTypes({ depth: 4 });
                  this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: unmanagedDictionary });
                });

                const results = this.realm.objects<IMixedSchema>(MixedSchema.name);
                expectRealmResults(results);
                expect(results.length).equals(1);

                const dictionary = results[0].mixed;
                expectDictionaryOfAllTypes(dictionary);
              });
            });
          });
        });
      });

      describe("Update", () => {
        describe("List", () => {
          it("updates top-level item via setter", function (this: RealmContext) {
            const { list, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { mixed: list } = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original"] });
              return { list, realmObject };
            });
            expectRealmList(list);
            expect(list.length).equals(1);
            expect(list[0]).equals("original");

            this.realm.write(() => {
              list[0] = "updated";
            });
            expect(list.length).equals(1);
            expect(list[0]).equals("updated");

            this.realm.write(() => {
              list[0] = null;
            });
            expect(list.length).equals(1);
            expect(list[0]).to.be.null;

            this.realm.write(() => {
              list[0] = [[...primitiveTypesList, realmObject]];
            });
            expectListOfListsOfAllTypes(list);

            this.realm.write(() => {
              list[0] = { depth2: { ...primitiveTypesDictionary, realmObject } };
            });
            expectListOfDictionariesOfAllTypes(list);
          });

          it("updates nested item via setter", function (this: RealmContext) {
            const { list, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { mixed: list } = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [["original"]] });
              return { list, realmObject };
            });
            expectRealmList(list);
            const [nestedList] = list;
            expectRealmList(nestedList);
            expect(nestedList.length).equals(1);
            expect(nestedList[0]).equals("original");

            this.realm.write(() => {
              nestedList[0] = "updated";
            });
            expect(nestedList.length).equals(1);
            expect(nestedList[0]).equals("updated");

            this.realm.write(() => {
              nestedList[0] = null;
            });
            expect(nestedList.length).equals(1);
            expect(nestedList[0]).to.be.null;

            this.realm.write(() => {
              nestedList[0] = [[...primitiveTypesList, realmObject]];
            });
            expectListOfListsOfAllTypes(nestedList);

            this.realm.write(() => {
              nestedList[0] = { depth2: { ...primitiveTypesDictionary, realmObject } };
            });
            expectListOfDictionariesOfAllTypes(nestedList);
          });

          it("updates itself to a new list", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original1", "original2"] });
            });
            let list = created.mixed;
            expectRealmList(list);
            expect(list.length).equals(2);
            expect(list[0]).equals("original1");
            expect(list[1]).equals("original2");

            this.realm.write(() => {
              created.mixed = ["updated"];
            });
            list = created.mixed;
            expectRealmList(list);
            expect(list.length).equals(1);
            expect(list[0]).equals("updated");
          });

          it("updates nested list to a new list", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [["original1", "original2"]],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(1);

            let nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);
            expect(nestedList[0]).equals("original1");
            expect(nestedList[1]).equals("original2");

            this.realm.write(() => {
              list[0] = ["updated"];
            });
            nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(1);
            expect(nestedList[0]).equals("updated");
          });

          it("does not become invalidated when updated to a new list", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original"] });
            });
            const list = created.mixed;
            expectRealmList(list);

            this.realm.write(() => {
              created.mixed = ["updated"];
            });
            // Accessing `list` should not throw.
            expect(list[0]).equals("updated");
          });

          // TODO: Enable when self-assignment is solved (https://github.com/realm/realm-core/issues/7422).
          it.skip("self assigns", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original1", "original2"] });
            });
            let list = created.mixed;
            expectRealmList(list);
            expect(list.length).equals(2);
            expect(list[0]).equals("original1");
            expect(list[1]).equals("original2");

            this.realm.write(() => {
              /* eslint-disable-next-line no-self-assign */
              created.mixed = created.mixed;
            });
            list = created.mixed;
            expectRealmList(list);
            expect(list.length).equals(2);
            expect(list[0]).equals("original1");
            expect(list[1]).equals("original2");
          });

          // TODO: Enable when self-assignment is solved (https://github.com/realm/realm-core/issues/7422).
          it.skip("self assigns nested list", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [["original1", "original2"]],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(1);

            let nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);
            expect(nestedList[0]).equals("original1");
            expect(nestedList[1]).equals("original2");

            this.realm.write(() => {
              /* eslint-disable-next-line no-self-assign */
              list[0] = list[0];
            });
            nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);
            expect(nestedList[0]).equals("original1");
            expect(nestedList[1]).equals("original2");
          });
        });

        describe("Dictionary", () => {
          it("updates top-level entry via setter", function (this: RealmContext) {
            const { dictionary, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { mixed: dictionary } = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { depth1: "original" },
              });
              return { dictionary, realmObject };
            });
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["depth1"]);
            expect(dictionary.depth1).equals("original");

            this.realm.write(() => {
              dictionary.depth1 = "updated";
            });
            expectKeys(dictionary, ["depth1"]);
            expect(dictionary.depth1).equals("updated");

            this.realm.write(() => {
              dictionary.depth1 = null;
            });
            expectKeys(dictionary, ["depth1"]);
            expect(dictionary.depth1).to.be.null;

            this.realm.write(() => {
              dictionary.depth1 = [[...primitiveTypesList, realmObject]];
            });
            expectDictionaryOfListsOfAllTypes(dictionary);

            this.realm.write(() => {
              dictionary.depth1 = { depth2: { ...primitiveTypesDictionary, realmObject } };
            });
            expectDictionaryOfDictionariesOfAllTypes(dictionary);
          });

          it("updates nested entry via setter", function (this: RealmContext) {
            const { dictionary, realmObject } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
              const { mixed: dictionary } = this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { depth1: { depth2: "original" } },
              });
              return { dictionary, realmObject };
            });
            expectRealmDictionary(dictionary);
            const { depth1: nestedDictionary } = dictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["depth2"]);
            expect(nestedDictionary.depth2).equals("original");

            this.realm.write(() => {
              nestedDictionary.depth2 = "updated";
            });
            expectKeys(nestedDictionary, ["depth2"]);
            expect(nestedDictionary.depth2).equals("updated");

            this.realm.write(() => {
              nestedDictionary.depth2 = null;
            });
            expectKeys(nestedDictionary, ["depth2"]);
            expect(nestedDictionary.depth2).to.be.null;

            this.realm.write(() => {
              nestedDictionary.depth2 = [[...primitiveTypesList, realmObject]];
            });
            expectKeys(nestedDictionary, ["depth2"]);
            expectRealmList(nestedDictionary.depth2);
            expectListOfAllTypes(nestedDictionary.depth2[0]);

            this.realm.write(() => {
              nestedDictionary.depth2 = { depth3: { ...primitiveTypesDictionary, realmObject } };
            });
            expectKeys(nestedDictionary, ["depth2"]);
            expectRealmDictionary(nestedDictionary.depth2);
            expectDictionaryOfAllTypes(nestedDictionary.depth2.depth3);
          });

          it("updates itself to a new dictionary", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { key1: "original1", key2: "original2" },
              });
            });
            let dictionary = created.mixed;
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["key1", "key2"]);
            expect(dictionary.key1).equals("original1");
            expect(dictionary.key2).equals("original2");

            this.realm.write(() => {
              created.mixed = { newKey: "updated" };
            });
            dictionary = created.mixed;
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["newKey"]);
            expect(dictionary.newKey).equals("updated");
          });

          it("updates nested dictionary to a new dictionary", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { nestedDictionary: { key1: "original1", key2: "original2" } },
              });
            });
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["nestedDictionary"]);

            let nestedDictionary = dictionary.nestedDictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["key1", "key2"]);
            expect(nestedDictionary.key1).equals("original1");
            expect(nestedDictionary.key2).equals("original2");

            this.realm.write(() => {
              dictionary.nestedDictionary = { newKey: "updated" };
            });
            nestedDictionary = dictionary.nestedDictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["newKey"]);
            expect(nestedDictionary.newKey).equals("updated");
          });

          it("does not become invalidated when updated to a new dictionary", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: { key: "original" } });
            });
            const dictionary = created.mixed;
            expectRealmDictionary(dictionary);

            this.realm.write(() => {
              created.mixed = { newKey: "updated" };
            });
            // Accessing `dictionary` should not throw.
            expect(dictionary.newKey).equals("updated");
          });

          // TODO: Enable when self-assignment is solved (https://github.com/realm/realm-core/issues/7422).
          it.skip("self assigns", function (this: RealmContext) {
            const created = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { key1: "original1", key2: "original2" },
              });
            });
            let dictionary = created.mixed;
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["key1", "key2"]);
            expect(dictionary.key1).equals("original1");
            expect(dictionary.key2).equals("original2");

            this.realm.write(() => {
              /* eslint-disable-next-line no-self-assign */
              created.mixed = created.mixed;
            });
            dictionary = created.mixed;
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["key1", "key2"]);
            expect(dictionary.key1).equals("original1");
            expect(dictionary.key2).equals("original2");
          });

          // TODO: Enable when self-assignment is solved (https://github.com/realm/realm-core/issues/7422).
          it.skip("self assigns nested dictionary", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { nestedDictionary: { key1: "original1", key2: "original2" } },
              });
            });
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["nestedDictionary"]);

            let nestedDictionary = dictionary.nestedDictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["key1", "key2"]);
            expect(nestedDictionary.key1).equals("original1");
            expect(nestedDictionary.key2).equals("original2");

            this.realm.write(() => {
              /* eslint-disable-next-line no-self-assign */
              dictionary.nestedDictionary = dictionary.nestedDictionary;
            });
            nestedDictionary = dictionary.nestedDictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["key1", "key2"]);
            expect(nestedDictionary.key1).equals("original1");
            expect(nestedDictionary.key2).equals("original2");
          });
        });
      });

      describe("Remove", () => {
        describe("List", () => {
          it("removes top-level item via `remove()`", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { mixed: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: ["original", [], {}, realmObject],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(4);

            // Remove each item one-by-one starting from the last.

            this.realm.write(() => {
              list.remove(3);
            });
            expect(list.length).equals(3);
            expect(list[0]).equals("original");
            expectRealmList(list[1]);
            expectRealmDictionary(list[2]);

            this.realm.write(() => {
              list.remove(2);
            });
            expect(list.length).equals(2);
            expect(list[0]).equals("original");
            expectRealmList(list[1]);

            this.realm.write(() => {
              list.remove(1);
            });
            expect(list.length).equals(1);
            expect(list[0]).equals("original");

            this.realm.write(() => {
              list.remove(0);
            });
            expect(list.length).equals(0);
          });

          it("removes nested item via `remove()`", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { mixed: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [["original", [], {}, realmObject]],
              });
            });
            expectRealmList(list);
            const [nestedList] = list;
            expectRealmList(nestedList);
            expect(nestedList.length).equals(4);

            // Remove each item one-by-one starting from the last.

            this.realm.write(() => {
              nestedList.remove(3);
            });
            expect(nestedList.length).equals(3);
            expect(nestedList[0]).equals("original");
            expectRealmList(nestedList[1]);
            expectRealmDictionary(nestedList[2]);

            this.realm.write(() => {
              nestedList.remove(2);
            });
            expect(nestedList.length).equals(2);
            expect(nestedList[0]).equals("original");
            expectRealmList(nestedList[1]);

            this.realm.write(() => {
              nestedList.remove(1);
            });
            expect(nestedList.length).equals(1);
            expect(nestedList[0]).equals("original");

            this.realm.write(() => {
              nestedList.remove(0);
            });
            expect(nestedList.length).equals(0);
          });
        });

        describe("Dictionary", () => {
          it("removes top-level entry via `remove()`", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { mixed: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { string: "original", list: [], dictionary: {}, realmObject },
              });
            });
            expectRealmDictionary(dictionary);
            expectKeys(dictionary, ["string", "list", "dictionary", "realmObject"]);

            // Remove each entry one-by-one.

            this.realm.write(() => {
              dictionary.remove("realmObject");
            });
            expectKeys(dictionary, ["string", "list", "dictionary"]);
            expect(dictionary.string).equals("original");
            expectRealmList(dictionary.list);
            expectRealmDictionary(dictionary.dictionary);

            this.realm.write(() => {
              dictionary.remove("dictionary");
            });
            expectKeys(dictionary, ["string", "list"]);
            expect(dictionary.string).equals("original");
            expectRealmList(dictionary.list);

            this.realm.write(() => {
              dictionary.remove("list");
            });
            expectKeys(dictionary, ["string"]);
            expect(dictionary.string).equals("original");

            this.realm.write(() => {
              dictionary.remove("string");
            });
            expect(Object.keys(dictionary).length).equals(0);
          });

          it("removes nested entry via `remove()`", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              const realmObject = this.realm.create(MixedSchema.name, { mixed: "original" });
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: { depth1: { string: "original", list: [], dictionary: {}, realmObject } },
              });
            });
            expectRealmDictionary(dictionary);
            const { depth1: nestedDictionary } = dictionary;
            expectRealmDictionary(nestedDictionary);
            expectKeys(nestedDictionary, ["string", "list", "dictionary", "realmObject"]);

            // Remove each entry one-by-one.

            this.realm.write(() => {
              nestedDictionary.remove("realmObject");
            });
            expectKeys(nestedDictionary, ["string", "list", "dictionary"]);
            expect(nestedDictionary.string).equals("original");
            expectRealmList(nestedDictionary.list);
            expectRealmDictionary(nestedDictionary.dictionary);

            this.realm.write(() => {
              nestedDictionary.remove("dictionary");
            });
            expectKeys(nestedDictionary, ["string", "list"]);
            expect(nestedDictionary.string).equals("original");
            expectRealmList(nestedDictionary.list);

            this.realm.write(() => {
              nestedDictionary.remove("list");
            });
            expectKeys(nestedDictionary, ["string"]);
            expect(nestedDictionary.string).equals("original");

            this.realm.write(() => {
              nestedDictionary.remove("string");
            });
            expect(Object.keys(nestedDictionary).length).equals(0);
          });
        });
      });

      describe("JS collection methods", () => {
        describe("List", () => {
          it("pop()", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [[1, "string"], { key: "value" }],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(2);

            const nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);

            // Remove last item of nested list.
            let removed = this.realm.write(() => nestedList.pop());
            expect(removed).equals("string");
            removed = this.realm.write(() => nestedList.pop());
            expect(removed).equals(1);
            expect(nestedList.length).equals(0);
            removed = this.realm.write(() => nestedList.pop());
            expect(removed).to.be.undefined;

            // Remove last item of top-level list.
            removed = this.realm.write(() => list.pop());
            expectRealmDictionary(removed);
            removed = this.realm.write(() => list.pop());
            expectRealmList(removed);
            expect(list.length).equals(0);
            removed = this.realm.write(() => list.pop());
            expect(removed).to.be.undefined;
          });

          it("shift()", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [[1, "string"], { key: "value" }],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(2);

            const nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);

            // Remove first item of nested list.
            let removed = this.realm.write(() => nestedList.shift());
            expect(removed).equals(1);
            removed = this.realm.write(() => nestedList.shift());
            expect(removed).equals("string");
            expect(nestedList.length).equals(0);
            removed = this.realm.write(() => nestedList.shift());
            expect(removed).to.be.undefined;

            // Remove first item of top-level list.
            removed = this.realm.write(() => list.shift());
            expectRealmList(removed);
            removed = this.realm.write(() => list.shift());
            expectRealmDictionary(removed);
            expect(list.length).equals(0);
            removed = this.realm.write(() => list.shift());
            expect(removed).to.be.undefined;
          });

          it("unshift()", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] });
            });
            expectRealmList(list);
            expect(list.length).equals(0);

            // Insert item into top-level list.
            let newLength = this.realm.write(() => list.unshift({}));
            expect(newLength).equals(1);
            expectRealmDictionary(list[0]);
            newLength = this.realm.write(() => list.unshift([]));
            expect(newLength).equals(2);
            const nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(0);

            // Insert item into nested list.
            newLength = this.realm.write(() => nestedList.unshift("string"));
            expect(newLength).equals(1);
            expect(nestedList[0]).equals("string");
            newLength = this.realm.write(() => nestedList.unshift(1));
            expect(newLength).equals(2);
            expect(nestedList[0]).equals(1);
          });

          it("splice()", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [[1, "string"], { key: "value" }],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(2);

            const nestedList = list[0];
            expectRealmList(nestedList);
            expect(nestedList.length).equals(2);

            // Remove all items from nested list.
            let removed = this.realm.write(() => nestedList.splice(0));
            expect(removed).deep.equals([1, "string"]);
            expect(nestedList.length).equals(0);

            // Insert items into nested list.
            removed = this.realm.write(() => nestedList.splice(0, 0, 1, "string"));
            expect(removed.length).equals(0);
            expect(nestedList.length).equals(2);
            expect(nestedList[0]).equals(1);
            expect(nestedList[1]).equals("string");

            // Remove all items from top-level list.
            removed = this.realm.write(() => list.splice(0));
            expect(removed.length).equals(2);
            expectRealmList(removed[0]);
            expectRealmDictionary(removed[1]);
            expect(list.length).equals(0);

            // Insert item into top-level list.
            removed = this.realm.write(() => list.splice(0, 0, [1, "string"], { key: "value" }));
            expect(removed.length).equals(0);
            expect(list.length).equals(2);
            expectRealmList(list[0]);
            expectRealmDictionary(list[1]);
          });

          it("indexOf()", function (this: RealmContext) {
            const NOT_FOUND = -1;
            const unmanagedList = [1, "string"];
            const unmanagedDictionary = { key: "value" };

            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [unmanagedList, unmanagedDictionary],
              });
            });
            expectRealmList(list);
            expect(list.length).equals(2);

            // Expect collections to behave as always being different references.
            // Both the unmanaged and managed collections will yield "not found".

            expect(list.indexOf(unmanagedList)).equals(NOT_FOUND);
            expect(list.indexOf(unmanagedDictionary)).equals(NOT_FOUND);

            const nestedList = list[0];
            expectRealmList(nestedList);
            expect(list.indexOf(nestedList)).equals(NOT_FOUND);

            const nestedDictionary = list[1];
            expectRealmDictionary(nestedDictionary);
            expect(list.indexOf(nestedDictionary)).equals(NOT_FOUND);

            expect(nestedList.indexOf(1)).equals(0);
            expect(nestedList.indexOf("string")).equals(1);
          });
        });

        describe("Iterators", () => {
          const unmanagedList: readonly unknown[] = [bool, double, string];
          const unmanagedDictionary: Readonly<Record<string, unknown>> = { bool, double, string };

          /**
           * Expects {@link collection} to contain the managed versions of:
           * - {@link unmanagedList} - At index 0 (if list), or lowest key (if dictionary).
           * - {@link unmanagedDictionary} - At index 1 (if list), or highest key (if dictionary).
           */
          function expectIteratorValues(collection: Realm.List | Realm.Dictionary) {
            const topIterator = collection.values();

            // Expect a list as first item.
            const nestedList = topIterator.next().value;
            expectRealmList(nestedList);

            // Expect a dictionary as second item.
            const nestedDictionary = topIterator.next().value;
            expectRealmDictionary(nestedDictionary);
            expect(topIterator.next().done).to.be.true;

            // Expect that the nested list iterator yields correct values.
            let index = 0;
            const nestedListIterator = nestedList.values();
            for (const value of nestedListIterator) {
              expect(value).equals(unmanagedList[index++]);
            }
            expect(nestedListIterator.next().done).to.be.true;

            // Expect that the nested dictionary iterator yields correct values.
            const nestedDictionaryIterator = nestedDictionary.values();
            expect(nestedDictionaryIterator.next().value).equals(unmanagedDictionary.bool);
            expect(nestedDictionaryIterator.next().value).equals(unmanagedDictionary.double);
            expect(nestedDictionaryIterator.next().value).equals(unmanagedDictionary.string);
            expect(nestedDictionaryIterator.next().done).to.be.true;
          }

          it("values() - list", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [unmanagedList, unmanagedDictionary],
              });
            });
            expectRealmList(list);
            expectIteratorValues(list);
          });

          it("values() - dictionary", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                // Use `a_` and `b_` prefixes to get the same order once retrieved internally.
                mixed: { a_list: unmanagedList, b_dictionary: unmanagedDictionary },
              });
            });
            expectRealmDictionary(dictionary);
            expectIteratorValues(dictionary);
          });

          /**
           * Expects {@link collection} to contain the managed versions of:
           * - {@link unmanagedList} - At index 0 (if list), or key `a_list` (if dictionary).
           * - {@link unmanagedDictionary} - At index 1 (if list), or key `b_dictionary` (if dictionary).
           */
          function expectIteratorEntries(collection: Realm.List | Realm.Dictionary) {
            const usesIndex = collection instanceof Realm.List;
            const topIterator = collection.entries();

            // Expect a list as first item.
            const [listIndexOrKey, nestedList] = topIterator.next().value;
            expect(listIndexOrKey).equals(usesIndex ? 0 : "a_list");
            expectRealmList(nestedList);

            // Expect a dictionary as second item.
            const [dictionaryIndexOrKey, nestedDictionary] = topIterator.next().value;
            expect(dictionaryIndexOrKey).equals(usesIndex ? 1 : "b_dictionary");
            expectRealmDictionary(nestedDictionary);
            expect(topIterator.next().done).to.be.true;

            // Expect that the nested list iterator yields correct entries.
            let currentIndex = 0;
            const nestedListIterator = nestedList.entries();
            for (const [index, item] of nestedListIterator) {
              expect(index).equals(currentIndex);
              expect(item).equals(unmanagedList[currentIndex++]);
            }
            expect(nestedListIterator.next().done).to.be.true;

            // Expect that the nested dictionary iterator yields correct entries.
            const nestedDictionaryIterator = nestedDictionary.entries();
            expect(nestedDictionaryIterator.next().value).deep.equals(["bool", unmanagedDictionary.bool]);
            expect(nestedDictionaryIterator.next().value).deep.equals(["double", unmanagedDictionary.double]);
            expect(nestedDictionaryIterator.next().value).deep.equals(["string", unmanagedDictionary.string]);
            expect(nestedDictionaryIterator.next().done).to.be.true;
          }

          it("entries() - list", function (this: RealmContext) {
            const { mixed: list } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                mixed: [unmanagedList, unmanagedDictionary],
              });
            });
            expectRealmList(list);
            expectIteratorEntries(list);
          });

          it("entries() - dictionary", function (this: RealmContext) {
            const { mixed: dictionary } = this.realm.write(() => {
              return this.realm.create<IMixedSchema>(MixedSchema.name, {
                // Use `a_` and `b_` prefixes to get the same order once retrieved internally.
                mixed: { a_list: unmanagedList, b_dictionary: unmanagedDictionary },
              });
            });
            expectRealmDictionary(dictionary);
            expectIteratorEntries(dictionary);
          });
        });
      });
    });

    describe("Filtering", () => {
      it("filters by query path on list of all primitive types", function (this: RealmContext) {
        const list = [...primitiveTypesList];
        const nonExistentIndex = 10_000;
        const nonExistentValue = "nonExistentValue";
        const expectedFilteredCount = 5;

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { mixed: "not a list" });
          list.push(this.realm.create(MixedSchema.name, { mixed: "not a list" }));

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { mixed: list });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        let index = 0;
        for (const itemToMatch of list) {
          // Objects with a list item that matches the `itemToMatch` at the GIVEN index.

          let filtered = objects.filtered(`mixed[${index}] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed[${index}] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed[${nonExistentIndex}] == $0`, itemToMatch);
          expect(filtered.length).equals(0);

          // Objects with a list item that matches the `itemToMatch` at ANY index.

          filtered = objects.filtered(`mixed[*] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed[*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed[${nonExistentIndex}][*] == $0`, itemToMatch);
          expect(filtered.length).equals(0);

          index++;
        }

        // Objects with a list containing the same number of items as the ones inserted.

        let filtered = objects.filtered(`mixed.@count == $0`, list.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@count == $0`, 0);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed.@size == $0`, list.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@size == $0`, 0);
        expect(filtered.length).equals(0);

        // Objects where `mixed` itself is of the given type.

        filtered = objects.filtered(`mixed.@type == 'collection'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@type == 'list'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@type == 'dictionary'`);
        expect(filtered.length).equals(0);

        // Objects with a list containing an item of the given type.

        filtered = objects.filtered(`mixed[*].@type == 'null'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'bool'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'int'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'double'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'string'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'data'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'date'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'decimal128'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'objectId'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'uuid'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'link'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'collection'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[*].@type == 'list'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[*].@type == 'dictionary'`);
        expect(filtered.length).equals(0);
      });

      it("filters by query path on nested list of all primitive types", function (this: RealmContext) {
        const list = [[[...primitiveTypesList]]];
        const nonExistentIndex = 10_000;
        const nonExistentValue = "nonExistentValue";
        const expectedFilteredCount = 5;

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { mixed: "not a list" });
          list[0][0].push(this.realm.create(MixedSchema.name, { mixed: "not a list" }));

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { mixed: list });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        let index = 0;
        const nestedList = list[0][0];
        for (const itemToMatch of nestedList) {
          // Objects with a nested list item that matches the `itemToMatch` at the GIVEN index.

          let filtered = objects.filtered(`mixed[0][0][${index}] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed[0][0][${index}] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed[0][0][${nonExistentIndex}] == $0`, itemToMatch);
          expect(filtered.length).equals(0);

          // Objects with a nested list item that matches the `itemToMatch` at ANY index.

          filtered = objects.filtered(`mixed[0][0][*] == $0`, itemToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed[0][0][*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed[0][${nonExistentIndex}][*] == $0`, itemToMatch);
          expect(filtered.length).equals(0);

          index++;
        }

        // Objects with a nested list containing the same number of items as the ones inserted.

        let filtered = objects.filtered(`mixed[0][0].@count == $0`, nestedList.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0].@count == $0`, 0);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[0][0].@size == $0`, nestedList.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0].@size == $0`, 0);
        expect(filtered.length).equals(0);

        // Objects where `mixed[0][0]` itself is of the given type.

        filtered = objects.filtered(`mixed[0][0].@type == 'collection'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0].@type == 'list'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0].@type == 'dictionary'`);
        expect(filtered.length).equals(0);

        // Objects with a nested list containing an item of the given type.

        filtered = objects.filtered(`mixed[0][0][*].@type == 'null'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'bool'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'int'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'double'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'string'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'data'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'date'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'decimal128'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'objectId'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'uuid'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'link'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'collection'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'list'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[0][0][*].@type == 'dictionary'`);
        expect(filtered.length).equals(0);
      });

      it("filters by query path on dictionary of all primitive types", function (this: RealmContext) {
        const dictionary = { ...primitiveTypesDictionary };
        const nonExistentKey = "nonExistentKey";
        const nonExistentValue = "nonExistentValue";
        const expectedFilteredCount = 5;

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { mixed: "not a dictionary" });
          dictionary.realmObject = this.realm.create(MixedSchema.name, { mixed: "not a dictionary" });

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { mixed: dictionary });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        const insertedValues = Object.values(dictionary);

        for (const key in dictionary) {
          const valueToMatch = dictionary[key];

          // Objects with a dictionary value that matches the `valueToMatch` at the GIVEN key.

          let filtered = objects.filtered(`mixed['${key}'] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed['${key}'] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed['${nonExistentKey}'] == $0`, valueToMatch);
          // Core treats missing keys as `null` in queries.
          expect(filtered.length).equals(valueToMatch === null ? expectedFilteredCount : 0);

          filtered = objects.filtered(`mixed.${key} == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.${key} == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed.${nonExistentKey} == $0`, valueToMatch);
          // Core treats missing keys as `null` in queries.
          expect(filtered.length).equals(valueToMatch === null ? expectedFilteredCount : 0);

          // Objects with a dictionary value that matches the `valueToMatch` at ANY key.

          filtered = objects.filtered(`mixed[*] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed[*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          // Objects with a dictionary containing a key that matches the given key.

          filtered = objects.filtered(`mixed.@keys == $0`, key);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.@keys == $0`, nonExistentKey);
          expect(filtered.length).equals(0);

          // Objects with a dictionary value at the given key matching any of the values inserted.

          // TODO: Bug or feature in Core? (For all keys, this returns 0 objects.)
          //       Was reported as part of https://github.com/realm/realm-core/issues/7587,
          //       but the issue remains for `IN`. They could be treating argument lists special.
          // filtered = objects.filtered(`mixed.${key} IN $0`, insertedValues);
          // expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.${key} IN $0`, [nonExistentValue]);
          expect(filtered.length).equals(0);
        }

        // Objects with a dictionary containing the same number of keys as the ones inserted.

        let filtered = objects.filtered(`mixed.@count == $0`, insertedValues.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@count == $0`, 0);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed.@size == $0`, insertedValues.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@size == $0`, 0);
        expect(filtered.length).equals(0);

        // Objects where `mixed` itself is of the given type.

        filtered = objects.filtered(`mixed.@type == 'collection'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@type == 'dictionary'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.@type == 'list'`);
        expect(filtered.length).equals(0);

        // Objects with a dictionary containing a property of the given type.

        filtered = objects.filtered(`mixed[*].@type == 'null'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'bool'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'int'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'double'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'string'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'data'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'date'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'decimal128'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'objectId'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'uuid'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'link'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed[*].@type == 'collection'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[*].@type == 'list'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed[*].@type == 'dictionary'`);
        expect(filtered.length).equals(0);
      });

      it("filters by query path on nested dictionary of all primitive types", function (this: RealmContext) {
        const dictionary = { depth1: { depth2: { ...primitiveTypesDictionary } } };
        const nonExistentKey = "nonExistentKey";
        const nonExistentValue = "nonExistentValue";
        const expectedFilteredCount = 5;

        this.realm.write(() => {
          // Create 2 objects that should not pass the query string filter.
          this.realm.create(MixedSchema.name, { mixed: "not a dictionary" });
          dictionary.depth1.depth2.realmObject = this.realm.create(MixedSchema.name, { mixed: "not a dictionary" });

          // Create the objects that should pass the query string filter.
          for (let count = 0; count < expectedFilteredCount; count++) {
            this.realm.create(MixedSchema.name, { mixed: dictionary });
          }
        });
        const objects = this.realm.objects(MixedSchema.name);
        expect(objects.length).equals(expectedFilteredCount + 2);

        const nestedDictionary = dictionary.depth1.depth2;
        const insertedValues = Object.values(nestedDictionary);

        for (const key in nestedDictionary) {
          const valueToMatch = nestedDictionary[key];

          // Objects with a nested dictionary value that matches the `valueToMatch` at the GIVEN key.

          let filtered = objects.filtered(`mixed['depth1']['depth2']['${key}'] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed['depth1']['depth2']['${key}'] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed['depth1']['depth2']['${nonExistentKey}'] == $0`, valueToMatch);
          // Core treats missing keys as `null` in queries.
          expect(filtered.length).equals(valueToMatch === null ? expectedFilteredCount : 0);

          filtered = objects.filtered(`mixed.depth1.depth2.${key} == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.depth1.depth2.${key} == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          filtered = objects.filtered(`mixed.depth1.depth2.${nonExistentKey} == $0`, valueToMatch);
          // Core treats missing keys as `null` in queries.
          expect(filtered.length).equals(valueToMatch === null ? expectedFilteredCount : 0);

          // Objects with a nested dictionary value that matches the `valueToMatch` at ANY key.

          filtered = objects.filtered(`mixed.depth1.depth2[*] == $0`, valueToMatch);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.depth1.depth2[*] == $0`, nonExistentValue);
          expect(filtered.length).equals(0);

          // Objects with a nested dictionary containing a key that matches the given key.

          filtered = objects.filtered(`mixed.depth1.depth2.@keys == $0`, key);
          expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.depth1.depth2.@keys == $0`, nonExistentKey);
          expect(filtered.length).equals(0);

          // Objects with a nested dictionary value at the given key matching any of the values inserted.

          // TODO: Bug or feature in Core? (For all keys, this returns 0 objects.)
          //       Was reported as part of https://github.com/realm/realm-core/issues/7587,
          //       but the issue remains for `IN`. They could be treating argument lists special.
          // filtered = objects.filtered(`mixed.depth1.depth2.${key} IN $0`, insertedValues);
          // expect(filtered.length).equals(expectedFilteredCount);

          filtered = objects.filtered(`mixed.depth1.depth2.${key} IN $0`, [nonExistentValue]);
          expect(filtered.length).equals(0);
        }

        // Objects with a nested dictionary containing the same number of keys as the ones inserted.

        let filtered = objects.filtered(`mixed.depth1.depth2.@count == $0`, insertedValues.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2.@count == $0`, 0);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed.depth1.depth2.@size == $0`, insertedValues.length);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2.@size == $0`, 0);
        expect(filtered.length).equals(0);

        // Objects where `depth2` itself is of the given type.

        filtered = objects.filtered(`mixed.depth1.depth2.@type == 'collection'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2.@type == 'dictionary'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2.@type == 'list'`);
        expect(filtered.length).equals(0);

        // Objects with a nested dictionary containing a property of the given type.

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'null'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'bool'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'int'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'double'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'string'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'data'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'date'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'decimal128'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'objectId'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'uuid'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'link'`);
        expect(filtered.length).equals(expectedFilteredCount);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'collection'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'list'`);
        expect(filtered.length).equals(0);

        filtered = objects.filtered(`mixed.depth1.depth2[*].@type == 'dictionary'`);
        expect(filtered.length).equals(0);
      });
    });

    describe("Invalid operations", () => {
      it("throws when creating a Mixed with a set", function (this: RealmContext) {
        expect(() => {
          this.realm.write(() => {
            this.realm.create(MixedSchema.name, { mixed: new Set() });
          });
        }).to.throw("Using a Set as a Mixed value is not supported");
        expect(this.realm.objects(MixedSchema.name).length).equals(0);

        expect(() => {
          this.realm.write(() => {
            const { set } = this.realm.create(CollectionsOfMixedSchema.name, { set: [] });
            expect(set).instanceOf(Realm.Set);
            this.realm.create(MixedSchema.name, { mixed: set });
          });
        }).to.throw("Using a RealmSet as a Mixed value is not supported");
        expect(this.realm.objects(MixedSchema.name).length).equals(0);
      });

      it("throws when creating a set with a list", function (this: RealmContext) {
        expect(() => {
          this.realm.write(() => {
            const unmanagedList: unknown[] = [];
            this.realm.create(CollectionsOfMixedSchema.name, { set: [unmanagedList] });
          });
        }).to.throw("Lists within a Set are not supported");
        expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(0);

        expect(() => {
          this.realm.write(() => {
            const { list } = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, { list: [] });
            expectRealmList(list);
            this.realm.create(CollectionsOfMixedSchema.name, { set: [list] });
          });
        }).to.throw("Lists within a Set are not supported");
        expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(0);
      });

      it("throws when creating a set with a dictionary", function (this: RealmContext) {
        expect(() => {
          this.realm.write(() => {
            const unmanagedDictionary: Record<string, unknown> = {};
            this.realm.create(CollectionsOfMixedSchema.name, { set: [unmanagedDictionary] });
          });
        }).to.throw("Dictionaries within a Set are not supported");
        expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(0);

        expect(() => {
          this.realm.write(() => {
            const { dictionary } = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
              dictionary: {},
            });
            expectRealmDictionary(dictionary);
            this.realm.create(CollectionsOfMixedSchema.name, { set: [dictionary] });
          });
        }).to.throw("Dictionaries within a Set are not supported");
        expect(this.realm.objects(CollectionsOfMixedSchema.name).length).equals(0);
      });

      it("throws when updating a list item to a set", function (this: RealmContext) {
        const { set, list } = this.realm.write(() => {
          const set = this.realm.create(CollectionsOfMixedSchema.name, { set: [] }).set;
          const list = this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original"] }).mixed;
          return { set, list };
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
          const set = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] }).set;
          const dictionary = this.realm.create<IMixedSchema>(MixedSchema.name, {
            mixed: { key: "original" },
          }).mixed;
          return { set, dictionary };
        });
        expectRealmDictionary(dictionary);
        expect(dictionary.key).equals("original");

        this.realm.write(() => {
          expect(() => (dictionary.key = new Set())).to.throw("Using a Set as a Mixed value is not supported");
          expect(() => (dictionary.key = set)).to.throw("Using a RealmSet as a Mixed value is not supported");
        });
        expect(dictionary.key).equals("original");
      });

      it("throws when creating a list or dictionary with an embedded object", function (this: RealmContext) {
        // Create an object with an embedded object property.
        const { embeddedObject } = this.realm.write(() => {
          return this.realm.create(MixedAndEmbeddedSchema.name, {
            embeddedObject: { mixed: 1 },
          });
        });
        expect(embeddedObject).instanceOf(Realm.Object);
        const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
        expect(objects.length).equals(1);

        // Create an object with the Mixed property as a list containing the embedded object.
        expect(() => {
          this.realm.write(() => {
            this.realm.create(MixedAndEmbeddedSchema.name, { mixed: [embeddedObject] });
          });
        }).to.throw("Using an embedded object (EmbeddedObject) as a Mixed value is not supported");
        expect(objects.length).equals(1);

        // Create an object with the Mixed property as a dictionary containing the embedded object.
        expect(() => {
          this.realm.write(() => {
            this.realm.create(MixedAndEmbeddedSchema.name, { mixed: { embeddedObject } });
          });
        }).to.throw("Using an embedded object (EmbeddedObject) as a Mixed value is not supported");
        expect(objects.length).equals(1);
      });

      it("throws when setting a list or dictionary item to an embedded object", function (this: RealmContext) {
        this.realm.write(() => {
          // Create an object with an embedded object property.
          const { embeddedObject } = this.realm.create(MixedAndEmbeddedSchema.name, {
            embeddedObject: { mixed: 1 },
          });
          expect(embeddedObject).instanceOf(Realm.Object);

          // Create an object with the Mixed property as a list.
          const { mixed: list } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
            mixed: ["original"],
          });
          expectRealmList(list);

          // Create an object with the Mixed property as a dictionary.
          const { mixed: dictionary } = this.realm.create<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name, {
            mixed: { key: "original" },
          });
          expectRealmDictionary(dictionary);

          // Assign the embedded object to the collections.
          expect(() => (list[0] = embeddedObject)).to.throw(
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
          expect(() => (dictionary.key = embeddedObject)).to.throw(
            "Using an embedded object (EmbeddedObject) as a Mixed value is not supported",
          );
        });
        const objects = this.realm.objects<IMixedAndEmbedded>(MixedAndEmbeddedSchema.name);
        expect(objects.length).equals(3);

        // Check that the list and dictionary are unchanged.
        const list = objects[1].mixed;
        expectRealmList(list);
        expect(list[0]).equals("original");

        const dictionary = objects[2].mixed;
        expectRealmDictionary(dictionary);
        expect(dictionary.key).equals("original");
      });

      it("throws when setting a list or dictionary outside a transaction", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: "original" });
        });
        expect(created.mixed).equals("original");
        expect(() => (created.mixed = ["a list item"])).to.throw(
          "Cannot modify managed objects outside of a write transaction",
        );
        expect(() => (created.mixed = { key: "a dictionary value" })).to.throw(
          "Cannot modify managed objects outside of a write transaction",
        );
        expect(created.mixed).equals("original");
      });

      it("throws when setting a list item out of bounds", function (this: RealmContext) {
        const { mixed: list } = this.realm.write(() => {
          // Create an empty list as the Mixed value.
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [] });
        });
        expectRealmList(list);
        expect(list.length).equals(0);

        expect(() => {
          this.realm.write(() => {
            list[0] = "primitive";
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed' when empty");

        expect(() => {
          this.realm.write(() => {
            list[0] = [];
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed' when empty");

        expect(() => {
          this.realm.write(() => {
            list[0] = {};
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed' when empty");
      });

      it("throws when setting a nested list item out of bounds", function (this: RealmContext) {
        const { mixed: list } = this.realm.write(() => {
          // Create a list containing an empty list as the Mixed value.
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [[]] });
        });
        expectRealmList(list);
        expect(list.length).equals(1);

        const nestedList = list[0];
        expectRealmList(nestedList);
        expect(nestedList.length).equals(0);

        expect(() => {
          this.realm.write(() => {
            nestedList[0] = "primitive";
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed[FIRST]' when empty");

        expect(() => {
          this.realm.write(() => {
            nestedList[0] = [];
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed[FIRST]' when empty");

        expect(() => {
          this.realm.write(() => {
            nestedList[0] = {};
          });
        }).to.throw("Requested index 0 calling set() on list 'MixedClass.mixed[FIRST]' when empty");
      });

      it("throws when assigning to list snapshot (Results)", function (this: RealmContext) {
        const { mixed: list } = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: ["original"] });
        });
        expectRealmList(list);

        const results = list.snapshot();
        expectRealmResults(results);
        expect(results.length).equals(1);
        expect(results[0]).equals("original");

        expect(() => {
          this.realm.write(() => {
            results[0] = "updated";
          });
        }).to.throw("Modifying a Results collection is not supported");
        expect(results.length).equals(1);
        expect(results[0]).equals("original");
      });

      it("invalidates the list when removed", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: [1] });
        });
        const list = created.mixed;
        expectRealmList(list);

        this.realm.write(() => {
          created.mixed = null;
        });
        expect(created.mixed).to.be.null;
        expect(() => list[0]).to.throw("List is no longer valid");
      });

      it("invalidates the dictionary when removed", function (this: RealmContext) {
        const created = this.realm.write(() => {
          return this.realm.create<IMixedSchema>(MixedSchema.name, { mixed: { key: "original" } });
        });
        const dictionary = created.mixed;
        expectRealmDictionary(dictionary);

        this.realm.write(() => {
          created.mixed = null;
        });
        expect(created.mixed).to.be.null;
        expect(() => dictionary.key).to.throw("This collection is no more");
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
        this.realm.create("MixedClass", { mixed: uint8Buffer1 });
      });
      let mixedObjects = this.realm.objects<IMixedSchema>("MixedClass");
      let returnedData = [...new Uint8Array(mixedObjects[0].mixed as Iterable<number>)];
      expect(returnedData).eql(uint8Values1);

      this.realm.write(() => {
        mixedObjects[0].mixed = uint8Buffer2;
      });

      mixedObjects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint8Array(mixedObjects[0].mixed as Iterable<number>)];
      expect(returnedData).eql(uint8Values2);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // Test with empty array
      this.realm.write(() => {
        this.realm.create<IMixedSchema>("MixedClass", { mixed: new Uint8Array(0) });
      });

      const emptyArrayBuffer = mixedObjects[0].mixed;
      expect(emptyArrayBuffer).instanceOf(ArrayBuffer);
      expect((emptyArrayBuffer as ArrayBuffer).byteLength).equals(0);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // test with 16-bit values
      const uint16Values = [0, 512, 256, 65535];
      const uint16Buffer = new Uint16Array(uint16Values).buffer;
      this.realm.write(() => {
        this.realm.create("MixedClass", { mixed: uint16Buffer });
      });

      const uint16Objects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint16Array(uint16Objects[0].mixed as Iterable<number>)];
      expect(returnedData).eql(uint16Values);

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      // test with 32-bit values
      const uint32Values = [0, 121393, 121393, 317811, 514229, 4294967295];
      const uint32Buffer = new Uint32Array(uint32Values).buffer;
      this.realm.write(() => {
        this.realm.create("MixedClass", { mixed: uint32Buffer });
      });

      const uint32Objects = this.realm.objects<IMixedSchema>("MixedClass");
      returnedData = [...new Uint32Array(uint32Objects[0].mixed as Iterable<number>)];
      expect(returnedData).eql(uint32Values);

      this.realm.close();
    });
  });
});
