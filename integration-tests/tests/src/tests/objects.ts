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
import {
  IPerson as IPersonWithId,
  Person as PersonWithId,
  PersonSchema as PersonSchemaWithId,
} from "../schemas/person-and-dog-with-object-ids";

describe("Realm objects", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  describe("Methods", () => {
    it("linkingObjects works with both string and type input", () => {
      const realm = new Realm({ schema: [Person] });

      const john = realm.write(() => {
        return new Person(realm, "John Doe", 42);
      });

      const lucy = realm.write(() => {
        return realm.create(Person, {
          name: "Lucy Dallas",
          age: 32,
          friends: [john],
        });
      });

      const mary = realm.write(() => {
        return realm.create(Person, {
          name: "Mary Ross",
          age: 22,
          friends: [john],
        });
      });

      const linkingObjectsWithString = john.linkingObjects<IPerson>("Person", "friends").sorted("name");
      expect(linkingObjectsWithString.length).equals(2);
      expect(linkingObjectsWithString[0].name).equals(lucy.name);
      expect(linkingObjectsWithString[1].name).equals(mary.name);

      const linkingObjectsWithType = john.linkingObjects(Person, "friends").sorted("name");
      expect(linkingObjectsWithType.length).equals(2);
      expect(linkingObjectsWithType[0].name).equals(lucy.name);
      expect(linkingObjectsWithType[1].name).equals(mary.name);
    });
  });

  describe("Interface & object literal", () => {
    it("can be created", () => {
      const realm = new Realm({ schema: [PersonSchema] });

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

    it("can have its properties read", () => {
      const realm = new Realm({ schema: [PersonSchema] });

      const john = realm.write(() => {
        return realm.create<IPerson>(PersonSchema.name, {
          name: "John Doe",
          age: 42,
        });
      });

      expect(john.name).equals("John Doe");
      expect(john.age).equals(42);
    });

    it("can be fetched with objectForPrimaryKey", () => {
      const realm = new Realm({ schema: [PersonSchemaWithId] });
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

    it("can be updated", () => {
      const realm = new Realm({ schema: [PersonSchemaWithId] });
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

    it("can return a value on write", () => {
      const realm = new Realm({ schema: [PersonSchema] });

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

  describe("Class Model", () => {
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

    it("can have its properties read", () => {
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
});
