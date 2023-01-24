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

export function expectSimilar(type: string, val1: unknown, val2: unknown): void {
  if (val2 === null) {
    expect(val1).equals(null);
    return;
  }
  type = type.replace("?", "");
  switch (type) {
    case "float":
    case "double":
      expectDecimalEqual(val1 as number, val2 as number);
      break;
    case "decimal128":
    case "objectId":
    case "uuid":
      expectBSONEqual(val1 as BSON, val2 as BSON);
      break;
    case "data":
      expectArraysEqual(new Uint8Array(val1 as number), val2);
      break;
    case "date":
      expectDateEqual(val1 as Date, val2 as Date);
      break;
    case "object":
      expectObjectEquals(val1, val2);
      break;
    case "list":
      expectArraysEqual(val1, val2);
      break;
    default:
      expect(val1).equals(val2);
      break;
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
  switch (val1.type) {
    case "data":
      compare = (_i: number, a: ArrayBuffer, b: Uint8Array) =>
        a === b || expectArraysEqual(new Uint8Array(a), b) || true;
      break;
    case "date":
      compare = (_i: number, a: Date, b: Date) => expectDateEqual(a, b);
      break;
    case "float":
    case "double":
      compare = (_i: number, a: number, b: number) => expectDecimalEqual(a, b);
      break;
    case "object":
      compare = (_i: number, a: any, b: any) => expectObjectEquals(a, b);
      break;
    case "decimal128":
    case "objectId":
    case "uuid":
      compare = (_i: number, a: BSON, b: BSON) => expectBSONEqual(a, b);
      break;
    default:
      compare = (_i: number, a: any, b: any) => expect(a).equals(b);
      break;
  }

  for (let i = 0; i < val1.length; i++) {
    compare(i, val1[i], val2[i]);
  }
}
