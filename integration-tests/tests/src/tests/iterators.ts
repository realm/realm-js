////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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
import Realm, { Collection, Dictionary, OrderedCollection } from "realm";
import { openRealmBefore } from "../hooks";

// TODO: Add the use of Object.keys(), Object.values() and Object.entries()

type Person = {
  name: string;
  age: number;
  friends: Realm.List<Person>;
  admires: Person | null;
  admirers: Realm.Results<Person>;
  bestFriends: Realm.Set<Person>;
  friendsByName: Realm.Dictionary<Person>;
};

const PERSON_SCHEMA: Realm.ObjectSchema = {
  name: "Person",
  primaryKey: "name",
  properties: {
    age: "int",
    name: "string",
    friends: "Person[]",
    admires: "Person",
    admirers: {
      type: "linkingObjects",
      objectType: "Person",
      property: "admires",
    },
    bestFriends: {
      type: "set",
      objectType: "Person",
    },
    friendsByName: {
      type: "dictionary",
      // objectType: "mixed",
      objectType: "Person",
    },
  },
};

describe("Iterating", () => {
  openRealmBefore({ schema: [PERSON_SCHEMA] });

  before(function (this: RealmContext) {
    const { realm } = this;
    realm.write(() => {
      const alice = realm.create<Person>("Person", {
        name: "Alice",
        age: 16,
        admires: null,
      });
      const bob = realm.create<Person>("Person", {
        name: "Bob",
        age: 42,
        admires: null,
      });
      const charlie = realm.create<Person>("Person", {
        name: "Charlie",
        age: 62,
        admires: null,
      });
      // Alice and Charlie admires Bob and Bob admires Alice
      alice.admires = bob;
      charlie.admires = bob;
      bob.admires = alice;
      // All three are mutural frieds
      alice.friends.push(bob, charlie);
      bob.friends.push(alice, charlie);
      charlie.friends.push(alice, bob);
      // Populate their dictionaries of friends by name
      alice.friendsByName.set({ bob, charlie });
      bob.friendsByName.set({ alice, charlie });
      charlie.friendsByName.set({ alice, bob });
      // Alice and bob have a special relationship
      alice.bestFriends.add(bob);
      bob.bestFriends.add(alice);
    });
  });

  it("returns an instance of Results", function (this: RealmContext) {
    const results = this.realm.objects("Person");
    expect(results).instanceOf(Realm.Results);
  });

  it("throws if object schema doesn't exist", function (this: RealmContext) {
    expect(() => {
      this.realm.objects("SomeOtherClass");
    }).throws("Object type 'SomeOtherClass' not found in schema");
  });

  type CollectionContext = { collection: Collection<unknown, Person, unknown> } & RealmContext;
  type OrderedCollectionContext = { collection: OrderedCollection<Person> } & RealmContext;

  function ifOrderedCollectionIt(title: string, test: (collection: OrderedCollection<Person>) => void) {
    it(title, function (this: OrderedCollectionContext) {
      const { collection } = this;
      if (!(collection instanceof OrderedCollection)) {
        this.skip();
      }
      test(collection);
    });
  }

  function collectionBefore(getCollection: (realm: Realm) => Collection<unknown, Person, unknown>) {
    before(function (this: CollectionContext) {
      this.collection = getCollection(this.realm);
    });
  }

  function itCanIterate(expectedKeys: unknown[], expectedNames: string[]) {
    const expectedStringKeys = expectedKeys.map((k) => (typeof k === "number" ? k.toString() : k));

    ifOrderedCollectionIt("iterates using forEach", (collection) => {
      const names: string[] = [];
      collection.forEach((person) => {
        names.push(person.name);
      });
      expect(names).deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using map", (collection) => {
      const names = collection.map((person) => person.name);
      expect(names).deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using indexed for-loop", (collection) => {
      const names: string[] = [];
      for (let i = 0; i < collection.length; i++) {
        const person = collection[i];
        names.push(person.name);
      }
      expect(names).deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using for-in-loop", (collection) => {
      const names: string[] = [];
      for (const i in collection) {
        const person = collection[i];
        names.push(person.name);
      }
      expect(names).deep.equals(expectedNames);
    });

    it("iterates using for-of-loop", function (this: CollectionContext) {
      const { collection } = this;
      const keys: unknown[] = [];
      const names: string[] = [];
      for (const value of collection) {
        if (collection instanceof OrderedCollection) {
          expect(value).instanceOf(Realm.Object);
          names.push((value as Person).name);
        } else if (collection instanceof Dictionary) {
          expect(Array.isArray(value)).equals(true);
          const [key, person] = value as [string, Person];
          expect(person).instanceOf(Realm.Object);
          keys.push(key);
          names.push(person.name);
        } else {
          throw new Error("Expected an ordered collection or dictionary");
        }
      }
      if (this.collection instanceof OrderedCollection) {
        expect(names).deep.equals(expectedNames);
      } else if (collection instanceof Dictionary) {
        expect(keys).has.members(expectedKeys);
        expect(names).has.members(expectedNames);
      } else {
        throw new Error("Expected an ordered collection or dictionary");
      }
    });

    it("iterates using values for-of-loop", function (this: CollectionContext) {
      const names: string[] = [];
      for (const person of this.collection.values()) {
        names.push(person.name);
      }
      if (this.collection instanceof OrderedCollection) {
        expect(names).deep.equals(expectedNames);
      } else {
        expect(names).has.members(expectedNames);
      }
    });

    it("iterates using for-of-loop entries", function (this: CollectionContext) {
      const keys: unknown[] = [];
      const names: string[] = [];
      for (const [key, person] of this.collection.entries()) {
        keys.push(key);
        names.push(person.name);
      }
      if (this.collection instanceof OrderedCollection) {
        expect(keys).deep.equals(expectedKeys);
        expect(names).deep.equals(expectedNames);
      } else {
        expect(keys).has.members(expectedKeys);
        expect(names).has.members(expectedNames);
        // The fixture ensures all keys match the name of the person they're mapping to (lowercased)
        expect(keys).deep.equals(names.map((name) => name.toLowerCase()));
      }
    });

    it("iterates using Object.keys", function (this: CollectionContext) {
      const keys = Object.keys(this.collection);
      if (this.collection instanceof OrderedCollection) {
        // Object.keys always return array of strings
        expect(keys).deep.equals(expectedStringKeys);
      } else {
        expect(keys).has.members(expectedKeys);
      }
    });

    it("iterates using Object.values", function (this: CollectionContext) {
      const values = Object.values(this.collection).map((p) => p.name);
      if (this.collection instanceof OrderedCollection) {
        expect(values).deep.equals(expectedNames);
      } else {
        expect(values).has.members(expectedNames);
      }
    });

    it("iterates using Object.entries", function (this: CollectionContext) {
      const entries = Object.entries(this.collection);
      const keys = entries.map(([k]) => k);
      const values = entries.map(([, p]) => p.name);
      if (this.collection instanceof OrderedCollection) {
        expect(keys).deep.equals(expectedStringKeys);
        expect(values).deep.equals(expectedNames);
      } else {
        expect(keys).has.members(expectedKeys);
        expect(values).has.members(expectedNames);
      }
    });
  }

  describe("unfiltered results", () => {
    collectionBefore((realm) => realm.objects<Person>("Person"));
    itCanIterate([0, 1, 2], ["Alice", "Bob", "Charlie"]);
  });

  describe("filtered results", () => {
    collectionBefore((realm) => realm.objects<Person>("Person").filtered("age > 60"));
    itCanIterate([0], ["Charlie"]);
  });

  describe("lists", () => {
    collectionBefore((realm) => realm.objectForPrimaryKey<Person>("Person", "Alice").friends);
    itCanIterate([0, 1], ["Bob", "Charlie"]);
  });

  describe("linking objects", () => {
    collectionBefore((realm) => realm.objectForPrimaryKey<Person>("Person", "Bob").admirers);
    itCanIterate([0, 1], ["Alice", "Charlie"]);
  });

  describe("sets", () => {
    collectionBefore((realm) => realm.objectForPrimaryKey<Person>("Person", "Alice").bestFriends);
    itCanIterate([0], ["Bob"]);
  });

  describe("dictionary", () => {
    collectionBefore((realm) => realm.objectForPrimaryKey<Person>("Person", "Alice").friendsByName);
    itCanIterate(["bob", "charlie"], ["Bob", "Charlie"]);
  });
});
