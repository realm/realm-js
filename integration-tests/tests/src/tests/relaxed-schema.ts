////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect } from "chai";
import { PersonSchema, Person } from "../schemas/person-and-dogs";
import { openRealmBeforeEach } from "../hooks";
import { BSON } from "realm";

describe("Relaxed schema", () => {
  openRealmBeforeEach({ relaxedSchema: true, schema: [PersonSchema] });

  it("can open a Realm with a relaxed schema", function (this: Mocha.Context & RealmContext) {
    expect(this.realm).not.null;
  });

  it("can add an object to a Realm with a relaxed schema", function (this: Mocha.Context & RealmContext) {
    this.realm.write(() => {
      this.realm.create(PersonSchema.name, {
        name: "Joe",
        age: 19,
      });
    });

    expect(this.realm.objects(PersonSchema.name).length).equals(1);
  });

  it("can modify an existing property of an object in a Realm with a relaxed schema", function (this: Mocha.Context &
    RealmContext) {
    this.realm.write(() => {
      this.realm.create(PersonSchema.name, {
        name: "Joe",
        age: 19,
      });
    });

    this.realm.write(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
      expect(joe).not.null;
      joe.age = 25;
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const olderJoe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
    expect(olderJoe.age).equals(25n); // TODO: why BigInt and not Number?
  });

  [
    ["primitive", 1234],
    ["data", new ArrayBuffer(10)],
    ["decimal128", 12n],
    ["objectId", new BSON.ObjectID()],
    ["uuid", new BSON.UUID()],
    // ["linkingObjects", "linkingObjects"],
    // ["list", ["123", "123", "12"]],
    // [
    //   "dictionary",
    //   {
    //     dictionary: {
    //       windows: 3,
    //       apples: 3,
    //     },
    //   },
    // ],
  ].forEach(([typeName, valueToSet]) => {
    describe(`with ${typeName}`, () => {
      let setValue: any;

      beforeEach(function (this: Mocha.Context & RealmContext) {
        if (valueToSet == "linkingObjects") {
          this.realm.write(() => {
            setValue = this.realm.create<Person>(PersonSchema.name, {
              name: "Different Joe",
              age: 81,
            });
          });
        } else {
          setValue = valueToSet;
        }
      });

      it("can add a new property", function (this: Mocha.Context & RealmContext) {
        this.realm.write(() => {
          this.realm.create(PersonSchema.name, {
            name: "Joe",
            age: 19,
          });
        });

        this.realm.write(() => {
          const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
          expect(joe).not.null;
          joe.customProperty = setValue;
        });
        const joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
        expect(joe).not.null;
        expect(joe.name).equals("Joe");
        expect(joe.customProperty).deep.equals(setValue);
      });

      it("can add a new property", function (this: Mocha.Context & RealmContext) {
        this.realm.write(() => {
          this.realm.create(PersonSchema.name, {
            name: "Joe",
            age: 19,
          });
        });
        let joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
        expect(() => joe.customProperty).throws("Property 'Person.customProperty' does not exist");

        this.realm.write(() => {
          joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
          expect(joe).not.null;
          joe.customProperty = setValue;
        });

        joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
        expect(joe).not.null;
        expect(joe.name).equals("Joe");

        expect(joe.customProperty).deep.equals(setValue);
      });

      it("can delete a property", function () {
        let joe: any;
        this.realm.write(() => {
          joe = this.realm.create(PersonSchema.name, {
            name: "Joe",
            age: 19,
          });
        });
        this.realm.write(() => {
          joe.customProperty = setValue;
        });
        expect(() => joe.customProperty).does.not.throw();

        this.realm.write(() => {
          delete joe.customProperty;
        });
        joe = this.realm.objectForPrimaryKey(PersonSchema.name, "Joe")!;
        expect(() => joe.customProperty).throws("Property 'Person.customProperty' does not exist");
      });
    });
  });
});
