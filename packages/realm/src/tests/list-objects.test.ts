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
import { Realm } from "../index";

import { closeRealm, generateTempRealmPath, RealmContext } from "./utils";

describe("Creating an object with a list reference field", () => {
  before(function (this: RealmContext) {
    this.realm = new Realm({
      path: generateTempRealmPath(),
      inMemory: true,
      schema: [{ name: "Person", properties: { name: "string", age: "int", friends: "Person[]" } }],
    });
    this.realm.write(() => {
      this.tom = this.realm.create("Person", { name: "Tom", age: 32 });
    });
  });

  after(closeRealm);

  it("should work with existing objects", function (this: RealmContext) {
    this.realm.write(() => {
      this.dan = this.realm.create("Person", {
        name: "Dan",
        age: 32,
        friends: [this.tom],
      });
    });
    expect(this.dan.friends[0].name).equals("Tom");
  });

  it("should work with plain JS objects", function (this: RealmContext) {
    this.realm.write(() => {
      this.alice = this.realm.create("Person", {
        name: "Alice",
        age: 32,
        friends: [
          {
            name: "Bob",
            age: 10,
          },
          this.tom,
        ],
      });
    });
    expect(this.alice.friends[0].name).equals("Bob");
    expect(this.alice.friends[1].tom).equals("Tom");
  });
});
