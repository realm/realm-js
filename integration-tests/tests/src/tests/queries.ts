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
import { Realm } from "realm";

import { IPerson, Person, PersonSchema } from "../schemas/person-and-dogs";
import { IContact, Contact, ContactSchema } from "../schemas/contact";
interface IPrimitive {
  s: string;
  b: boolean;
  i: number;
  f: number;
  d: number;
  t: Date;
}

const PrimitiveSchema: Realm.ObjectSchema = {
  name: "Primitive",
  properties: {
    s: "string",
    b: "bool",
    i: "int",
    f: "float",
    d: "double",
    t: "date",
  },
};

describe("Realm Query Language", () => {
  let realm: Realm;
  let persons: Realm.Results<IPerson>;
  let contacts: Realm.Results<IContact>;
  let primitives: Realm.Results<IPrimitive>;

  beforeEach(() => {
    Realm.clearTestState();
    realm = new Realm({ schema: [PersonSchema, ContactSchema, PrimitiveSchema] });
    realm.write(() => {
      const alice = realm.create<IPerson>(PersonSchema.name, { name: "Alice", age: 15 });
      const bob = realm.create<IPerson>(PersonSchema.name, { name: "Bob", age: 14, friends: [alice] });
      realm.create<IPerson>(PersonSchema.name, { name: "Charlie", age: 17, friends: [bob, alice] });

      realm.create<IContact>(ContactSchema.name, { name: "Alice", phones: ["555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Bob", phones: ["555-1122-333", "555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Charlie" });

      realm.create<IPrimitive>(PrimitiveSchema.name, {
        s: "foo",
        b: true,
        i: 2,
        f: 3.14,
        d: 2.72,
        t: new Date("2001-05-11T12:45:05"),
      });
      realm.create<IPrimitive>(PrimitiveSchema.name, {
        s: "Here is a Unicorn 🦄 today",
        b: false,
        i: 44,
        f: 1.41,
        d: 4.67,
        t: new Date("2004-02-26T10:15:02"),
      });
    });
    //@ts-expect-error Test about to change
    persons = realm.objects<IPerson>(PersonSchema.name);
    //@ts-expect-error Test about to change
    contacts = realm.objects<IContact>(ContactSchema.name);
    //@ts-expect-error Test about to change
    primitives = realm.objects<IPrimitive>(PrimitiveSchema.name);
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

    // https://github.com/realm/realm-js/issues/4844
    it("emoiji and contains", () => {
      const text = "unicorn 🦄 today";
      expect(primitives.length).equal(2);
      const unicorn1 = primitives.filtered("s CONTAINS 'unicorn 🦄 today'");
      const unicorn2 = primitives.filtered("s CONTAINS[c] 'unicorn 🦄 today'");
      const unicorn3 = primitives.filtered("s CONTAINS $0", text);
      const unicorn4 = primitives.filtered("s CONTAINS[c] $0", text);
      expect(unicorn1.length).equal(0);
      expect(unicorn2.length).equal(1);
      expect(unicorn3.length).equal(0);
      expect(unicorn4.length).equal(1);
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

    it("array of primitive types", () => {
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
