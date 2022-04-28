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

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const Realm = require("realm");
let TestCase = require("./asserts");

const SingleSchema = {
  name: "PrimitiveData",
  properties: {
    a: "data",
  },
};

module.exports = {
  testABufferView() {
    let realm = new Realm({ schema: [SingleSchema] });
    const view = new Uint8Array([
      0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9, 0x67, 0x1e, 0x40,
      0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
    ]);

    realm.write(() => realm.create(SingleSchema.name, { a: view }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a.byteLength, view.byteLength, "Data size should be equals");

    let binary_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      let p1 = view[i];
      let p2 = binary_view[i];

      TestCase.assertEqual(p1, p2, "buffers should be equals");
    }
  },

  testABufferDataView() {
    let realm = new Realm({ schema: [SingleSchema] });
    const view = new Uint8Array([
      0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9, 0x67, 0x1e, 0x40,
      0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
    ]);

    realm.write(() => realm.create(SingleSchema.name, { a: new DataView(view.buffer) }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a.byteLength, view.byteLength, "Data size should be equals");

    let binary_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      let p1 = view[i];
      let p2 = binary_view[i];

      TestCase.assertEqual(p1, p2, "buffers should be equals");
    }
  },

  testABuffer() {
    let realm = new Realm({ schema: [SingleSchema] });
    let array_buffer = new ArrayBuffer(32);
    const view = new Uint8Array(array_buffer);
    view.set([
      0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9, 0x67, 0x1e, 0x40,
      0xa7, 0x6d, 0x52, 0xca, 0xfe, 0xba, 0xbe, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
    ]);

    realm.write(() => realm.create(SingleSchema.name, { a: array_buffer }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a.byteLength, array_buffer.byteLength, "Data size should be equals");
    let ab_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      let p1 = view[i];
      let p2 = ab_view[i];
      TestCase.assertEqual(p1, p2, "buffers should be equals");
    }
  },

  testABNodeBuffer() {
    if (!isNodeProcess) {
      return;
    }

    let realm = new Realm({ schema: [SingleSchema] });
    let n_buffer = Buffer.from([0xca, 0xfe, 0xba, 0xbe]);
    realm.write(() => realm.create(SingleSchema.name, { a: n_buffer }));

    let data = realm.objects(SingleSchema.name)[0];
    TestCase.assertEqual(data.a.byteLength, n_buffer.length, "Data size should be equals");

    let into_int = new Uint8Array(data.a);

    for (let i = 0; i < n_buffer.byteLength; i++) {
      let p1 = n_buffer[i];
      let p2 = into_int[i];
      TestCase.assertEqual(p1, p2, "Data points should be the same");
    }
  },

  testABEmptyInputValidation() {
    // TODO: Only NodeJS implementation verify for empty buffer.
    if (!isNodeProcess) {
      return;
    }

    SingleSchema.properties.a = "data?";
    let realm = new Realm({ schema: [SingleSchema] });

    realm.write(() => realm.create(SingleSchema.name, { a: new ArrayBuffer() }));
  },

  testABEmptyOptionalInputValidation() {
    SingleSchema.properties.a = "data?";
    let realm = new Realm({ schema: [SingleSchema] });

    // No exceptions are expected here...
    realm.write(() => realm.create(SingleSchema.name, { a: null }));
    let data = realm.objects(SingleSchema.name)[0];
  },

  testABHandlingWrongInput() {
    let realm = new Realm({ schema: [SingleSchema] });
    TestCase.assertThrows(
      () => realm.write(() => realm.create(SingleSchema.name, { a: {} })),
      "An unsupported value for 'binary' did not throw as expected.",
    );
  },
};
