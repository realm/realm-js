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
import { openRealmBefore, openRealmBeforeEach } from "../hooks";
import { createPromiseHandle } from "../utils/promise-handle";

describe("Realm objects", () => {
  describe("Interface & object literal", () => {
    describe("without primary keys", () => {
      openRealmBeforeEach({ schema: [PersonSchema] });

      it("can be created", function (this: RealmContext) {
        const { realm } = this;
        const john = realm.write(() => {
          return realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        // Expect John to be the one and only result
        const persons = realm.objects(PersonSchema.name);
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
      });

      it("can have its properties read", function (this: RealmContext) {
        const { realm } = this;

        const john = realm.write(() => {
          return realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });

      it("can return a value on write", function (this: RealmContext) {
        const { realm } = this;

        const john = realm.write(() => {
          return realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        // Expect John to be the one and only result
        const persons = realm.objects(PersonSchema.name);
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
      });
    });

    describe("with primary key", () => {
      openRealmBeforeEach({ schema: [PersonSchemaWithId] });

      it("can be fetched with objectForPrimaryKey", function (this: RealmContext) {
        const { realm } = this;
        const _id = new Realm.BSON.ObjectId();

        realm.write(() => {
          realm.create<PersonWithId>(PersonSchemaWithId.name, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        const john = realm.objectForPrimaryKey<IPersonWithId>(PersonSchemaWithId.name, _id);
        if (!john) throw new Error("Object not found");

        expect(john).instanceOf(Realm.Object);
        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });

      it("can be updated", function (this: RealmContext) {
        const { realm } = this;
        const _id = new Realm.BSON.ObjectId();

        const john = realm.write(() => {
          return realm.create<IPersonWithId>(PersonSchemaWithId.name, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);

        realm.write(() => {
          realm.create<IPersonWithId>(PersonSchemaWithId.name, { _id, age: 43 }, Realm.UpdateMode.All);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(43);

        const update: Partial<IPersonWithId> = {
          _id,
          name: "Mr. John Doe",
        };

        realm.write(() => {
          realm.create<IPersonWithId>(PersonSchemaWithId.name, update, Realm.UpdateMode.Modified);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("Mr. John Doe");
        expect(john.age).equals(43);

        expect(() =>
          realm.write(() => {
            realm.create<IPersonWithId>(
              PersonSchemaWithId.name,
              { _id, name: "John Doe", age: 42 },
              Realm.UpdateMode.Never,
            );
          }),
        ).throws(
          `Attempting to create an object of type '${PersonSchemaWithId.name}' with an existing primary key value '${_id}'.`,
        );

        // Expect only one instance of 'PersonSchemaWithId' in db after all updates
        const persons = realm.objects(PersonSchemaWithId.name);
        expect(persons.length).equals(1);
      });
    });
  });

  describe("Class Model", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    it("can be created", () => {
      const realm = new Realm({ schema: [Person] });

      const john = realm.write(() => {
        return realm.create(Person, {
          name: "John Doe",
          age: 42,
        });
      });
      // Expect John to be the one and only result
      const persons = realm.objects(Person);
      expect(persons.length).equals(1);
      const [firstPerson] = persons;
      expect(firstPerson).deep.equals(john);
      expect(firstPerson).instanceOf(Person);
    });

    it("can have it's properties read", () => {
      const realm = new Realm({ schema: [Person] });
      realm.write(() => {
        const john = realm.create(Person, {
          name: "John Doe",
          age: 42,
        });

        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });
    });

    it("can be fetched with objectForPrimaryKey", () => {
      const realm = new Realm({ schema: [PersonWithId] });
      const _id = new Realm.BSON.ObjectId();

      realm.write(() => {
        realm.create(PersonWithId, {
          _id,
          name: "John Doe",
          age: 42,
        });
      });

      const john = realm.objectForPrimaryKey(PersonWithId, _id);
      if (!john) throw new Error("Object not found");

      expect(john).instanceOf(PersonWithId);
      expect(john._id.equals(_id)).equals(true);
      expect(john.name).equals("John Doe");
      expect(john.age).equals(42);
    });

    it("can be updated", () => {
      const realm = new Realm({ schema: [PersonWithId] });
      const _id = new Realm.BSON.ObjectId();

      const john = realm.write(() => {
        return realm.create(PersonWithId, {
          _id,
          name: "John Doe",
          age: 42,
        });
      });

      expect(john._id.equals(_id)).equals(true);
      expect(john.name).equals("John Doe");
      expect(john.age).equals(42);

      realm.write(() => {
        realm.create(PersonWithId, { _id, age: 43 }, Realm.UpdateMode.All);
      });

      expect(john._id.equals(_id)).equals(true);
      expect(john.name).equals("John Doe");
      expect(john.age).equals(43);

      const update: Partial<PersonWithId> = {
        _id,
        name: "Mr. John Doe",
      };

      realm.write(() => {
        realm.create(PersonWithId, update, Realm.UpdateMode.Modified);
      });

      expect(john._id.equals(_id)).equals(true);
      expect(john.name).equals("Mr. John Doe");
      expect(john.age).equals(43);

      expect(() =>
        realm.write(() => {
          realm.create(PersonWithId, { _id, name: "John Doe", age: 42 }, Realm.UpdateMode.Never);
        }),
      ).throws(
        `Attempting to create an object of type '${PersonWithId.schema.name}' with an existing primary key value '${_id}'.`,
      );

      // Expect only one instance of 'PersonWithId' in db after all updates
      const persons = realm.objects(PersonWithId);
      expect(persons.length).equals(1);
    });
  });

  describe("listeners", () => {
    const ALICE_NAME = "Alice";

    openRealmBefore({ schema: [Person] });
    before(function (this: RealmContext) {
      this.realm.write(() =>
        this.realm.create<IPerson>(PersonSchema.name, {
          name: ALICE_NAME,
          age: 42,
        }),
      );
    });

    function getAlice(realm: Realm): IPerson & Realm.Object {
      const result = realm.objectForPrimaryKey<IPerson>("Person", ALICE_NAME);
      if (!result) {
        throw new Error("Expected an object");
      }
      return result;
    }

    it("fires and supports removal across accessor objects", async function (this: RealmContext) {
      const alice = getAlice(this.realm);
      const calls = [createPromiseHandle(), createPromiseHandle(), createPromiseHandle(), createPromiseHandle()];
      // Add a listener
      let callCount = 0;
      function listener() {
        calls[callCount].resolve();
        callCount++;
      }
      alice.addListener(listener);
      expect(callCount).equals(0);
      // Wait for the listener to be called after it gets registered
      await calls[0].promise;
      expect(callCount).equals(1);
      // Making a change should trigger the listener asynchroniously
      this.realm.write(() => {
        alice.age = 52;
      });
      await calls[1].promise;
      expect(callCount).equals(2);
    });

    it("gets removed only via the original accessor object", async function (this: RealmContext) {
      const alice = getAlice(this.realm);
      const calls = [createPromiseHandle(), createPromiseHandle(), createPromiseHandle()];
      // Add a listener
      let callCount = 0;
      function listener() {
        calls[callCount].resolve();
        callCount++;
      }
      alice.addListener(listener);
      expect(callCount).equals(0);
      // Wait for the listener to be called after it gets registered
      await calls[0].promise;
      expect(callCount).equals(1);

      // Removing the listener through a different accessor object should be a no-op
      const alice2 = getAlice(this.realm);
      expect(alice).not.equals(alice2);
      alice2.removeListener(listener);

      // Trigger another change
      this.realm.write(() => {
        alice.age = 62;
      });
      await calls[1].promise;
      // Remove the listener through the original object should ensure no more events are triggered
      alice.removeListener(listener);
      // Trigger another change
      this.realm.write(() => {
        alice.age = 72;
      });
      // Set a timeout, rejecting the promise after a reasonable wait
      setTimeout(() => {
        calls[2].reject(new Error("Timeout"));
      }, 10);
      await expect(calls[2].promise).is.rejected;
    });
  });
});
