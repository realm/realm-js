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

import { assert, binding } from "../internal";
import { nullPassthrough } from "./null-passthrough";
import { TypeOptions } from "./types";

export function createDateTypeHelpers({ optional }: TypeOptions) {
  return {
    toBinding: nullPassthrough((value) => {
      if (typeof value === "string") {
        // TODO: Consider deprecating this undocumented type coercion
        return binding.Timestamp.fromDate(new Date(value));
      } else {
        assert.instanceOf(value, Date);
        return binding.Timestamp.fromDate(value);
      }
    }, optional),
    fromBinding: nullPassthrough((value) => {
      assert.instanceOf(value, binding.Timestamp);
      return value.toDate();
    }, optional),
  };
}
