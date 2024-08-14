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

import { assert } from "../assert";
import type { binding } from "./wrapper.generated";

export class NativeBigInt {
  static add(a: binding.Int64, b: binding.Int64): binding.Int64 {
    assert(typeof a === "bigint");
    assert(typeof b === "bigint");
    return (a + b) as unknown as binding.Int64;
  }

  static equals(a: binding.Int64, b: binding.Int64 | number | string) {
    assert(typeof a === "bigint");
    assert(typeof b === "bigint" || typeof b === "number" || typeof b === "string");
    return a == b; // using == rather than === to support number and string RHS!
  }

  static isInt(a: unknown): a is binding.Int64 {
    return typeof a === "bigint";
  }

  static numToInt(a: number) {
    return BigInt(a) as unknown as binding.Int64;
  }

  static strToInt(a: string) {
    return BigInt(a) as unknown as binding.Int64;
  }

  static intToNum(a: binding.Int64) {
    return Number(a);
  }
}
