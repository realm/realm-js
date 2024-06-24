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

import { defaultFromBinding } from "./default";
import { nullPassthrough } from "./null-passthrough";
import { TypeHelpers, TypeOptions } from "./types";
import { toArrayBuffer } from "./array-buffer";

export function createDataTypeHelpers({ optional }: TypeOptions): TypeHelpers {
  return {
    toBinding: nullPassthrough((value) => {
      return toArrayBuffer(value);
    }, optional),
    fromBinding: defaultFromBinding,
  };
}
