////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { IndexSet, ObjKey, Timestamp } from "../generated/ts/native.mjs";

/** @internal */
export * from "../generated/ts/native.mjs"; // core types are transitively exported.

/** @internal */
declare module "../generated/ts/native.mjs" {
  interface IndexSet {
    asIndexes(): Iterator<number>;
  }
  interface Timestamp {
    toDate(): Date;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Timestamp {
    export function fromDate(d: Date): Timestamp;
  }
}

IndexSet.prototype.asIndexes = function* (this: IndexSet) {
  for (const [from, to] of this) {
    let i = from;
    while (i < to) {
      yield i;
      i++;
    }
  }
};

Timestamp.fromDate = (d: Date) =>
  Timestamp.make(BigInt(Math.floor(d.valueOf() / 1000)), (d.valueOf() % 1000) * 1000_000);

Timestamp.prototype.toDate = function () {
  return new Date(Number(this.seconds) * 1000 + this.nanoseconds / 1000_000);
};

export class InvalidObjKey extends TypeError {
  constructor(input: string) {
    super(`Cannot convert '${input}' to an ObjKey`);
  }
}

export function stringToObjKey(input: string): ObjKey {
  try {
    return BigInt(input) as unknown as ObjKey;
  } catch {
    throw new InvalidObjKey(input);
  }
}

export function isEmptyObjKey(objKey: ObjKey) {
  return (objKey as unknown as bigint) === -1n;
}
