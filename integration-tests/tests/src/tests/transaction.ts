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
import { UpdateMode } from "realm";

import { openRealmBeforeEach } from "../hooks";
import {
  EmbeddedAddressSchema,
  IPersonWithEmbedded,
  PersonSchema,
  PersonWithEmbeddedSchema,
} from "../schemas/person-and-dogs";

describe("Realm transactions", () => {
  openRealmBeforeEach({ schema: [PersonSchema, PersonWithEmbeddedSchema, EmbeddedAddressSchema] });

  describe("Manual transactions", () => {
    it("can perform a manual transaction", function (this: RealmContext) {
      expect(this.realm.isEmpty).to.be.true;

      this.realm.beginTransaction();
      this.realm.create(PersonSchema.name, { age: 42, name: "John doe" });
      this.realm.commitTransaction();

      expect(this.realm.objects(PersonSchema.name).length).equals(1);
    });

    it("rolls back when cancelled", function (this: RealmContext) {
      const { realm } = this;
      realm.beginTransaction();

      const persons = realm.objects(PersonSchema.name);
      expect(persons.length).equals(0);

      realm.create(PersonSchema.name, {
        name: "John Doe",
        age: 42,
      });

      expect(persons.length).equals(1);
      expect(realm.isInTransaction).to.be.true;

      realm.cancelTransaction();
      expect(persons.length).equals(0);
      expect(realm.isInTransaction).to.be.false;
    });

    it("throws on an invalid object", function (this: RealmContext) {
      const { realm } = this;
      realm.beginTransaction();

      const persons = realm.objects(PersonSchema.name);
      expect(persons.length).equals(0);

      expect(() => {
        realm.create(PersonSchema.name, {
          name: "John Doe",
          age: "five", // wrong type
        });
        realm.commitTransaction(); // We don't expect this to be called
      }).throws("Expected value to be a number or bigint, got a string");

      expect(persons.length).equals(0);
      expect(realm.isInTransaction).to.be.true;

      realm.cancelTransaction();
      expect(persons.length).equals(0);
    });

    it("isInTransaction reflects state", function (this: RealmContext) {
      expect(!this.realm.isInTransaction).to.be.true;
      this.realm.beginTransaction();
      expect(this.realm.isInTransaction).to.be.true;
      this.realm.cancelTransaction();
      expect(!this.realm.isInTransaction).to.be.true;
    });
  });

  describe("Transactions via realm.write()", () => {
    it("`realm.create()` does not create an object if it throws", function (this: Mocha.Context & RealmContext) {
      this.realm.write(() => {
        // It is important to catch the exception within `realm.write()` in order to test
        // that the object creation path does not create the object (rather than being due
        // to `realm.write()` cancelling the transaction).
        expect(() => {
          const invalidPerson = { name: "Amy" };
          this.realm.create(PersonWithEmbeddedSchema.name, invalidPerson);
        }).to.throw("Missing value for property 'age'");
      });
      expect(this.realm.objects(PersonWithEmbeddedSchema.name).length).equals(0);
    });

    it("`realm.create()` does not create an object if having an invalid embedded object", function (this: Mocha.Context &
      RealmContext) {
      this.realm.write(() => {
        expect(() => {
          const invalidEmbeddedAddress = {};
          this.realm.create(PersonWithEmbeddedSchema.name, {
            name: "Amy",
            age: 30,
            address: invalidEmbeddedAddress,
          });
        }).to.throw("Missing value for property 'street'");
      });
      expect(this.realm.objects(PersonWithEmbeddedSchema.name).length).equals(0);
    });

    it("commits successful operations if exceptions from failed ones are caught", function (this: Mocha.Context &
      RealmContext) {
      this.realm.write(() => {
        this.realm.create(PersonWithEmbeddedSchema.name, { name: "John", age: 30 });
        expect(() => {
          const invalidPerson = { name: "Amy" };
          this.realm.create(PersonWithEmbeddedSchema.name, invalidPerson);
        }).to.throw("Missing value for property 'age'");
      });
      const objects = this.realm.objects<IPersonWithEmbedded>(PersonWithEmbeddedSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].name).equals("John");
    });

    it("does not commit the transaction if any operation that throws is not caught", function (this: Mocha.Context &
      RealmContext) {
      expect(() => {
        this.realm.write(() => {
          this.realm.create(PersonWithEmbeddedSchema.name, { name: "John", age: 30 });
          // Don't catch any exceptions within `realm.write()`.
          const invalidPerson = { name: "Amy" };
          this.realm.create(PersonWithEmbeddedSchema.name, invalidPerson);
        });
      }).to.throw("Missing value for property 'age'");
      expect(this.realm.objects(PersonWithEmbeddedSchema.name).length).equals(0);
    });

    // TODO: Enable when fixing this issue: https://github.com/realm/realm-js/issues/6355
    it.skip("does not modify an embedded object if resetting it to an invalid one via a setter", function (this: Mocha.Context &
      RealmContext) {
      const amy = this.realm.write(() => {
        return this.realm.create(PersonWithEmbeddedSchema.name, {
          name: "Amy",
          age: 30,
          address: { street: "Broadway" },
        });
      });
      expect(this.realm.objects(PersonWithEmbeddedSchema.name).length).equals(1);
      expect(amy.address?.street).equals("Broadway");

      this.realm.write(() => {
        // It is important to catch the exception within `realm.write()` in order to test
        // that the object creation path does not modify the object (rather than being due
        // to `realm.write()` cancelling the transaction).
        expect(() => {
          const invalidEmbeddedAddress = {};
          // @ts-expect-error Testing setting invalid type.
          amy.address = invalidEmbeddedAddress;
        }).to.throw("Missing value for property 'street'");
      });
      const objects = this.realm.objects<IPersonWithEmbedded>(PersonWithEmbeddedSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].address).to.not.be.null;
      expect(objects[0].address?.street).equals("Broadway");
    });

    // TODO: Enable when fixing this issue: https://github.com/realm/realm-js/issues/6355
    it.skip("does not modify an embedded object if resetting it to an invalid one via UpdateMode", function (this: Mocha.Context &
      RealmContext) {
      const amy = this.realm.write(() => {
        return this.realm.create(PersonWithEmbeddedSchema.name, {
          name: "Amy",
          age: 30,
          address: { street: "Broadway" },
        });
      });
      expect(this.realm.objects(PersonWithEmbeddedSchema.name).length).equals(1);
      expect(amy.address?.street).equals("Broadway");

      this.realm.write(() => {
        // It is important to catch the exception within `realm.write()` in order to test
        // that the object creation path does not modify the object (rather than being due
        // to `realm.write()` cancelling the transaction).
        expect(() => {
          const invalidEmbeddedAddress = {};
          this.realm.create(
            PersonWithEmbeddedSchema.name,
            {
              name: "Amy",
              address: invalidEmbeddedAddress,
            },
            UpdateMode.Modified,
          );
        }).to.throw("Missing value for property 'street'");
      });
      const objects = this.realm.objects<IPersonWithEmbedded>(PersonWithEmbeddedSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].address).to.not.be.null;
      expect(objects[0].address?.street).equals("Broadway");
    });
  });
});
