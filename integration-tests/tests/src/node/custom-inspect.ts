////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import Realm from "realm";
import { inspect } from "node:util";

import { openRealmBefore } from "../hooks";
import { expect } from "chai";

describe("Custom inspect on Node.js", () => {
  type Person = {
    name: string;
    friends: Realm.List<Person>;
    bestFriends: Realm.Set<Person>;
    friendsByName: Realm.Dictionary<Person>;
  };
  openRealmBefore({
    schema: [
      {
        name: "Person",
        properties: {
          name: "string",
          friends: "Person[]",
          bestFriends: { type: "set", objectType: "Person" },
          friendsByName: { type: "dictionary", objectType: "Person" },
        },
      },
    ],
  });

  beforeEach(function (this: RealmObjectContext<Person>) {
    this.object = this.realm.write(() => {
      const alice = this.realm.create<Person>("Person", { name: "Alice" });
      const bob = this.realm.create<Person>("Person", { name: "Bob" });
      const charlie = this.realm.create<Person>("Person", { name: "Charlie" });
      alice.friends.push(bob, charlie);
      bob.friends.push(alice, charlie);
      charlie.friends.push(alice, bob);
      alice.bestFriends.add(bob);
      bob.bestFriends.add(alice);
      return alice;
    });
  });

  describe("Realm.Object", () => {
    it("exposes a custom inspect", function (this: RealmObjectContext<Person>) {
      const inspected = inspect(this.object, false, 3);
      expect(inspected).contains("Person");
      expect(inspected).contains("Alice");
      expect(inspected).contains("Bob");
      expect(inspected).contains("Charlie");

      expect(inspected).contains("Realm.List");
      expect(inspected).contains("Realm.Set");
      expect(inspected).contains("Realm.Dictionary");
    });
  });
});
