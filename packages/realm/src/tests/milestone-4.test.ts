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
import { RealmContext, closeRealm, generateTempRealmPath } from "./utils";

type Person = { name: string; age: number; bestFriend: Person | null };

describe("Milestone #4", () => {
  beforeEach(function (this: RealmContext) {
    this.realm = new Realm({
      path: generateTempRealmPath(),
      inMemory: true,
      schema: [{ name: "Person", properties: { name: "string", age: "int", bestFriend: "Person" } }],
    });
    this.realm.write(() => {
      const alice = this.realm.create<Person>("Person", { name: "Alice", age: 21, bestFriend: null });
      const bob = this.realm.create<Person>("Person", { name: "Bob", age: 7, bestFriend: alice });
      const charlie = this.realm.create<Person>("Person", {
        name: "Charlie",
        age: 42,
        bestFriend: bob,
      });
      alice.bestFriend = charlie;
    });
  });
  afterEach(closeRealm);

  describe("Result#filtered", () => {
    it("filters on inline strings", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").filtered("name == 'Alice'");
      expect(results).instanceOf(Realm.Results);
      expect(results.length).equals(1);
      const [person] = results;
      expect(person.name).equals("Alice");
    });

    it("filters on placeholder strings", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").filtered("name == $0", "Alice");
      expect(results).instanceOf(Realm.Results);
      expect(results.length).equals(1);
      const [person] = results;
      expect(person.name).equals("Alice");
    });

    it("filters on placeholder ints", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").filtered("age > $0", 10);
      expect(results).instanceOf(Realm.Results);
      expect(results.length).equals(2);
      // Expect Alice and Charlie to be in the results
      expect(results.find((p) => p.name === "Alice")).instanceOf(Realm.Object);
      expect(results.find((p) => p.name === "Charlie")).instanceOf(Realm.Object);
    });

    it("filters and sorts", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").filtered("age > $0", 10).sorted("age");
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Alice", "Charlie"]);
    });

    it("filters and sorts through links", function (this: RealmContext) {
      const results = this.realm
        .objects<Person>("Person")
        .filtered("bestFriend.age < $0", 30) // Alice and Bob are younger than 30. Bob and Charlie's best friends respectively.
        .sorted("bestFriend.age");
      const names = results.map((p) => p.name);
      // Charlies best friend (Bob) is youngest, hence first
      expect(names).deep.equals(["Charlie", "Bob"]);
    });
  });

  describe("Result#sorted", () => {
    it("sorts on strings", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("name");
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Alice", "Bob", "Charlie"]);
    });

    it("sorts reversed on strings", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("name", true);
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Charlie", "Bob", "Alice"]);
    });

    it("sorts on int", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("age");
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Bob", "Alice", "Charlie"]);
    });

    it("sorts reversed on int", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("age", true);
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Charlie", "Alice", "Bob"]);
    });

    it("sorts and filters", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("age").filtered("age > $0", 10);
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Alice", "Charlie"]);
    });

    it("sorts and filters, reversed", function (this: RealmContext) {
      const results = this.realm.objects<Person>("Person").sorted("age", true).filtered("age > $0", 10);
      const names = results.map((p) => p.name);
      expect(names).deep.equals(["Charlie", "Alice"]);
    });
  });
});
