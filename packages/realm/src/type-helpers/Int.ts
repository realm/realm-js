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
import { TypeAssertionError } from "../errors";
import { Counter } from "../Counter";
import { nullPassthrough } from "./null-passthrough";
import type { TypeHelpers, TypeOptions } from "./types";

/** @internal */
export function createIntTypeHelpers({ presentation, optional }: TypeOptions): TypeHelpers {
  return {
    toBinding: nullPassthrough((value) => {
      if (typeof value === "number") {
        return binding.Int64.numToInt(value);
      } else if (binding.Int64.isInt(value)) {
        return value;
      } else if (value instanceof Counter) {
        if (presentation !== "counter") {
          throw new Error(`Counters can only be used when 'counter' is declared in the property schema.`);
        }
        return binding.Int64.numToInt(value.value);
      } else {
        throw new TypeAssertionError("a number or bigint", value);
      }
    }, optional),
    // TODO: Support returning bigints to end-users
    fromBinding: nullPassthrough((value) => Number(value), optional),
  };
}
