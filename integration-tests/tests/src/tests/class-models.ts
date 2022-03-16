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

describe("Class models", () => {
  describe("as schema element", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    it("fails without a schema static", () => {
      class Person extends Realm.Object {}
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("must have a 'schema' property");
    });

    it("fails without a schema.properties static", () => {
      class Person extends Realm.Object {
        static schema = { name: "Person" };
      }
      expect(() => {
        new Realm({ schema: [Person as any] });
      }).throws("properties must be of type 'object'");
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
      class Person extends Realm.Object {
        name!: string;
        static schema: Realm.ObjectSchema = {
          name: "Person",
          properties: { name: "string" },
        };
      }
      new Realm({ schema: [Person] });
    });
  });
});
