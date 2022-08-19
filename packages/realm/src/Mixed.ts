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

import { Mixed } from "@realm/bindgen";

export function coerceToMixed(value: unknown): Mixed {
  if (typeof value === "string") {
    return Mixed.fromString(value);
  } else if (typeof value === "bigint") {
    return Mixed.fromInt64T(value);
  } else if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return Mixed.fromInt(value);
    } else {
      return Mixed.fromDouble(value);
    }
  } else if (typeof value === "boolean") {
    return Mixed.fromBool(value);
  } else {
    throw new Error("Unable to convert value to Mixed");
  }
}
