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

import type { binding } from "./wrapper.generated";

export const NativeBigInt: typeof binding.Int64 = Object.freeze({
  add(a: binding.Int64, b: binding.Int64) {
    return a + b;
  },
  equals(a: binding.Int64, b: binding.Int64 | number | string) {
    return a == b;
  }, // using == rather than === to support number and string RHS!
  isInt(a: unknown): a is binding.Int64 {
    return typeof a === "bigint";
  },
  numToInt(a: number) {
    return BigInt(a) as unknown as binding.Int64;
  },
  strToInt(a: string) {
    return BigInt(a) as unknown as binding.Int64;
  },
  intToNum(a: binding.Int64) {
    return Number(a);
  },
});
