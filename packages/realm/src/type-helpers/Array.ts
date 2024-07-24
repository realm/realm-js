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

import { binding } from "../../binding";
import { assert } from "../assert";
import { List } from "../List";
import type { TypeHelpers, TypeOptions } from "./types";

/** @internal */
export function createArrayTypeHelpers({ realm, getClassHelpers, name, objectSchemaName }: TypeOptions): TypeHelpers {
  assert.string(objectSchemaName, "objectSchemaName");
  const classHelpers = getClassHelpers(objectSchemaName);

  return {
    fromBinding(value: unknown) {
      assert.instanceOf(value, binding.List);
      const propertyHelpers = classHelpers.properties.get(name);
      const { listAccessor } = propertyHelpers;
      assert.object(listAccessor);
      return new List(realm, value, listAccessor, propertyHelpers);
    },
    toBinding() {
      throw new Error("Not supported");
    },
  };
}
