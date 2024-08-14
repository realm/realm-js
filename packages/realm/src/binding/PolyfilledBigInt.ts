////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { Long } from "bson";

import type { binding } from "./wrapper.generated";
import { assert } from "../assert";

export class PolyfilledBigInt {
  static add(a: binding.Int64, b: binding.Int64) {
    assert.instanceOf(a, Long);
    assert.instanceOf(b, Long);
    return a.add(b) as unknown as binding.Int64;
  }

  static equals(a: binding.Int64, b: binding.Int64 | number | string) {
    assert.instanceOf(a, Long);
    assert(
      typeof b === "number" || typeof b === "string" || (typeof b === "object" && b instanceof Long),
      "Expected a 'BSON.Long', or number, or string.",
    );
    return a.equals(b);
  }

  static isInt(a: unknown): a is binding.Int64 {
    return a instanceof Long;
  }

  static numToInt(a: number) {
    return Long.fromNumber(a) as unknown as binding.Int64;
  }

  static strToInt(a: string) {
    return Long.fromString(a) as unknown as binding.Int64;
  }

  static intToNum(a: binding.Int64) {
    assert.instanceOf(a, Long);
    return a.toNumber();
  }
}
