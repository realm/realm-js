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
import Realm from "realm";

import { IPerson, Person, PersonSchema } from "../schemas/person-and-dogs";
import { IContact, Contact, ContactSchema } from "../schemas/contact";

describe("Realm Query Language", () => {
  let realm: Realm;
  let persons: Realm.Results<IPerson>;
  let contacts: Realm.Results<IContact>;

  beforeEach(() => {
    Realm.clearTestState();
    realm = new Realm({ schema: [PersonSchema, ContactSchema] });
    realm.write(() => {
      const alice = realm.create<IPerson>(PersonSchema.name, { name: "Alice", age: 15 });
      const bob = realm.create<IPerson>(PersonSchema.name, { name: "Bob", age: 14, friends: [alice] });
      realm.create<IPerson>(PersonSchema.name, { name: "Charlie", age: 17, friends: [bob, alice] });

      realm.create<IContact>(ContactSchema.name, { name: "Alice", phones: ["555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Bob", phones: ["555-1122-333", "555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Charlie" });
    });
    persons = realm.objects<IPerson>(PersonSchema.name);
    contacts = realm.objects<IContact>(ContactSchema.name);
  });

  afterEach(() => {
    realm.close();
  });

  describe("All objects", () => {
    it("properties and primitive types", () => {
      expect(persons.length).equal(3);
      expect(persons[0].name).equal("Alice");
      expect(persons[0].age).equal(15);
    });

    it("array of primitive types", () => {
      expect(contacts.length).equal(3);
      expect(contacts[0].phones.length).equal(1);
      expect(contacts[1].phones.length).equal(2);
      expect(contacts[2].phones.length).equal(0);
    });
  });

  describe("IN operator", () => {
    it("properties and array of values", () => {
      const aged14Or15 = persons.filtered("age IN {14, 15}");
      expect(aged14Or15.length).equal(2);

      const aged17 = persons.filtered("age IN $0", [17]);
      expect(aged17.length).equal(1);

      const dennis = persons.filtered("name in {'Dennis'}");
      expect(dennis.length).equal(0);
    });

    it.only("array of primitive types", () => {
      const hasTwoPhones = contacts.filtered("phones.@count = 2");
      expect(hasTwoPhones.length).equal(1);
      expect(hasTwoPhones[0].name).equal("Bob");

      expect(contacts.filtered("'555-1234-567' IN phones").length).equal(2);
      expect(contacts.filtered("'123-4567-890' IN phones").length).equal(0);
      expect(contacts.filtered("ANY {'555-1234-567', '123-4567-890'} IN phones").length).equal(2);
      expect(contacts.filtered("ALL {'555-1234-567', '123-4567-890'} IN phones").length).equal(0);
      expect(contacts.filtered("NONE {'555-1234-567', '123-4567-890'} IN phones").length).equal(1);
      expect(contacts.filtered("NONE {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
      expect(contacts.filtered("ALL {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
    });
  });
});
