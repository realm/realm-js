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

import { Buffer } from "buffer";
import { expect } from "chai";
import Realm from "realm";
import { openRealmBeforeEach } from "../hooks";

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";

const SingleSchema: Realm.ObjectSchema = {
  name: "PrimitiveData",
  properties: {
    a: "data",
  },
};

interface ISingleSchema {
  a: ArrayBuffer;
}

describe("ArrayBuffer", () => {
  openRealmBeforeEach({ schema: [SingleSchema] });
  it("supports bufferView", function (this: RealmContext) {
    const view = new Uint8Array([
      0xd8,
      0x21,
      0xd6,
      0xe8,
      0x00,
      0x57,
      0xbc,
      0xb2,
      0x6a,
      0x15,
      0x77,
      0x30,
      0xac,
      0x77,
      0x96,
      0xd9,
      0x67,
      0x1e,
      0x40,
      0xa7,
      0x6d,
      0x52,
      0x83,
      0xda,
      0x07,
      0x29,
      0x9c,
      0x70,
      0x38,
      0x48,
      0x4e,
      0xff,
    ]);

    this.realm.write(() => this.realm.create(SingleSchema.name, { a: view }));

    const data = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];
    expect(data.a.byteLength).equals(view.byteLength, "Data size should be equals");

    const binary_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      const p1 = view[i];
      const p2 = binary_view[i];
      expect(p1).equals(p2, "buffers should be equals");
    }
  });
  it("supports bufferDataView", function (this: RealmContext) {
    const view = new Uint8Array([
      0xd8,
      0x21,
      0xd6,
      0xe8,
      0x00,
      0x57,
      0xbc,
      0xb2,
      0x6a,
      0x15,
      0x77,
      0x30,
      0xac,
      0x77,
      0x96,
      0xd9,
      0x67,
      0x1e,
      0x40,
      0xa7,
      0x6d,
      0x52,
      0x83,
      0xda,
      0x07,
      0x29,
      0x9c,
      0x70,
      0x38,
      0x48,
      0x4e,
      0xff,
    ]);

    this.realm.write(() => this.realm.create(SingleSchema.name, { a: new DataView(view.buffer) }));

    const data = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];
    expect(data.a.byteLength).equals(view.byteLength, "Data size should be equals");

    const binary_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      const p1 = view[i];
      const p2 = binary_view[i];

      expect(p1).equals(p2, "buffers should be equals");
    }
  });
  it("supports arrayBuffer", function (this: RealmContext) {
    const array_buffer = new ArrayBuffer(32);
    const view = new Uint8Array(array_buffer);
    view.set([
      0xd8,
      0x21,
      0xd6,
      0xe8,
      0x00,
      0x57,
      0xbc,
      0xb2,
      0x6a,
      0x15,
      0x77,
      0x30,
      0xac,
      0x77,
      0x96,
      0xd9,
      0x67,
      0x1e,
      0x40,
      0xa7,
      0x6d,
      0x52,
      0xca,
      0xfe,
      0xba,
      0xbe,
      0x9c,
      0x70,
      0x38,
      0x48,
      0x4e,
      0xff,
    ]);

    this.realm.write(() => this.realm.create(SingleSchema.name, { a: array_buffer }));

    const data = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];
    expect(data.a.byteLength).equals(array_buffer.byteLength, "Data size should be equals");
    const ab_view = new Uint8Array(data.a);

    for (let i = 0; i < view.byteLength; i++) {
      const p1 = view[i];
      const p2 = ab_view[i];
      expect(p1).equals(p2, "buffers should be equals");
    }
  });
  it("supports arrayBuffer-nodeBuffer", function (this: RealmContext) {
    if (!isNodeProcess) {
      return;
    }

    const n_buffer = Buffer.from([0xca, 0xfe, 0xba, 0xbe]);
    this.realm.write(() => this.realm.create(SingleSchema.name, { a: n_buffer }));

    const data = this.realm.objects<ISingleSchema>(SingleSchema.name)[0];
    expect(data.a.byteLength).equals(n_buffer.byteLength, "Data size should be equals");

    const into_int = new Uint8Array(data.a);

    for (let i = 0; i < n_buffer.byteLength; i++) {
      const p1 = n_buffer[i];
      const p2 = into_int[i];
      expect(p1).equals(p2, "Data points should be the same");
    }
  });
  it("supports inserting empty arrayBuffer", function (this: RealmContext) {
    // TODO: Only NodeJS implementation verify for empty buffer.
    if (!isNodeProcess) {
      return;
    }

    SingleSchema.properties.a = "data?";
    expect(() => {
      this.realm.write(() => this.realm.create(SingleSchema.name, { a: new ArrayBuffer(0) }));
    }).to.not.throw();
  });
  it("supports inserting null for optional arrayBuffer", function (this: RealmContext) {
    SingleSchema.properties.a = "data?";
    expect(() => {
      this.realm.write(() => this.realm.create(SingleSchema.name, { a: null }));
      const _ = this.realm.objects(SingleSchema.name)[0];
    }).to.not.throw();
  });
  it("handles wrong input", function (this: RealmContext) {
    expect(() => {
      this.realm.write(() => this.realm.create(SingleSchema.name, { a: {} }));
    }).throws(Error, "PrimitiveData.a must be of type 'binary?', got 'object' ([object Object])");
  });
});
