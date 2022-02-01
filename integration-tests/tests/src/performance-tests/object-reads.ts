////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { describePerformance } from "../utils/benchmark";

type TestParameters<T = unknown> = {
  title: string;
  schema: (Realm.ObjectSchema | Realm.ObjectClass)[];
  prepare: (realm: Realm) => T;
  read: (prepared: T) => Realm.Object;
};

function describeObjectRead({ title, schema, prepare, read }: TestParameters) {
  describePerformance(`from ${title}`, {
    schema,
    benchmarkTitle: "reads",
    before(this: RealmContext & Mocha.Context) {
      this.prepared = prepare(this.realm);
      // Override toJSON to prevent this being serialized by Mocha Remote
      Object.defineProperty(this.realm, "toJSON", { value: () => ({}) });
    },
    test(this: RealmContext & Mocha.Context) {
      read(this.prepared);
    },
  });
}

class Person extends Realm.Object {
  static schema: Realm.ObjectSchema = {
    name: "Person",
    properties: {
      name: "string",
      age: "int",
      bestFriend: {
        type: "Person",
        optional: true,
      },
      friends: {
        type: "list",
        objectType: "Person",
      },
      goodFriends: {
        type: "set",
        objectType: "Person",
      },
      friendsByName: {
        type: "dictionary",
        objectType: "Person",
      },
      befriendedBy: {
        type: "linkingObjects",
        objectType: "Person",
        property: "friends",
      },
    },
    primaryKey: "name",
  };

  name: string;
  age: number;
  bestFriend?: Person;
  friends: Realm.List<Person>;
  goodFriends: Realm.Set<Person>;
  friendsByName: Realm.Dictionary<Person>;
  befriendedBy: Realm.Results<Person>;
}

function generateCases(classBased: boolean): TestParameters[] {
  const schema = classBased ? [Person] : [Person.schema];
  const titleSuffix = classBased ? " as class" : " as object";
  return [
    {
      title: "realm#objectForPrimaryKey" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        realm.write(() => {
          return realm.create(Person.schema.name, { name: "Alice", age: 21 });
        });
        return realm;
      },
      read(realm) {
        realm.objectForPrimaryKey(Person.schema.name, "Alice");
      },
    } as TestParameters<Realm>,
    {
      title: "Results" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        realm.write(() => {
          return realm.create(Person.schema.name, { name: "Alice", age: 21 });
        });
        return realm.objects(Person.schema.name);
      },
      read(results) {
        results[0];
      },
    } as TestParameters<Realm.Results<Person>>,
    {
      title: "List" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        return realm.write(() => {
          const alice = realm.create<Person>(Person.schema.name, { name: "Alice", age: 21 });
          const bob = realm.create<Person>(Person.schema.name, { name: "Bob", age: 32 });
          alice.friends.push(bob);
          return alice.friends;
        });
      },
      read(friends) {
        friends[0];
      },
    } as TestParameters<Realm.List<Person>>,
    {
      title: "Link" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        return realm.write(() => {
          const alice = realm.create<Person>(Person.schema.name, { name: "Alice", age: 21 });
          const bob = realm.create<Person>(Person.schema.name, { name: "Bob", age: 32, bestFriend: alice });
          return bob;
        });
      },
      read(bob) {
        bob.bestFriend;
      },
    } as TestParameters<Person>,
    {
      title: "Set" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        return realm.write(() => {
          const alice = realm.create<Person>(Person.schema.name, { name: "Alice", age: 21 });
          const bob = realm.create<Person>(Person.schema.name, { name: "Bob", age: 32 });
          bob.goodFriends.add(alice);
          return bob.goodFriends;
        });
      },
      read(set) {
        Array.from(set.values())[0];
      },
    } as TestParameters<Realm.Set<Person>>,
    {
      title: "Dictionary" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        return realm.write(() => {
          const alice = realm.create<Person>(Person.schema.name, { name: "Alice", age: 21 });
          const bob = realm.create<Person>(Person.schema.name, { name: "Bob", age: 32 });
          bob.friendsByName.set({ alice });
          return bob.friendsByName;
        });
      },
      read(dict) {
        dict["alice"];
      },
    } as TestParameters<Realm.Dictionary<Person>>,
    {
      title: "linkingObjects" + titleSuffix,
      schema,
      prepare(realm: Realm) {
        return realm.write(() => {
          const alice = realm.create<Person>(Person.schema.name, { name: "Alice", age: 21 });
          realm.create<Person>(Person.schema.name, { name: "Bob", age: 32, friends: [alice] });
          return alice.befriendedBy;
        });
      },
      read(results) {
        results[0];
      },
    } as TestParameters<Realm.Results<Person>>,
  ];
}

const cases = [...generateCases(false), ...generateCases(true)];

describe("object reads", () => {
  for (const c of cases) {
    describeObjectRead(c);
  }
});
