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

function compareEntries([key1]: [unknown, unknown], [key2]: [unknown, unknown]) {
  return `${key1}`.localeCompare(`${key2}`);
}

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

  type CollectionContext = { collection: Collection<unknown, Person, [unknown, Person], unknown> } & RealmContext;
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

  function collectionBefore(getCollection: (realm: Realm) => Collection<unknown, Person, [unknown, Person], unknown>) {
    before(function (this: CollectionContext) {
      this.collection = getCollection(this.realm);
    });
  }

  type TestOptions = {
    expectedKeys: unknown[];
    expectedNames: string[];
    expectedEntries?: [unknown, unknown][];
    expectedObjectEntries?: [string, unknown][];
  };

  function itCanIterate({
    expectedKeys,
    expectedNames,
    expectedEntries = expectedKeys.map((key, index) => [key, expectedNames[index]]),
    // Object.entries always return string keys
    expectedObjectEntries = expectedEntries.map(([key, value]) => [`${key}`, value]),
  }: TestOptions) {
    const expectedStringKeys = expectedKeys.map((k) => (typeof k === "number" ? k.toString() : k));

    ifOrderedCollectionIt("iterates using forEach", (collection) => {
      const persons: Person[] = [];
      collection.forEach((person) => {
        persons.push(person);
      });
      expect(persons).primaryKeys.deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using map", (collection) => {
      const persons: Person[] = [];
      const result = collection.map((person) => {
        persons.push(person);
        return person.name;
      });
      expect(persons).primaryKeys.deep.equals(result);
      expect(persons).primaryKeys.deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using indexed for-loop", (collection) => {
      const persons: Person[] = [];
      for (let i = 0; i < collection.length; i++) {
        persons.push(collection[i]);
      }
      expect(persons).primaryKeys.deep.equals(expectedNames);
    });

    ifOrderedCollectionIt("iterates using for-in-loop", (collection) => {
      const persons: Person[] = [];
      for (const i in collection) {
        persons.push(collection[i]);
      }
      expect(persons).primaryKeys.deep.equals(expectedNames);
    });

    it("iterates using for-of-loop", function (this: CollectionContext) {
      const { collection } = this;
      const keys: unknown[] = [];
      const persons: Person[] = [];
      for (const value of collection) {
        if (collection instanceof OrderedCollection) {
          expect(value).instanceOf(Realm.Object);
          persons.push(value as Person);
        } else if (collection instanceof Dictionary) {
          expect(Array.isArray(value)).equals(true);
          const [key, person] = value as [string, Person];
          expect(person).instanceOf(Realm.Object);
          keys.push(key);
          persons.push(person);
        } else {
          throw new Error("Expected an ordered collection or dictionary");
        }
      }
      if (this.collection instanceof OrderedCollection) {
        expect(persons).primaryKeys.deep.equals(expectedNames);
      } else if (collection instanceof Dictionary) {
        expect(keys).primaryKeys.has.members(expectedKeys);
        expect(persons).primaryKeys.has.members(expectedNames);
      } else {
        throw new Error("Expected an ordered collection or dictionary");
      }
    });

    it("iterates using values for-of-loop", function (this: CollectionContext) {
      const persons: Person[] = [];
      for (const person of this.collection.values()) {
        persons.push(person);
      }
      if (this.collection instanceof OrderedCollection) {
        expect(persons).primaryKeys.deep.equals(expectedNames);
      } else {
        expect(persons).primaryKeys.has.members(expectedNames);
      }
    });

    it("iterates using for-of-loop entries", function (this: CollectionContext) {
      const entries: [unknown, Person][] = [];
      for (const entry of this.collection.entries()) {
        entries.push(entry);
      }
      if (this.collection instanceof OrderedCollection) {
        expect(entries).primaryKeys.deep.equals(expectedEntries);
      } else {
        entries.sort(compareEntries);
        const sortedExpecterdEntries = [...expectedEntries].sort(compareEntries);
        expect(entries).primaryKeys.deep.equals(sortedExpecterdEntries);
      }
    });

    it("iterates using Object.keys", function (this: CollectionContext) {
      const keys = Object.keys(this.collection);
      if (this.collection instanceof OrderedCollection) {
        // Object.keys always return array of strings
        expect(keys).primaryKeys.deep.equals(expectedStringKeys);
      } else {
        expect(keys).primaryKeys.has.members(expectedKeys);
      }
    });

    it("iterates using Object.values", function (this: CollectionContext) {
      const values = Object.values(this.collection).map((p) => p.name);
      if (this.collection instanceof OrderedCollection) {
        expect(values).primaryKeys.deep.equals(expectedNames);
      } else {
        expect(values).primaryKeys.has.members(expectedNames);
      }
    });

    it("iterates using Object.entries", function (this: CollectionContext) {
      const entries = Object.entries(this.collection);
      if (this.collection instanceof OrderedCollection) {
        expect(entries).primaryKeys.deep.equals(expectedObjectEntries);
      } else {
        entries.sort(compareEntries);
        const sortedExpecterdEntries = [...expectedEntries].sort(compareEntries);
        expect(entries).primaryKeys.deep.equals(sortedExpecterdEntries);
      }
    });
  }

  function getPerson(realm: Realm, name: string) {
    const result = realm.objectForPrimaryKey<Person>("Person", name);
    if (!result) {
      throw new Error(`Expected a Person named ${name}`);
    }
    return result;
  }

  describe("unfiltered results", () => {
    collectionBefore((realm) => realm.objects<Person>("Person"));
    itCanIterate({
      expectedKeys: [0, 1, 2],
      expectedNames: ["Alice", "Bob", "Charlie"],
    });
  });

  describe("filtered results", () => {
    collectionBefore((realm) => realm.objects<Person>("Person").filtered("age > 60"));
    itCanIterate({
      expectedKeys: [0],
      expectedNames: ["Charlie"],
    });
  });

  describe("lists", () => {
    collectionBefore((realm) => getPerson(realm, "Alice").friends);
    itCanIterate({
      expectedKeys: [0, 1],
      expectedNames: ["Bob", "Charlie"],
    });
  });

  describe("linking objects", () => {
    collectionBefore((realm) => getPerson(realm, "Bob").admirers);
    itCanIterate({
      expectedKeys: [0, 1],
      expectedNames: ["Alice", "Charlie"],
    });
  });

  describe("sets", () => {
    collectionBefore((realm) => getPerson(realm, "Alice").bestFriends);
    itCanIterate({
      expectedKeys: [0],
      expectedNames: ["Bob"],
      expectedEntries: [["Bob", "Bob"]],
      // Actually Object.entries() of a set is []
      expectedObjectEntries: [["0", "Bob"]],
    });
  });

  describe("dictionary", () => {
    collectionBefore((realm) => getPerson(realm, "Alice").friendsByName);
    itCanIterate({
      expectedKeys: ["bob", "charlie"],
      expectedNames: ["Bob", "Charlie"],
    });
  });
});
