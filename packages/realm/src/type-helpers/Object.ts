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
import { INTERNAL, REALM, RealmObject, UpdateMode } from "../Object";
import { nullPassthrough } from "./null-passthrough";
import type { TypeHelpers, TypeOptions } from "./types";

/** @internal */
export function createObjectTypeHelpers({
  realm,
  name,
  objectType,
  optional,
  getClassHelpers,
}: TypeOptions): TypeHelpers {
  assert(objectType);
  const helpers = getClassHelpers(objectType);
  const { wrapObject } = helpers;
  return {
    toBinding: nullPassthrough((value, options) => {
      if (
        value instanceof RealmObject &&
        value.constructor.name === objectType &&
        value[REALM].internal.$addr === realm.internal.$addr
      ) {
        return value[INTERNAL];
      } else {
        // TODO: Consider exposing a way for calling code to disable object creation
        assert.object(value, name);
        // Use the update mode if set; otherwise, the object is assumed to be an
        // unmanaged object that the user wants to create.
        // TODO: Ideally use `options?.updateMode` instead of `realm.currentUpdateMode`.
        const createdObject = RealmObject.create(realm, value, realm.currentUpdateMode ?? UpdateMode.Never, {
          helpers,
          createObj: options?.createObj,
        });
        return createdObject[INTERNAL];
      }
    }, optional),
    fromBinding: nullPassthrough((value) => {
      if (value instanceof binding.ObjLink) {
        const table = binding.Helpers.getTable(realm.internal, value.tableKey);
        const linkedObj = table.getObject(value.objKey);
        return wrapObject(linkedObj);
      } else {
        assert.instanceOf(value, binding.Obj);
        return wrapObject(value);
      }
    }, optional),
  };
}
