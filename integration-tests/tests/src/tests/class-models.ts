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
import Realm from "realm";

import { openRealmBeforeEach } from "../hooks";

describe("Class models", () => {
  describe("as schema element", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    it("fails without a schema static", () => {
      class Person extends Realm.Object {}
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("Expected 'schema static' to be an object, got undefined");
    });

    it("fails without a schema.properties static", () => {
      class Person extends Realm.Object {
        static schema = { name: "Person" };
      }
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("Expected 'properties' on 'Person' to be an object, got undefined");
    });

    it("fails if it doesn't extend Realm.Object", () => {
      class Person {
        name!: string;
        static schema: Realm.ObjectSchema = {
          name: "Person",
          properties: { name: "string" },
        };
      }
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("Class 'Person' must extend Realm.Object");

      // Mutate the name of the object schema to produce a more detailed error
      Person.schema.name = "Foo";
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("Class 'Person' (declaring 'Foo' schema) must extend Realm.Object");
    });

    it("is allowed", () => {
      class Person extends Realm.Object<Person> {
        name!: string;
        static schema: Realm.ObjectSchema = {
          name: "Person",
          properties: { name: "string" },
        };
      }
      new Realm({ schema: [Person] });
    });
  });

  describe("#constructor", () => {
    // The Pick and Partial is needed to correctly reflect the defaults
    class Person extends Realm.Object<Pick<Person, "name"> & Partial<Person>> {
      id!: Realm.BSON.ObjectId;
      name!: string;
      age!: number;
      friends!: Realm.List<Person>;

      static schema: Realm.ObjectSchema = {
        name: "Person",
        properties: {
          id: {
            type: "objectId",
            default: new Realm.BSON.ObjectId(), // TODO: Make this a function
          },
          name: "string",
          age: {
            type: "int",
            default: 32,
          },
          friends: "Person[]",
        },
      };
    }

    openRealmBeforeEach({ schema: [Person] });

    it("creates objects with values", function (this: RealmContext) {
      this.realm.write(() => {
        // Expect no persons in the database
        const persons = this.realm.objects<Person>("Person");
        expect(persons.length).equals(0);

        const alice = new Person(this.realm, { name: "Alice" });
        expect(alice.name).equals("Alice");
        // Expect the first element to be the object we just added
        expect(persons.length).equals(1);
        expect(persons[0]._objectKey()).equals(alice._objectKey());
        expect(persons[0].name).equals("Alice");
        // Property value fallback to the default
        expect(persons[0].age).equals(32);
      });
    });
  });
});
