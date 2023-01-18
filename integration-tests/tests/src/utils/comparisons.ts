////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { Decimal128, ObjectId, UUID } from "bson";
import { expect } from "chai";
type BSON = Decimal128 | ObjectId | UUID | null;

export function expectSimilar(type: string, val1: any, val2: any) {
  type = type.replace("?", "");
  if (val2 === null) {
    expect(val1).equals(null);
    return;
  } else if (type === "float" || type === "double") {
    expectDecimalEqual(val1, val2);
  } else if (type === "decimal128" || type === "objectId" || type === "uuid") {
    expectBSONEqual(val1.toString(), val2.toString());
  } else if (type === "data") {
    expectArraysEqual(new Uint8Array(val1), val2);
  } else if (type === "date") {
    expectDateEqual(val1, val2);
  } else if (type === "object") {
    expectObjectEquals(val1, val2);
  } else if (type === "list") {
    expectArraysEqual(val1, val2);
  } else {
    expect(val1).equals(val2);
  }
}
////////////////////////////////////////////////////////////////////////////
export function expectDecimalEqual(val1: number | null, val2: number | null): void {
  if (val2 === null) {
    expect(val1).to.be.null;
  } else {
    expect(val1).to.be.closeTo(val2, 0.000001);
  }
}

export function expectDateEqual(val1: Date, val2: Date): void {
  expect(val1 && val1.getTime()).equals(val2 && val2.getTime());
}

export function expectBSONEqual(val1: BSON, val2: BSON): void {
  expect(val1 && val1.toString()).equals(val2 && val2.toString());
}

export function expectObjectEquals(a: any, b: any): void {
  const keys = a.keys !== undefined ? a.keys() : Object.keys(a);
  return keys.every((key: any) => expect(a[key]).equals(b[key]));
}

export function expectArraysEqual(val1: any, val2: any): void {
  expect(val1).not.to.equals(null);
  expect(val1).not.to.equals(undefined);
  expect(val2).not.to.equals(null);
  expect(val2).not.to.equals(undefined);
  expect(val1.length).equals(val2.length);
  let compare;
  if (val1.type === "data") {
    compare = (_i: number, a: ArrayBuffer, b: Uint8Array) => a === b || expectArraysEqual(new Uint8Array(a), b) || true;
  } else if (val1.type === "date") {
    compare = (_i: number, a: Date, b: Date) => expectDateEqual(a, b);
  } else if (val1.type === "float" || val1.type === "double") {
    compare = (_i: number, a: number, b: number) => expectDecimalEqual(a, b);
  } else if (val1.type === "object") {
    compare = (_i: number, a: any, b: any) => expectObjectEquals(a, b);
  } else if (val1.type === "decimal128" || val1.type === "objectId" || val1.type === "uuid") {
    compare = (_i: number, a: BSON, b: BSON) => expectBSONEqual(a, b);
  } else {
    compare = (_i: number, a: any, b: any) => expect(a).equals(b);
  }

  for (let i = 0; i < val1.length; i++) {
    compare(i, val1[i], val2[i]);
  }
}
