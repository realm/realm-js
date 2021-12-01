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

"use strict";

const Realm = require("realm");
const TestCase = require("./asserts");

const { Decimal128, ObjectId, UUID } = Realm.BSON;

const SingleSchema = {
  name: "mixed",
  properties: {
    a: "mixed",
    b: "mixed",
    c: "mixed",
    d: "mixed",
  },
};

module.exports = {
  testMixedPrimitive() {
    let realm = new Realm({ schema: [SingleSchema] });
    realm.write(() => realm.create(SingleSchema.name, { a: "xxxxxx", b: 555, c: true }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a, "xxxxxx", "should store xxxxxx");
    TestCase.assertEqual(data.b, 555, "should store 555");
    TestCase.assertEqual(data.c, true, "should store boolean (true)");
  },

  testMixedQuery() {
    const N = 100;
    let realm = new Realm({ schema: [SingleSchema] });
    for (let i = 0; i < N; i++) {
      realm.write(() => realm.create(SingleSchema.name, { a: "xxxxxx", b: "xxx", c: i }));
    }

    let data = realm.objects(SingleSchema.name);
    let section = data.filtered('a BEGINSWITH "x" AND b BEGINSWITH "x"');
    let half = data.filtered("c < 50");

    TestCase.assertEqual(section.length, N, "We expect only 100 items.");
    TestCase.assertEqual(half.length, N / 2, "We expect only 50 items.");
  },

  testMixedComplexTypes() {
    let realm = new Realm({ schema: [SingleSchema] });
    let d128 = Decimal128.fromString("6.022e23");
    let oid = new ObjectId();
    let uuid = new UUID();
    let date = new Date();

    realm.write(() => realm.create(SingleSchema.name, { a: oid, b: uuid, c: d128, d: date }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertTrue(typeof data.a === typeof oid, "should be the same type ObjectId");
    TestCase.assertEqual(data.a.toString(), oid.toString(), "should be the same ObjectId");
    TestCase.assertEqual(data.b.toString(), uuid.toString(), "Should be the same UUID");
    TestCase.assertEqual(data.c.toString(), d128.toString(), "Should be the same Decimal128");
    TestCase.assertEqual(data.d.toString(), date.toString(), "Should be the same Date");
  },

  testMixedMutability() {
    let realm = new Realm({ schema: [SingleSchema] });
    let d128 = Decimal128.fromString("6.022e23");
    let oid = new ObjectId();
    let uuid = new UUID();
    let date = new Date();

    realm.write(() => realm.create(SingleSchema.name, { a: oid }));
    let data = realm.objects(SingleSchema.name)[0];

    TestCase.assertTrue(typeof data.a === typeof oid, "should be the same type ObjectId");
    TestCase.assertEqual(data.a.toString(), oid.toString(), "should have the same content");

    realm.write(() => (data.a = uuid));
    TestCase.assertTrue(typeof data.a === typeof uuid, "should be the same type UUID");
    TestCase.assertEqual(data.a.toString(), uuid.toString(), "should have the same content UUID");

    realm.write(() => (data.a = d128));
    TestCase.assertEqual(data.a.toString(), d128.toString(), "Should be the same Decimal128");

    realm.write(() => (data.a = 12345678));
    TestCase.assertEqual(data.a, 12345678, "Should be the same 12345678");

    realm.write(() => (data.a = null));
    TestCase.assertEqual(data.a, null, "Should be the same null");

    realm.write(() => (data.a = undefined));
    TestCase.assertEqual(data.a, null, "Should be the same null");
  },

  testMixedRelationalCapabilities() {
    const VertexSchema = {
      name: "Vertex",
      properties: {
        a: "int",
        b: "int",
        c: "int",
      },
    };

    const MixNestedSchema = {
      name: "Nested",
      properties: {
        a: "mixed",
        b: "mixed",
        c: "mixed",
      },
    };

    let realm = new Realm({ schema: [SingleSchema, VertexSchema, MixNestedSchema] });

    realm.write(() => {
      let r = realm.create(VertexSchema.name, { a: 1, b: 0, c: 0 });
      let r2 = realm.create(VertexSchema.name, { a: 0, b: 1, c: 0 });
      let r3 = realm.create(VertexSchema.name, { a: 0, b: 0, c: 1 });

      realm.create(SingleSchema.name, { a: r, b: r2, c: r3 });
    });

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a.a, 1, "Should be equal 1");
    TestCase.assertEqual(data.a.b, 0, "Should be equal 0");
    TestCase.assertEqual(data.a.c, 0, "Should be equal 0");

    TestCase.assertEqual(data.b.a, 0, "Should be equal 0");
    TestCase.assertEqual(data.b.b, 1, "Should be equal 1");
    TestCase.assertEqual(data.b.c, 0, "Should be equal 0");

    TestCase.assertEqual(data.c.a, 0, "Should be equal 0");
    TestCase.assertEqual(data.c.b, 0, "Should be equal 0");
    TestCase.assertEqual(data.c.c, 1, "Should be equal 1");

    realm.write(() => {
      let r = realm.create(MixNestedSchema.name, { a: 0, b: -1 });
      let r1 = realm.create(MixNestedSchema.name, { a: 1, b: 0 });
      realm.create(SingleSchema.name, { a: r, b: r1 });
    });

    data = realm.objects(SingleSchema.name)[1];

    TestCase.assertEqual(data.a.a, 0, "Should be equal 0");
    TestCase.assertEqual(data.a.b, -1, "Should be equal -1");

    TestCase.assertEqual(data.b.a, 1, "Should be equal 1");
    TestCase.assertEqual(data.b.b, 0, "Should be equal 0");
  },

  testMixedWrongType() {
    let realm = new Realm({ schema: [SingleSchema] });

    TestCase.assertThrowsContaining(
      () => realm.write(() => realm.create(SingleSchema.name, { a: Object.create({}) })),
      "Only Realm instances are supported.",
    );
  },

  testMixedEmptyValues() {
    const MixedNullableSchema = {
      name: "mixed",
      properties: {
        nullable: "mixed",
        nullable_list: "mixed[]",
      },
    };

    let realm = new Realm({ schema: [MixedNullableSchema] });
    realm.write(() => realm.create(MixedNullableSchema.name, { nullable: undefined }));

    let value = realm.objects(MixedNullableSchema.name)[0];
    realm.write(() => (value.nullable = null));
    realm.write(() => (value.nullable = undefined));

    realm.write(() => {
      value.nullable_list = [6, null, undefined, null, 5];
    });

    TestCase.assertEqual(value.nullable_list[0], 6, "Should be equal 6");
    TestCase.assertEqual(value.nullable_list[1], null, "Should be equal null");
    TestCase.assertEqual(value.nullable_list[2], null, "Should be equal null");
    TestCase.assertEqual(value.nullable_list[3], null, "Should be equal null");
    TestCase.assertEqual(value.nullable_list[4], 5, "Should be equal 5");
  },

  testMixedValuesAsArray() {
    const MixedSchema = {
      name: "MixedClass",
      properties: { value: "mixed" },
    };

    const realm = new Realm({ schema: [MixedSchema] });

    const objectsBefore = realm.objects(MixedSchema.name);
    TestCase.assertEqual(objectsBefore.length, 0);

    // check if the understandable error message is thrown
    TestCase.assertThrowsContaining(() => {
      realm.write(() => {
        realm.create("MixedClass", { value: [123, false, "hello"] });
      });
    }, "A mixed property cannot contain an array of values.");

    //  verify that the transaction has been rolled back
    const objectsAfter = realm.objects(MixedSchema.name);
    TestCase.assertEqual(objectsAfter.length, 0);

    realm.close();
  },
};
