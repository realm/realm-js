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

import { Decimal128 } from "bson";
import { Realm, Float, PropertyType, Helpers, Results, SortDescriptor, List } from "../../realm/src/binding";

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
        { name: "maybeDec", type: PropertyType.Decimal | PropertyType.Nullable },
        { name: "link", type: PropertyType.Object | PropertyType.Nullable, objectType: "Foo" },
        { name: "list", type: PropertyType.String | PropertyType.Array },
      ],
    },
  ],
});

assert(!Helpers.hasBindingContext(realm));

// This needs to be a separate const rather than an inline argument due to
// https://github.com/microsoft/TypeScript/issues/50467.
const bindingContext = {
  isBoundCorrectly: true,
  didChange(realm: Realm) {
    assert(this.isBoundCorrectly);
    console.log("in didChange()", realm.currentTransactionVersion);
  },
  beforeNotify(realm: Realm) {
    assert(this.isBoundCorrectly);
    console.log("in beforeNotify()", realm.currentTransactionVersion);
  },
};
Helpers.setBindingContext(realm, bindingContext);

// console.log(util.inspect(realm.schema, false, null, true))

const schema = realm.schema;
const tableKey = schema[0].tableKey;
const table = Helpers.getTable(realm, tableKey);
const numCol = schema[0].persistedProperties[0].columnKey;
const strCol = schema[0].persistedProperties[1].columnKey;
const fltCol = schema[0].persistedProperties[2].columnKey;
const decCol = schema[0].persistedProperties[3].columnKey;
const lnkCol = schema[0].persistedProperties[4].columnKey;
const lstCol = schema[0].persistedProperties[5].columnKey;

console.log(numCol);
console.log(table.getColumnType(numCol));

realm.beginTransaction();

const obj1 = table.createObject();
obj1.setAny(numCol, 1234n);
obj1.setAny(strCol, "hello");
obj1.setAny(fltCol, new Float(0.1234));
obj1.setAny(decCol, new Decimal128("0.9876"));

const obj2 = table.createObject();
obj2.setAny(numCol, 9876n);
obj2.setAny(strCol, "world");

const obj3 = table.createObject();
obj3.setAny(lnkCol, obj2);
const obj3list = List.make(realm, obj3, lstCol);
obj3list.insertAny(0, "hello");
obj3list.insertAny(1, "world");
console.log([obj3list.getAny(0), obj3list.getAny(1)]);

realm.commitTransaction();

const notifier = Helpers.makeObjectNotifier(realm, obj1);
const token = notifier.addCallback(
  (changes) => {
    console.log(changes);
  },
  [[[tableKey, numCol]]], // Or [] to monitor all fields
);

realm.beginTransaction();
obj1.setAny(numCol, 12345n);
realm.commitTransaction();

realm.beginTransaction();
obj1.setAny(numCol, 123456n);
realm.commitTransaction();

notifier.removeCallback(token);

for (const obj of table) {
  console.log("---");
  console.log(obj.toString());
  console.log(obj.key);

  console.log(obj.getAny(numCol));
  console.log(obj.getAnyByName("num"));

  console.log(obj.getAny(strCol));

  console.log(obj.isNull(fltCol));
  console.log(obj.getAny(fltCol));
  if (!obj.isNull(fltCol)) {
    console.log(obj.getAny(fltCol));
  }

  if (!obj.isNull(decCol)) {
    console.log(obj.getAny(decCol));
  }

  if (!obj.isNull(lnkCol)) {
    const dest = obj.getLinkedObject(lnkCol);
    assert.deepEqual(dest.key, obj2.key);
    console.log(dest.key);
    console.log(dest.getAnyByName("str"));
  }
}

console.log("---");
const kpMapping = Helpers.getKeypathMapping(realm);
const query = table.query("num = $0", [9876n], kpMapping);
console.log(query.count());
const results = Helpers.resultsFromQuery(realm, query);
{
  const nResults = results.size();
  console.log(nResults);
  for (let i = 0; i < nResults; i++) {
    console.log(results.getObj(i).toString());
  }
}

// This matches nothing, unless you change 'hello' to 'world'
{
  console.log("---");
  const results2 = results.filter(table.query("str = 'hello'", [], kpMapping));
  const nResults = results2.size();
  console.log(nResults);
  for (let i = 0; i < nResults; i++) {
    console.log(results2.getObj(i).toString());
  }
}

{
  const baseResults = Results.fromTable(realm, table);
  for (const results2 of [
    baseResults.sortByNames([["num", true]]),
    baseResults.sort(SortDescriptor.make([[strCol], [numCol]], [true, false])),
  ]) {
    console.log("---");
    const nResults = results2.size();
    console.log(nResults);
    for (let i = 0; i < nResults; i++) {
      console.log(results2.getObj(i).toString());
    }
  }
}

realm.close();
