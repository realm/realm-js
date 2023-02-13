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
import { openRealmBeforeEach } from "../hooks";

import { PersonSchema } from "../schemas/person-and-dogs";

describe("Realm transactions", () => {
  openRealmBeforeEach({ schema: [PersonSchema] });

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
      }).throws("Person.age must be of type 'number', got 'string' ('five')");

      // TODO: Fix 👇 ... its a bit surprising that an object gets created at all
      expect(persons.length).equals(1);
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
});
