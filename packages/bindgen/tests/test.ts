#!/usr/bin/env -S node --loader tsm --no-warnings --

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

/* eslint-disable header/header */

import { Realm, PropertyType, Helpers, Mixed, StringDataOwnerHack } from "../index";

import { strict as assert } from "assert";
import * as util from "util";

util; // mark as used since it is useful for debugging.

const realm = Realm.getSharedRealm({
  path: "/tmp/realm2.realm",
  inMemory: true,
  schemaVersion: 1n,
  schema: [
    {
      name: "Foo",
      persistedProperties: [
        { name: "num", type: PropertyType.Int },
        { name: "str", type: PropertyType.String },
        { name: "maybeFloat", type: PropertyType.Float | PropertyType.Nullable },
        { name: "link", type: PropertyType.Object | PropertyType.Nullable, objectType: "Foo" },
      ],
    },
  ],
});

// console.log(util.inspect(realm.schema, false, null, true))

const schema = realm.schema;
const table = Helpers.getTable(realm, schema[0].tableKey);
const numCol = schema[0].persistedProperties[0].columnKey;
const strCol = schema[0].persistedProperties[1].columnKey;
const fltCol = schema[0].persistedProperties[2].columnKey;
const lnkCol = schema[0].persistedProperties[3].columnKey;

console.log(numCol);
console.log(table.getColumnType(numCol));

realm.beginTransaction();

const obj1 = table.createObject();
obj1.setAny(numCol, Mixed.fromInt(1234));
obj1.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make("hello")));
obj1.setAny(fltCol, Mixed.fromFloat(0.1234));

const obj2 = table.createObject();
obj2.setAny(numCol, Mixed.fromInt(9876));
obj2.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make("world")));

const obj3 = table.createObject();
obj3.setAny(lnkCol, Mixed.fromObj(obj2));

realm.commitTransaction();

for (const obj of table) {
  console.log("---");
  console.log(obj.toString());
  console.log(obj.getKey());

  console.log(obj.getAny(numCol));
  console.log(obj.getAnyByName("num").getInt());

  console.log(obj.getAny(strCol));
  console.log(obj.getAny(strCol).toJsValue());

  console.log(obj.isNull(fltCol));
  console.log(obj.getAny(fltCol));
  console.log(obj.getAny(fltCol).toJsValue());
  if (!obj.isNull(fltCol)) console.log(obj.getAny(fltCol).getFloat());

  if (!obj.isNull(lnkCol)) {
    const dest = obj.getLinkedObject(lnkCol);
    assert.deepEqual(dest.getKey(), obj2.getKey());
    console.log(dest.getKey());
    console.log(dest.getAnyByName("str"));
  }
}

realm.close();
