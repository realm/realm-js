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

import Realm from "realm";
import { Decimal128, ObjectId, UUID } from "bson";
import { expect } from "chai";
import { openRealmBefore } from "../hooks";

type ISingleSchema = {
  a: Realm.Mixed;
  b: Realm.Mixed;
  c: Realm.Mixed;
  d: Realm.Mixed;
};

type IVertexSchema = {
  a: number;
  b: number;
  c: number;
};

type IMixNestedSchema = {
  a: Realm.Mixed;
  b: Realm.Mixed;
  c: Realm.Mixed;
  d: Realm.Mixed;
};

type IMixedNullableSchema = {
  nullable: Realm.Mixed;
  nullable_list: Realm.Mixed[];
};

type IMixedSchema = {
  value: Realm.Mixed;
};

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
    openRealmBefore({ schema: [SingleSchema] });
    it("support primitives", function (this: RealmContext) {
      this.realm.write(() => this.realm.create(SingleSchema.name, { a: "xxxxxx", b: 555, c: true }));
      const data = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];
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
      const d128 = Decimal128.fromString("6.022e23");
      const oid = new ObjectId();
      const uuid = new UUID();
      const date = new Date();

      const data: ISingleSchema = this.realm.write(() =>
        this.realm.create(SingleSchema.name, { a: oid, b: uuid, c: d128, d: date }),
      );

      expect(typeof data.a === typeof oid, "should be the same type ObjectId");
      expect(String(data.a)).equals(oid.toString(), "should be the same ObjectId");
      expect(String(data.b)).equals(uuid.toString(), "Should be the same UUID");
      expect(String(data.c)).equals(d128.toString(), "Should be the same Decimal128");
      expect(String(data.d)).equals(date.toString(), "Should be the same Date");
    });

    it("support mixed mutability", function (this: RealmContext) {
      const d128 = Decimal128.fromString("6.022e23");
      const oid = new ObjectId();
      const uuid = new UUID();
      const date = new Date();

      const data: ISingleSchema = this.realm.write(() =>
        this.realm.create<ISingleSchema>(SingleSchema.name, { a: oid }),
      );
      expect(typeof data.a === typeof oid, "should be the same type ObjectId");
      expect(String(data.a)).equals(oid.toString(), "should have the same content");

      this.realm.write(() => (data.a = uuid));
      expect(typeof data.a === typeof uuid, "should be the same type UUID");
      expect(String(data.a)).equals(uuid.toString(), "should have the same content UUID");

      this.realm.write(() => (data.a = d128));
      expect(String(data.a)).equals(d128.toString(), "Should be the same Decimal128");

      this.realm.write(() => (data.a = 12345678));
      expect(data.a).equals(12345678, "Should be the same 12345678");

      this.realm.write(() => ((data.a = null), "Should be the same null"));
      expect(data.a).equals(null);

      this.realm.write(() => ((data.a = undefined), "Should be the same null"));
      expect(data.a).equals(null);
    });
    it("wrong type throws", function (this: RealmContext) {
      expect(() => {
        this.realm.write(() => this.realm.create(SingleSchema.name, { a: Object.create({}) }));
      }).throws(Error, "Only Realm instances are supported.");
    });
  });

  describe("Nested types", () => {
    openRealmBefore({ schema: [SingleSchema, VertexSchema, MixNestedSchema] });
    it("support nested types", function (this: RealmContext) {
      this.realm.write(() => {
        const r = this.realm.create(VertexSchema.name, { a: 1, b: 0, c: 0 });
        const r2 = this.realm.create(VertexSchema.name, { a: 0, b: 1, c: 0 });
        const r3 = this.realm.create(VertexSchema.name, { a: 0, b: 0, c: 1 });

        this.realm.create(SingleSchema.name, { a: r, b: r2, c: r3, d: null });
      });

      let data: ISingleSchema = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];

      expect((data.a as IVertexSchema).a).equals(1, "Should be equal to 1");
      expect((data.a as IVertexSchema).b).equals(0, "Should be equal 0");
      expect((data.a as IVertexSchema).c).equals(0, "Should be equal 0");

      expect((data.b as IVertexSchema).a).equals(0, "Should be equal 0");
      expect((data.b as IVertexSchema).b).equals(1, "Should be equal 1");
      expect((data.b as IVertexSchema).c).equals(0, "Should be equal 0");

      expect((data.c as IVertexSchema).a).equals(0, "Should be equal 0");
      expect((data.c as IVertexSchema).b).equals(0, "Should be equal 0");
      expect((data.c as IVertexSchema).c).equals(1, "Should be equal 1");

      this.realm.write(() => {
        const r = this.realm.create(MixNestedSchema.name, { a: 0, b: -1 });
        const r1 = this.realm.create(MixNestedSchema.name, { a: 1, b: 0 });
        this.realm.create(SingleSchema.name, { a: r, b: r1 });
      });

      data = this.realm.objects<ISingleSchema>(SingleSchema.name)[1];

      expect((data.a as IVertexSchema).a).equals(0, "Should be equal 0");
      expect((data.a as IVertexSchema).b).equals(-1, "Should be equal -1");

      expect((data.b as IVertexSchema).a).equals(1, "Should be equal 1");
      expect((data.b as IVertexSchema).b).equals(0, "Should be equal 0");
    });
  });

  describe("Nullable types", () => {
    openRealmBefore({ schema: [MixedNullableSchema] });
    it("supports nullable types", function (this: RealmContext) {
      this.realm.write(() => this.realm.create(MixedNullableSchema.name, { nullable: undefined }));

      const value = this.realm.objects<IMixedNullableSchema>(MixedNullableSchema.name)[0];
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
  describe("Mixed arrays", () => {
    openRealmBefore({ schema: [MixedSchema] });
    it("throws when creating an array of multiple values", function (this: RealmContext) {
      const objectsBefore = this.realm.objects(MixedSchema.name);
      expect(objectsBefore.length).equals(0);

      // check if the understandable error message is thrown
      expect(() => {
        this.realm.write(() => {
          this.realm.create("MixedClass", { value: [123, false, "hello"] });
        });
      }).throws(Error, "A mixed property cannot contain an array of values.");

      //  verify that the transaction has been rolled back
      const objectsAfter = this.realm.objects(MixedSchema.name);
      expect(objectsAfter.length).equals(0);
    });
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
