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
import {
  IPerson as IPersonWithId,
  Person as PersonWithId,
  PersonSchema as PersonSchemaWithId,
} from "../schemas/person-and-dog-with-object-ids";

describe("Realm Query Language", () => {
  let realm: Realm;
  let persons: Realm.Results<Person>;

  beforeEach(() => {
    Realm.clearTestState();
    realm = new Realm({ schema: [PersonSchema] });
    realm.write(() => {
      const alice = realm.create<IPerson>(PersonSchema.name, { name: "Alice", age: 15 });
      const bob = realm.create<IPerson>(PersonSchema.name, { name: "Bob", age: 14, friends: [alice] });
      realm.create<IPerson>(PersonSchema.name, { name: "Charlie", age: 17, friends: [bob, alice] });
    });
    persons = realm.objects(PersonSchema.name);
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
  });
});
