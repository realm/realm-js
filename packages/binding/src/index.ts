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

// enums are transitively exported.
export * from "../generated/ts/native.js";

import { DataType, Decimal128, Mixed, ObjectId, ObjLink, Timestamp, Uuid } from "../generated/ts/native.js";

const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

// Make Mixed easier to work with.
export type MixedValues =
  | null //
  | bigint
  | boolean
  | number
  | string
  | ArrayBuffer
  | Timestamp
  | Decimal128
  | ObjectId
  | Uuid
  | ObjLink;

declare module "../generated/ts/native.js" {
  interface Mixed {
    toJsValue(): MixedValues;
    toString(): string;
    [customInspectSymbol](): string;
  }
}

Mixed.prototype.toJsValue = function () {
  if (this.isNull()) return null;

  const t = this.type;
  switch (t) {
    case DataType.Int:
      return this.getInt(); // Note: returns bigint, not number
    case DataType.String:
      return this.getString();
    case DataType.Float:
      return this.getFloat();
    case DataType.Double:
      return this.getDouble();
  }
  throw new Error(`Unsupported DataType for Mixed.toJsValue(): ${t}`);
};

Mixed.prototype.toString = function () {
  if (this.isNull()) return "Mixed(null)";

  try {
    switch (this.type) {
      case DataType.Float:
        return `Mixed(float:${this.toJsValue()})`;
      default:
        return `Mixed(${this.toJsValue()})`;
    }
  } catch {
    return "Mixed(NOT_SUPPORTED_YET)";
  }
};

Mixed.prototype[customInspectSymbol] = Mixed.prototype.toString;
