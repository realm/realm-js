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

import { expect } from "chai";
import { openRealmBefore } from "../hooks";

describe("Realm Chai plugin", () => {
  describe("expect(obj).primaryKey", () => {
    openRealmBefore({ schema: [{ name: "Person", primaryKey: "name", properties: { name: "string" } }] });
    before(function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("Person", { name: "Alice" });
      });
    });

    it("is noop on plain objects", function (this: RealmContext) {
      const obj = { foo: "bar" };
      expect(obj).primaryKey.equals(obj);
    });

    it("is noop on array of plain objects", function (this: RealmContext) {
      const array = [{ foo: "bar" }];
      expect(array).primaryKey.deep.equals(array);
    });

    it("transforms to primary key values for objects", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey("Person", "Alice");
      expect(alice).primaryKey.equals("Alice");
    });

    it("transforms to primary key values for array of objects", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey("Person", "Alice");
      expect([alice]).primaryKeys.deep.equals(["Alice"]);
    });

    it("transforms to primary key values for collections of objects", function (this: RealmContext) {
      const persons = this.realm.objects("Person");
      expect(persons).primaryKeys.deep.equals(["Alice"]);
    });

    it("transforms to primary key values for arrays of arrays of objects", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey("Person", "Alice");
      expect([[alice]]).primaryKeys.deep.equals([["Alice"]]);
    });
  });
});
