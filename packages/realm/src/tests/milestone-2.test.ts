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

import { assert, expect } from "chai";
import path from "path";
import fs from "fs";

import { Realm } from "../index";
import { Results } from "../Results";
import { CanonicalObjectSchema } from "../schema";
import { REALMS_DIR, RealmContext, closeRealm, generateRandomInteger, generateTempRealmPath } from "./utils";

type Person = { name: string };
type PersonWithFriend = { name: string; bestFriend: Person | null };

const SIMPLE_REALM_PATH = path.resolve(REALMS_DIR, "simple.realm");

describe("Milestone #2", () => {
  describe("Opening default local Realm", () => {
    it("can read schema from disk", () => {
      const realm = new Realm({ path: SIMPLE_REALM_PATH });
      try {
        const schema = realm.schema;
        const expectedSchema: CanonicalObjectSchema[] = [
          {
            ctor: undefined,
            embedded: false,
            asymmetric: false,
            name: "Person",
            primaryKey: "name",
            properties: {
              name: {
                name: "name",
                type: "string",
                optional: false,
                indexed: true,
                mapTo: "name",
                default: undefined,
              },
              bestFriend: {
                indexed: false,
                mapTo: "bestFriend",
                name: "bestFriend",
                optional: true,
                type: "object",
                objectType: "Person",
                default: undefined,
              },
            },
          },
        ];
        expect(schema).deep.equals(expectedSchema);
      } finally {
        realm.close();
      }
    });
  });

  describe("Reading an object by primary key", () => {
    before(function (this: RealmContext) {
      this.realm = new Realm({ path: SIMPLE_REALM_PATH });
    });
    after(closeRealm);

    it("returns an instance of Realm.Object", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey("Person", "Alice");
      expect(alice).instanceOf(Realm.Object);
    });

    it("returns a spreadable object", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey<PersonWithFriend>("Person", "Alice");
      expect(alice.keys()).deep.equals(["name", "bestFriend"]);
      const spreaded = { ...alice };
      expect(Object.keys(spreaded)).deep.equals(alice.keys());
      expect(spreaded.name).deep.equals(alice.name);
    });
  });

  describe("Reading a “string” property from an object", () => {
    before(function (this: RealmContext) {
      this.realm = new Realm({ path: SIMPLE_REALM_PATH });
    });
    after(closeRealm);

    it("returns the correct string", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey<Person>("Person", "Alice");
      expect(alice.name).equals("Alice");
    });
  });

  describe("Follow an object “link” from an object to another", () => {
    before(function (this: RealmContext) {
      this.realm = new Realm({ path: SIMPLE_REALM_PATH });
    });
    after(closeRealm);

    it("returns the correct object", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey<PersonWithFriend>("Person", "Alice");
      assert(alice.bestFriend instanceof Realm.Object);
      expect(alice.bestFriend.name).equals("Bob");
    });
  });

  describe("Writing a “string” property to an existing object", () => {
    before(function (this: RealmContext) {
      // Start from the simple file to avoid populating a schema nor updating the file
      const path = generateTempRealmPath();
      fs.copyFileSync(SIMPLE_REALM_PATH, path);
      this.realm = new Realm({ path });
    });
    after(closeRealm);

    it("persists the value", function (this: RealmContext) {
      const charlie = this.realm.objectForPrimaryKey<Person>("Person", "Charlie");
      this.realm.write(() => {
        charlie.name = "Charles";
        expect(charlie.name).equals("Charles");
        charlie.name = "Charlie";
        expect(charlie.name).equals("Charlie");
      });
    });
  });

  describe("Writing a “link” property to an existing object", () => {
    before(function (this: RealmContext) {
      // Start from the simple file to avoid populating a schema nor updating the file
      const path = generateTempRealmPath();
      fs.copyFileSync(SIMPLE_REALM_PATH, path);
      this.realm = new Realm({ path });
    });
    after(closeRealm);

    it("persists the value", function (this: RealmContext) {
      const alice = this.realm.objectForPrimaryKey<PersonWithFriend>("Person", "Alice");
      const bob = this.realm.objectForPrimaryKey<PersonWithFriend>("Person", "Bob");
      this.realm.write(() => {
        alice.bestFriend = null;
        expect(alice.bestFriend).equals(null);
        alice.bestFriend = bob;
        expect(alice.bestFriend.name).equals("Bob");
      });
    });
  });

  describe("Create a new object, specifying property values", () => {
    before(function (this: RealmContext) {
      // Start from the simple file to avoid populating a schema nor updating the file
      const path = generateTempRealmPath();
      fs.copyFileSync(SIMPLE_REALM_PATH, path);
      this.realm = new Realm({ path });
    });
    after(closeRealm);

    it("persists the object and its value", function (this: RealmContext) {
      const name = "Darwin #" + generateRandomInteger();
      const person = this.realm.write(() => {
        return this.realm.create<Person>("Person", { name });
      });
      expect(person.name).equals(name);
    });
  });

  describe("Declaring a schema #1", () => {
    afterEach(closeRealm);

    it("supports properties of type 'string'", function (this: RealmContext) {
      const path = generateTempRealmPath();
      this.realm = new Realm({ path, schema: [{ name: "Person", properties: { name: "string" } }] });
      const person = this.realm.write(() => {
        return this.realm.create("Person", { name: "Alice" });
      });
      expect(person.name).equals("Alice");
    });

    it("supports properties of type 'link'", function (this: RealmContext) {
      const path = generateTempRealmPath();
      this.realm = new Realm({
        path,
        schema: [{ name: "Person", properties: { name: "string", bestFriend: "Person" } }],
      });
      const { alice, bob } = this.realm.write(() => {
        const alice = this.realm.create<PersonWithFriend>("Person", { name: "Alice", bestFriend: null });
        const bob = this.realm.create<PersonWithFriend>("Person", { name: "Bob", bestFriend: alice });
        return { alice, bob };
      });
      expect(alice.name).equals("Alice");
      expect(bob.name).equals("Bob");
      assert(bob.bestFriend instanceof Realm.Object);
      expect(bob.bestFriend.name).equals("Alice");
    });

    it("supports properties of type 'list<link>'", function (this: RealmContext) {
      const path = generateTempRealmPath();
      this.realm = new Realm({
        path,
        schema: [{ name: "Person", properties: { name: "string", bestFriend: "Person", friends: "Person[]" } }],
      });
      // Actually, this part of the milestone doesn't entail reading lists from the database
      /*
      const { alice, bob } = this.realm.write(() => {
        const alice = this.realm.create<PersonWithFriends>("Person", { name: "Alice", bestFriend: null, friends: [] });
        const bob = this.realm.create<PersonWithFriends>("Person", {
          name: "Bob",
          bestFriend: alice,
          friends: [alice],
        });
        return { alice, bob };
      });
      expect(alice.name).equals("Alice");
      expect(bob.name).equals("Bob");
      assert(bob.bestFriend instanceof Realm.Object);
      expect(bob.bestFriend.name).equals("Alice");
      expect(bob.friends[0].name).equals("Alice");
      */
    });
  });

  describe("Querying database for objects of a specific type", () => {
    before(function (this: RealmContext) {
      this.realm = new Realm({ path: SIMPLE_REALM_PATH });
    });
    after(closeRealm);

    it("return Results", function (this: RealmContext) {
      const persons = this.realm.objects("Person");
      expect(persons).instanceOf(Results);
      expect(persons.length).greaterThan(0);
      expect(persons.length).equals([...persons.keys()].length);
      const alice = persons.find((p) => p.name === "Alice");
      if (!alice) {
        throw new Error("Expected an object");
      }
      expect(alice).instanceOf(Realm.Object);
      expect(alice.name).equals("Alice");
    });

    it("allows random index access", function (this: RealmContext) {
      const persons = this.realm.objects("Person");
      expect(persons).instanceOf(Results);
      expect(persons.length).greaterThan(0);
      expect(persons[0]).instanceOf(Realm.Object);
    });

    it("allows object spreads", function (this: RealmContext) {
      const persons = this.realm.objects("Person");
      expect(persons).instanceOf(Results);
      expect(persons.length).greaterThan(0);
      const spreaded = { ...persons };
      expect(Object.keys(spreaded));
    });
  });
});
