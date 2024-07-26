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

import { binding } from "../binding";
import { assert } from "../assert";
import { safeGlobalThis } from "../safeGlobalThis";

/** @internal */
export const TYPED_ARRAY_CONSTRUCTORS = new Set(
  [
    DataView,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    // These will not be present on old versions of JSC without BigInt support.
    safeGlobalThis.BigInt64Array,
    safeGlobalThis.BigUint64Array,
  ].filter((ctor) => ctor !== undefined),
);

/** @internal */
export function toArrayBuffer(value: unknown, stringToBase64 = true) {
  if (typeof value === "string" && stringToBase64) {
    return binding.Helpers.base64Decode(value);
  }
  for (const TypedArray of TYPED_ARRAY_CONSTRUCTORS) {
    if (value instanceof TypedArray) {
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    }
  }
  assert.instanceOf(value, ArrayBuffer);
  return value;
}
