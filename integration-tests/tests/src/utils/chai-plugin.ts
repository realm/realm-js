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

import { Collection, Object as RealmObject } from "realm";

function isRealmObject(arg: unknown): arg is RealmObject & Record<string, unknown> {
  return arg instanceof RealmObject;
}

function getPrimaryKeyValue(arg: RealmObject & Record<string, unknown>) {
  const objectSchema = arg.objectSchema();
  const primaryKeyProp = objectSchema.primaryKey;
  if (primaryKeyProp) {
    return arg[primaryKeyProp];
  } else {
    throw new Error(`Expected Realm Object of type '${objectSchema.name}' to have a primary key property`);
  }
}

function toPrimaryKeyValues(obj: unknown): unknown {
  if (isRealmObject(obj)) {
    return getPrimaryKeyValue(obj);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => {
      return toPrimaryKeyValues(item);
    });
  } else if (obj instanceof Collection) {
    return [...obj].map((item) => {
      return isRealmObject(item) ? getPrimaryKeyValue(item) : item;
    });
  } else {
    return obj;
  }
}

export const chaiRealmObjects: Chai.ChaiPlugin = (chai: Chai.ChaiStatic, utils: Chai.ChaiUtils) => {
  function coercePrimaryKeyValues(this: object) {
    const obj = utils.flag(this, "object");
    utils.flag(this, "object", toPrimaryKeyValues(obj));
  }
  utils.addProperty(chai.Assertion.prototype, "primaryKey", coercePrimaryKeyValues);
  utils.addProperty(chai.Assertion.prototype, "primaryKeys", coercePrimaryKeyValues);
};
