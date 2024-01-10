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

import Realm, { BSON } from "realm";
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

interface ICollectionsOfMixed {
  list: Realm.List<Realm.Mixed>;
  dictionary: Realm.Dictionary<Realm.Mixed>;
  set: Realm.Set<Realm.Mixed>;
}

const SingleSchema: Realm.ObjectSchema = {
  name: "mixed",
  properties: {
    a: "mixed",
    b: "mixed",
    c: "mixed",
    d: "mixed",
  },
};

const VertexSchema: Realm.ObjectSchema = {
  name: "Vertex",
  properties: {
    a: "int",
    b: "int",
    c: "int",
  },
};

const MixNestedSchema: Realm.ObjectSchema = {
  name: "Nested",
  properties: {
    a: "mixed",
    b: "mixed",
    c: "mixed",
  },
};

const MixedNullableSchema: Realm.ObjectSchema = {
  name: "mixed",
  properties: {
    nullable: "mixed",
    nullable_list: "mixed[]",
  },
};

const MixedSchema: Realm.ObjectSchema = {
  name: "MixedClass",
  properties: {
    value: "mixed",
  },
};

const CollectionsOfMixedSchema: Realm.ObjectSchema = {
  name: "CollectionsOfMixed",
  properties: {
    list: "mixed[]",
    dictionary: "mixed{}",
    set: "mixed<>",
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
    openRealmBefore({ schema: [SingleSchema, VertexSchema, MixNestedSchema] });
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
    openRealmBeforeEach({ schema: [MixedSchema, CollectionsOfMixedSchema] });

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
    const unmanagedRealmObject: IMixedSchema = { value: 1 };

    // The `unmanagedRealmObject` is not added to these collections since a managed
    // Realm object will be added by the individual tests after one has been created.
    const flatListAllTypes: unknown[] = [bool, int, double, d128, string, date, oid, uuid, nullValue, uint8Buffer];
    const flatDictionaryAllTypes: Record<string, unknown> = {
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

    function expectMatchingFlatList(value: unknown) {
      expect(value).instanceOf(Realm.List);
      const list = value as Realm.List<any>;
      expect(list.length).to.be.greaterThanOrEqual(flatListAllTypes.length);

      let index = 0;
      for (const item of list) {
        if (item instanceof Realm.Object) {
          // @ts-expect-error Property `value` does exist.
          expect(item.value).equals(unmanagedRealmObject.value);
        } else if (item instanceof ArrayBuffer) {
          expectUint8Buffer(item);
        } else {
          expect(String(item)).equals(String(flatListAllTypes[index]));
        }
        index++;
      }
    }

    function expectMatchingFlatDictionary(value: unknown) {
      expect(value).instanceOf(Realm.Dictionary);
      const dictionary = value as Realm.Dictionary<any>;
      expect(Object.keys(dictionary).length).to.be.greaterThanOrEqual(Object.keys(flatDictionaryAllTypes).length);

      for (const key in dictionary) {
        const value = dictionary[key];
        if (key === "realmObject") {
          expect(value).instanceOf(Realm.Object);
          expect(value.value).equals(unmanagedRealmObject.value);
        } else if (key === "uint8Buffer") {
          expectUint8Buffer(value);
        } else {
          expect(String(value)).equals(String(flatDictionaryAllTypes[key]));
        }
      }
    }

    function expectUint8Buffer(value: unknown) {
      expect(value).instanceOf(ArrayBuffer);
      expect([...new Uint8Array(value as ArrayBuffer)]).eql(uint8Values);
    }

    describe("Flat collections", () => {
      describe("CRUD operations", () => {
        it("can create and access a JS Array with different types", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: [...flatListAllTypes, realmObject],
            });
          });

          const objects = this.realm.objects(MixedSchema.name);
          expect(objects.length).equals(2);
          expectMatchingFlatList(created.value);
        });

        it("can create and access a Realm List with different types", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
            // Create an object with a Realm List property type (i.e. not a Mixed type).
            const realmObjectWithList = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
              list: [...flatListAllTypes, realmObject],
            });
            expect(realmObjectWithList.list).instanceOf(Realm.List);
            // Use the Realm List as the value for the Mixed property on a different object.
            return this.realm.create<IMixedSchema>(MixedSchema.name, { value: realmObjectWithList.list });
          });

          const objects = this.realm.objects(MixedSchema.name);
          expect(objects.length).equals(2);
          expectMatchingFlatList(created.value);
        });

        it("can create and access a JS Object with different types", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: { ...flatDictionaryAllTypes, realmObject },
            });
          });

          const objects = this.realm.objects(MixedSchema.name);
          expect(objects.length).equals(2);
          expectMatchingFlatDictionary(created.value);
        });

        it("can create and access a Realm Dictionary with different types", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, unmanagedRealmObject);
            // Create an object with a Realm Dictionary property type (i.e. not a Mixed type).
            const realmObjectWithDictionary = this.realm.create<ICollectionsOfMixed>(CollectionsOfMixedSchema.name, {
              dictionary: { ...flatDictionaryAllTypes, realmObject },
            });
            expect(realmObjectWithDictionary.dictionary).instanceOf(Realm.Dictionary);
            // Use the Realm Dictionary as the value for the Mixed property on a different object.
            return this.realm.create<IMixedSchema>(MixedSchema.name, { value: realmObjectWithDictionary.dictionary });
          });

          const objects = this.realm.objects(MixedSchema.name);
          expect(objects.length).equals(2);
          expectMatchingFlatDictionary(created.value);
        });

        it("updates list items via property setters", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: ["original", realmObject],
            });
          });
          const list = created.value as Realm.List<any>;
          expect(list.length).equals(2);
          expect(list[0]).equals("original");
          expect(list[1].value).equals("original");

          this.realm.write(() => {
            list[0] = "updated";
            list[1].value = "updated";
          });
          expect((created.value as Realm.List<any>)[0]).equals("updated");
          expect((created.value as Realm.List<any>)[1].value).equals("updated");

          this.realm.write(() => {
            list[0] = null;
            list[1] = null;
          });
          expect((created.value as Realm.List<any>).length).equals(2);
          expect((created.value as Realm.List<any>)[0]).to.be.null;
          expect((created.value as Realm.List<any>)[1]).to.be.null;
        });

        it("updates dictionary entries via property setters", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: { string: "original", realmObject },
            });
          });

          const dictionary = created.value as Realm.Dictionary<any>;
          expect(Object.keys(dictionary).length).equals(2);
          expect(dictionary.string).equals("original");
          expect(dictionary.realmObject.value).equals("original");
          this.realm.write(() => {
            dictionary.string = "updated";
            dictionary.realmObject.value = "updated";
          });
          expect((created.value as Realm.Dictionary<any>).string).equals("updated");
          expect((created.value as Realm.Dictionary<any>).realmObject.value).equals("updated");

          this.realm.write(() => {
            dictionary.string = null;
            dictionary.realmObject = null;
          });
          expect(Object.keys(created.value as Realm.Dictionary<any>).length).equals(2);
          expect((created.value as Realm.Dictionary<any>).string).to.be.null;
          expect((created.value as Realm.Dictionary<any>).realmObject).to.be.null;
        });

        it("removes list items via `remove()`", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: ["original", realmObject],
            });
          });
          const list = created.value as Realm.List<any>;
          expect(list.length).equals(2);

          this.realm.write(() => {
            list.remove(1);
          });
          expect((created.value as Realm.List<any>).length).equals(1);
          expect((created.value as Realm.List<any>)[0]).equals("original");
        });

        it("removes dictionary entries via `remove()`", function (this: RealmContext) {
          const created = this.realm.write(() => {
            const realmObject = this.realm.create(MixedSchema.name, { value: "original" });
            return this.realm.create<IMixedSchema>(MixedSchema.name, {
              value: { string: "original", realmObject },
            });
          });
          const dictionary = created.value as Realm.Dictionary<any>;
          expect(Object.keys(dictionary).length).equals(2);

          this.realm.write(() => {
            dictionary.remove("realmObject");
          });
          expect(Object.keys(created.value as Realm.Dictionary<any>).length).equals(1);
          expect((created.value as Realm.Dictionary<any>).string).equals("original");
          expect((created.value as Realm.Dictionary<any>).realmObject).to.be.undefined;
        });
      });

      describe("Filtering", () => {
        it("filters list with different types by query path", function (this: RealmContext) {
          const expectedFilteredCount = 5;
          const mixedList = [...flatListAllTypes];

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
          for (const expectedItem of mixedList) {
            const filtered = objects.filtered(`value[${index++}] == $0`, expectedItem);
            expect(filtered.length).equals(expectedFilteredCount);
          }
        });

        it("filters dictionary with different types by query path", function (this: RealmContext) {
          const expectedFilteredCount = 5;
          const mixedDictionary = { ...flatDictionaryAllTypes };

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

          for (const expectedKey in mixedDictionary) {
            const expectedItem = mixedDictionary[expectedKey];

            // Use bracket notation.
            let filtered = objects.filtered(`value['${expectedKey}'] == $0`, expectedItem);
            expect(filtered.length).equals(expectedFilteredCount);

            // Use dot notation.
            filtered = objects.filtered(`value.${expectedKey} == $0`, expectedItem);
            expect(filtered.length).equals(expectedFilteredCount);
          }
        });
      });
    });

    describe("Invalid types", () => {
      it("throws when creating a JS Set", function (this: RealmContext) {
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

      it("throws when creating a Realm Set", function (this: RealmContext) {
        this.realm.write(() => {
          const realmObjectWithSet = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          expect(realmObjectWithSet.set).instanceOf(Realm.Set);
          expect(() => this.realm.create(MixedSchema.name, { value: realmObjectWithSet.set })).to.throw(
            "Using a RealmSet as a Mixed value is not supported",
          );
        });

        const objects = this.realm.objects(MixedSchema.name);
        // TODO: Length should equal 0 when this PR is merged: https://github.com/realm/realm-js/pull/6356
        // expect(objects.length).equals(0);
        expect(objects.length).equals(1);
      });

      it("throws when updating a list item to a set", function (this: RealmContext) {
        const { realmObjectWithSet, realmObjectWithMixed } = this.realm.write(() => {
          const realmObjectWithSet = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          const realmObjectWithMixed = this.realm.create<IMixedSchema>(MixedSchema.name, { value: ["original"] });
          return { realmObjectWithSet, realmObjectWithMixed };
        });
        const list = realmObjectWithMixed.value as Realm.List<any>;
        expect(list[0]).equals("original");

        this.realm.write(() => {
          expect(() => (list[0] = new Set())).to.throw("Using a Set as a Mixed value is not supported");
          expect(() => (list[0] = realmObjectWithSet.set)).to.throw(
            "Using a RealmSet as a Mixed value is not supported",
          );
        });
        expect((realmObjectWithMixed.value as Realm.List<any>)[0]).equals("original");
      });

      it("throws when updating a dictionary entry to a set", function (this: RealmContext) {
        const { realmObjectWithSet, realmObjectWithMixed } = this.realm.write(() => {
          const realmObjectWithSet = this.realm.create(CollectionsOfMixedSchema.name, { set: [int] });
          const realmObjectWithMixed = this.realm.create<IMixedSchema>(MixedSchema.name, {
            value: { string: "original" },
          });
          return { realmObjectWithSet, realmObjectWithMixed };
        });
        const dictionary = realmObjectWithMixed.value as Realm.Dictionary<any>;
        expect(dictionary.string).equals("original");

        this.realm.write(() => {
          expect(() => (dictionary.string = new Set())).to.throw("Using a Set as a Mixed value is not supported");
          expect(() => (dictionary.string = realmObjectWithSet.set)).to.throw(
            "Using a RealmSet as a Mixed value is not supported",
          );
        });
        expect((realmObjectWithMixed.value as Realm.Dictionary<any>).string).equals("original");
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
