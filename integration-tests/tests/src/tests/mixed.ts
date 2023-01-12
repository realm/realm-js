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
import { Decimal128, ObjectId, UUID } from "bson";
import { expect } from "chai";

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
  properties: { value: "mixed" },
};

describe("Mixed", () => {
  describe("primitive values", () => {
    let realm: Realm;
    beforeEach(() => {
      Realm.clearTestState();
      realm = new Realm({ schema: [SingleSchema] });
    });
    afterEach(() => {
      realm.close();
    });
    it("support primitives", function (this: RealmContext) {
      realm.write(() => realm.create(SingleSchema.name, { a: "xxxxxx", b: 555, c: true }));
      const data = realm.objects(SingleSchema.name)[0];
      expect(data.a).equals("xxxxxx", "should store xxxxxx");
      expect(data.b).equals(555, "should store 555");
      expect(data.c).equals(true, "should store boolean (true)");
    });

    it("support queries on mixed primitives", function (this: RealmContext) {
      const N = 100;
      for (let i = 0; i < N; i++) {
        realm.write(() => realm.create(SingleSchema.name, { a: "xxxxxx", b: "xxx", c: i }));
      }

      const data = realm.objects(SingleSchema.name);
      const section = data.filtered('a BEGINSWITH "x" AND b BEGINSWITH "x"');
      const half = data.filtered("c < 50");
      expect(section.length).equals(N, "We expect only 100 items.");
      expect(half.length).equals(N / 2, "We expect only 50 items.");
    });

    it("support complex primitive types", function (this: RealmContext) {
      const d128 = Decimal128.fromString("6.022e23");
      const oid = new ObjectId();
      const uuid = new UUID();
      const date = new Date();

      realm.write(() => realm.create(SingleSchema.name, { a: oid, b: uuid, c: d128, d: date }));

      const data = realm.objects(SingleSchema.name)[0];
      expect(typeof data.a === typeof oid, "should be the same type ObjectId");
      expect(data.a.toString()).equals(oid.toString(), "should be the same ObjectId");
      expect(data.b.toString()).equals(uuid.toString(), "Should be the same UUID");
      expect(data.c.toString()).equals(d128.toString(), "Should be the same Decimal128");
      expect(data.d.toString()).equals(date.toString(), "Should be the same Date");
    });

    it("support mixed mutability", function (this: RealmContext) {
      const d128 = Decimal128.fromString("6.022e23");
      const oid = new ObjectId();
      const uuid = new UUID();
      const date = new Date();

      realm.write(() => realm.create(SingleSchema.name, { a: oid }));
      const data = realm.objects(SingleSchema.name)[0];
      expect(typeof data.a === typeof oid, "should be the same type ObjectId");
      expect(data.a.toString()).equals(oid.toString(), "should have the same content");

      realm.write(() => (data.a = uuid));
      expect(typeof data.a === typeof uuid, "should be the same type UUID");
      expect(data.a.toString()).equals(uuid.toString(), "should have the same content UUID");

      realm.write(() => (data.a = d128));
      expect(data.a.toString()).equals(d128.toString(), "Should be the same Decimal128");

      realm.write(() => (data.a = 12345678));
      expect(data.a).equals(12345678, "Should be the same 12345678");

      realm.write(() => ((data.a = null), "Should be the same null"));
      expect(data.a).equals(null);

      realm.write(() => ((data.a = undefined), "Should be the same null"));
      expect(data.a).equals(null);
    });
    it("wrong type throws", function (this: RealmContext) {
      expect(() => {
        realm.write(() => realm.create(SingleSchema.name, { a: Object.create({}) }));
      }).throws(TypeError, "Unable to convert an object with ctor 'Object' to a Mixed");
    });
  });

  describe("Nested types", () => {
    let realm: Realm;
    beforeEach(() => {
      Realm.clearTestState();
      realm = new Realm({ schema: [SingleSchema, VertexSchema, MixNestedSchema] });
    });
    afterEach(() => {
      realm.close();
    });
    it("support nested types", function (this: RealmContext) {
      realm.write(() => {
        const r = realm.create(VertexSchema.name, { a: 1, b: 0, c: 0 });
        const r2 = realm.create(VertexSchema.name, { a: 0, b: 1, c: 0 });
        const r3 = realm.create(VertexSchema.name, { a: 0, b: 0, c: 1 });

        realm.create(SingleSchema.name, { a: r, b: r2, c: r3, d: null });
      });

      let data = realm.objects(SingleSchema.name)[0];

      expect(data.a.a).equals(1, "Should be equal 1");
      expect(data.a.b).equals(0, "Should be equal 0");
      expect(data.a.c).equals(0, "Should be equal 0");

      expect(data.b.a).equals(0, "Should be equal 0");
      expect(data.b.b).equals(1, "Should be equal 1");
      expect(data.b.c).equals(0, "Should be equal 0");

      expect(data.c.a).equals(0, "Should be equal 0");
      expect(data.c.b).equals(0, "Should be equal 0");
      expect(data.c.c).equals(1, "Should be equal 1");

      realm.write(() => {
        const r = realm.create(MixNestedSchema.name, { a: 0, b: -1 });
        const r1 = realm.create(MixNestedSchema.name, { a: 1, b: 0 });
        realm.create(SingleSchema.name, { a: r, b: r1 });
      });

      data = realm.objects(SingleSchema.name)[1];

      expect(data.a.a).equals(0, "Should be equal 0");
      expect(data.a.b).equals(-1, "Should be equal -1");

      expect(data.b.a).equals(1, "Should be equal 1");
      expect(data.b.b).equals(0, "Should be equal 0");
    });
  });

  describe("Nullable types", () => {
    let realm: Realm;
    beforeEach(() => {
      Realm.clearTestState();
      realm = new Realm({ schema: [MixedNullableSchema] });
    });
    afterEach(() => {
      realm.close();
    });
    it("support nullable types", function (this: RealmContext) {
      realm.write(() => realm.create(MixedNullableSchema.name, { nullable: undefined }));

      const value = realm.objects(MixedNullableSchema.name)[0];
      realm.write(() => (value.nullable = null));
      realm.write(() => (value.nullable = undefined));

      realm.write(() => {
        value.nullable_list = [6, null, undefined, null, 5];
      });
      expect(value.nullable_list[0]).equals(6, "Should be equal 6");
      expect(value.nullable_list[1]).equals(null, "Should be equal null");
      expect(value.nullable_list[2]).equals(null, "Should be equal null");
      expect(value.nullable_list[3]).equals(null, "Should be equal null");
      expect(value.nullable_list[4]).equals(5, "Should be equal 5");
    });
  });
  describe("Mixed arrays", () => {
    let realm: Realm;
    beforeEach(() => {
      Realm.clearTestState();
      realm = new Realm({ schema: [MixedSchema] });
    });
    afterEach(() => {
      realm.close();
    });
    it("throws when creating an array of multiple values", function (this: RealmContext) {
      const objectsBefore = realm.objects(MixedSchema.name);
      expect(objectsBefore.length).equals(0);

      // check if the understandable error message is thrown
      expect(() => {
        realm.write(() => {
          realm.create("MixedClass", { value: [123, false, "hello"] });
        });
      }).throws(TypeError, "A mixed property cannot contain an array of values.");

      //  verify that the transaction has been rolled back
      const objectsAfter = realm.objects(MixedSchema.name);
      expect(objectsAfter.length).equals(0);
    });
    it("support datatypes with binary data contents", function (this: RealmContext) {
      const uint8Values1 = [0, 1, 2, 4, 8];
      const uint8Values2 = [255, 128, 64, 32, 16, 8];
      const uint8Buffer1 = new Uint8Array(uint8Values1).buffer;
      const uint8Buffer2 = new Uint8Array(uint8Values2).buffer;
      realm.write(() => {
        realm.create("MixedClass", { value: uint8Buffer1 });
      });
      let mixedObjects = realm.objects("MixedClass");
      let returnedData = [...new Uint8Array(mixedObjects[0].value)];
      expect(returnedData).eql(uint8Values1);

      realm.write(() => {
        mixedObjects[0].value = uint8Buffer2;
      });

      mixedObjects = realm.objects("MixedClass");
      returnedData = [...new Uint8Array(mixedObjects[0].value)];
      expect(returnedData).eql(uint8Values2);

      realm.write(() => {
        realm.deleteAll();
      });

      // Test with empty array
      realm.write(() => {
        realm.create("MixedClass", { value: new Uint8Array(0).buffer });
      });

      const emptyArrayBuffer = mixedObjects[0].value;
      expect(emptyArrayBuffer).to.be.instanceOf(ArrayBuffer);
      expect(emptyArrayBuffer.byteLength).equals(0);

      realm.write(() => {
        realm.deleteAll();
      });

      // test with 16-bit values
      const uint16Values = [0, 512, 256, 65535];
      const uint16Buffer = new Uint16Array(uint16Values).buffer;
      realm.write(() => {
        realm.create("MixedClass", { value: uint16Buffer });
      });

      const uint16Objects = realm.objects("MixedClass");
      returnedData = [...new Uint16Array(uint16Objects[0].value)];
      expect(returnedData).eql(uint16Values);

      realm.write(() => {
        realm.deleteAll();
      });

      // test with 32-bit values
      const uint32Values = [0, 121393, 121393, 317811, 514229, 4294967295];
      const uint32Buffer = new Uint32Array(uint32Values).buffer;
      realm.write(() => {
        realm.create("MixedClass", { value: uint32Buffer });
      });

      const uint32Objects = realm.objects("MixedClass");
      returnedData = [...new Uint32Array(uint32Objects[0].value)];
      expect(returnedData).eql(uint32Values);

      realm.close();
    });
  });
});
