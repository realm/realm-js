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
import { PersonSchema, IPerson } from "../schemas/person-and-dogs";

const schema = [
  {
    name: "Person",
    primaryKey: "name",
    properties: { name: "string", age: "int?", friend: "Person?" },
  },
];

function createPersons(realm: Realm) {
  realm.write(() => {
    realm.create("Person", { name: "alice" });
    realm.create("Person", { name: "bob" });
    realm.create("Person", { name: "charlie" });
  });
}

describe("Immutable Realm", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  describe("Objects", () => {
    it("to be freezable", () => {
      const realm = new Realm({ schema: [PersonSchema] });
      let john: IPerson & Realm.Object;

      realm.write(() => {
        john = realm.create<IPerson & Realm.Object>(PersonSchema.name, {
          name: "John Doe",
          age: 42,
        });
      });

      expect(john._isFrozen()).equals(false);
      const frozenJohn = john._freeze<IPerson>();
      expect(john._isFrozen()).equals(false);
      expect(frozenJohn._isFrozen()).equals(true);
      expect(john._version()).equals(3);
      expect(frozenJohn._version()).equals(3);

      realm.write(() => {
        john.age = 43;
      });

      expect(john.age).equals(43);
      expect(frozenJohn.age).equals(42);
      expect(frozenJohn._isFrozen()).equals(true);
      expect(john._version()).equals(4);
      expect(frozenJohn._version()).equals(3);
    });
    it("are imutable", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      // aliceA is {name: "alice", age: undefined}
      const aliceA = realm.objectForPrimaryKey<IPerson>("Person", "alice");
      console.log("XXXX: ", aliceA.age);

      expect(aliceA.age).equals(null);
      // Object is only mutable inside a write transaction
      realm.write(() => {
        // TODO: So this is where we will add the writeable code when its ready
        // const mutableAlice = realm.writeable(aliceA);
        // mutableAlice.age = 21;
        // TODO: Consider if we should allow objects to be mutable when in a write transaction?
        // expect(mutableAlice.age).toEqual(21);
        // expect(aliceA.age).toEqual(undefined);

        aliceA.age = 21;
      });

      expect(aliceA.age).equals(null);

      // If we pull it out again the priperties gets updated
      const aliceB = realm.objectForPrimaryKey<IPerson>("Person", "alice");
      expect(aliceB.age).equals(21);

      // TODO: When latest is availble, uncomment
      // Convenience to get alice again, with the updated properties (without primary key)
      // aliceC is immutable
      // const aliceC = Realm.latest(aliceA);
      // expect(aliceC.age).toEqual(21);

      // expect(aliceB).equals(aliceC);
      // expect(aliceC).not.equals(aliceA);
    });
  });
  describe("Collections", () => {
    it("returns the same Collection if objects didn't change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const collectionA = realm.objects("Person");
      const collectionB = realm.objects("Person");
      expect(collectionB).equals(collectionA);
    });

    it("returns a different Collection if objects change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const collectionA = realm.objects<IPerson>("Person");
      realm.write(() => {
        collectionA[0].name = "ali";
      });
      const collectionB = realm.objects("Person");
      expect(collectionB).not.equals(collectionA);
    });

    it("returns a different Collection if objects are added or removed", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const collectionA = realm.objects("Person");
      realm.write(() => {
        realm.create("Person", { name: "daniel" });
      });
      const collectionB = realm.objects("Person");
      expect(collectionB).not.equals(collectionA);
      realm.write(() => {
        realm.delete(collectionA[0]);
      });
      const collectionC = realm.objects("Person");
      expect(collectionC).not.equals(collectionB);
    });

    it("returns the same Object from a Collection if it didn't change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objects("Person")[0];
      const aliceB = realm.objects("Person")[0];
      expect(aliceB).equals(aliceA);
    });

    it("returns different Objects from a Collection if it changes", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const alice = realm.objects<IPerson>("Person")[0];
      realm.write(() => {
        alice.name = "ali";
      });
      const ali = realm.objects<IPerson>("Person")[0];
      expect(ali).not.equals(alice);
    });

    // TODO: This might be too strict of a guarentee?
    it("returns the same object via different Collection, if it didn't change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objects("Person").sorted("name")[0];
      const aliceB = realm.objects("Person").filtered("name = $0", "alice")[0];
      expect(aliceB).equals(aliceA);
    });

    it("returns the same object if Collection change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const personsA = realm.objects("Person").sorted("name");
      const aliceA = personsA[0];
      realm.write(() => {
        realm.create("Person", { name: "daniel" });
      });
      const personsB = realm.objects("Person").sorted("name");
      const aliceB = personsA[0];

      expect(personsB).not.equals(personsA);
      expect(aliceB).equals(aliceA);
    });

    it("returns different objects via different Collection, if it changes", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objects<IPerson>("Person").sorted("name")[0];
      realm.write(() => {
        aliceA.name = "ali";
      });
      const aliceB = realm.objects("Person").filtered("name = $0", "alice")[0];
      expect(aliceB).not.equals(aliceA);
    });
  });
  describe("objectForPrimaryKey", () => {
    it("returns the same object if it didn't change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objectForPrimaryKey("Person", "alice");
      const aliceB = realm.objectForPrimaryKey("Person", "alice");
      expect(aliceB).equals(aliceA);
    });

    it("returns a different object if it change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objectForPrimaryKey("Person", "alice");
      realm.write(() => {
        // TODO: We would need to apply the `realm.writeable` here?
        aliceA.age = 21;
      });
      const aliceB = realm.objectForPrimaryKey("Person", "alice");
      expect(aliceB).not.equals(aliceA);
    });

    it("returns a different object if a linked object change", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objectForPrimaryKey<IPerson>("Person", "alice");
      realm.write(() => {
        //TODO: impelement writable and uncomment
        // const writableAlice = realm.writeable(aliceA);
        // writableAlice.friend.age = 21;
        aliceA.friends[0].age = 21;
      });
      const aliceB = realm.objectForPrimaryKey("Person", "alice");
      expect(aliceB).not.equals(aliceA);
    });

    // TODO: This might be too strict of a guarentee?
    it("returns the same object as a Collection", () => {
      const realm = new Realm({ schema });
      createPersons(realm);

      const aliceA = realm.objectForPrimaryKey("Person", "alice");
      const aliceB = realm.objects("Person").filtered("name = $0", "alice");
      expect(aliceB).equals(aliceA);
    });
  });
});
