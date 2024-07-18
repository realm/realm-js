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
import { expect } from "chai";
import Realm from "realm";

import { PersonSchema } from "../schemas/person-and-dogs";
import { openRealmBeforeEach } from "../hooks";


describe("Relaxed schema", () => {
  openRealmBeforeEach({ relaxedSchema: true, schema: [PersonSchema] });

  it("can open a Realm with a relaxed schema", function (this: Mocha.Context & RealmContext) {
    expect(this.realm).not.null;
  });

  it("can add an object to a Realm with a relaxed schema", function (this: Mocha.Context & RealmContext) {
    this.realm.write(() => {
      this.realm.create(PersonSchema.name, {
        name: "Joe",
        age: 19,
      });
    });

    expect(this.realm.objects(PersonSchema.name).length).equals(1);
  });

  it("can modify a property of an object in a Realm with a relaxed schema", function (this: Mocha.Context & RealmContext) {
    this.realm.write(() => {
      this.realm.create(PersonSchema.name, {
        name: "Joe",
        age: 19,
      });
    });

    this.realm.write(() => {
      const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe");
      expect(joe).not.null;
      joe.age = 25;
    });

    const olderJoe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe");
    expect(olderJoe.age).equals(25n); // TODO: why BigInt and not Number?
  });

  it("can add a new property", function (this: Mocha.Context & RealmContext) {
    this.realm.write(() => {
      this.realm.create(PersonSchema.name, {
        name: "Joe",
        age: 19,
      });
    });

    this.realm.write(() => {
      const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe");
      expect(joe).not.null;
      joe.realName = "Johannes";
    });
    const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe");
    expect(joe).not.null;
    expect(joe.name).equals("Joe");
    expect(joe.realName).equals("Johannes");
  });
});
