////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

describe("Sets", () => {
  beforeEach(Realm.clearTestState);

  const IntSetObjectSchema = {
    name: "IntSetObject",
    properties: {
      intSet: "int<>",
    },
  };
  interface IntSetObject {
    intSet: Realm.Set<Realm.Types.Int>;
  }

  const teamSchema = {
    name: "Team",
    properties: {
      names: "string<>",
    },
  };
  interface Team {
    names: Realm.Set<string>;
  }

  describe("Schema", () => {
    it("short (JS) and canonical schema types yield the same results", () => {
      const shorthandSchema = IntSetObjectSchema;

      const canonicalSchema: Realm.ObjectSchema = {
        name: "CanonicalSchema",
        properties: {
          intSet: { type: "set", objectType: "int" },
        },
      };

      const shorthandRealm = new Realm({ schema: [shorthandSchema] });
      const shSchema = shorthandRealm.schema[0];
      shorthandRealm.close();

      const canonicalRealm = new Realm({ schema: [canonicalSchema] });
      const canSchema = canonicalRealm.schema[0];
      canonicalRealm.close();
      expect(canSchema.properties).deep.equal(
        shSchema.properties,
        "Canonical and shorthand schemas should have idendical properties",
      );
    });
  });

  describe("General functionality", () => {
    it("should add and delete operations", () => {
      const realm = new Realm({ schema: [teamSchema] });

      const team = realm.write(() => {
        // insert two people
        return realm.create<Team>(teamSchema.name, {
          names: ["John", "Sue"],
        });
      });

      expect(team.names.size).equals(2, "Team Set size should be 2");

      // add another three names
      realm.write(() => {
        team.names.add("Pernille").add("Magrethe").add("Wilbur");
      });
      expect(team.names.size).equals(5, "Team Set size should be 5");

      // remove two names
      realm.write(() => {
        team.names.delete("John");
        team.names.delete("Sue");
      });
      expect(team.names.size).equals(3, "Team Set size should be 3");

      realm.close();
    });

    it("should work with mixed types", () => {
      const MixedObjectSchema = {
        name: "MixedObject",
        properties: {
          mixedField: "mixed<>",
        },
      };

      const IntSetObjectSchema = {
        name: "IntObject",
        properties: {
          intField: "int",
        },
      };
      interface MixedObject {
        mixedField: Realm.Set<Realm.Types.Mixed>;
      }
      interface IntObject {
        intField: Realm.Types.Int;
      }

      const realm = new Realm({ schema: [MixedObjectSchema, IntSetObjectSchema] });

      const mixedValues: Realm.Types.Mixed[] = ["Joe", 54, true] as Realm.Types.Mixed[];
      realm.write(() => {
        const intObject = realm.create<IntObject>(IntSetObjectSchema.name, { intField: 41 });
        mixedValues.push(intObject);
      });

      const mixedObject = realm.write<MixedObject>(() => {
        return realm.create<MixedObject>(MixedObjectSchema.name, { mixedField: mixedValues });
      });

      expect(mixedValues.length).equals(mixedObject.mixedField.size, `${mixedValues.length} values in set`);
      for (let i = 0; i < mixedValues.length; i++) {
        expect(mixedObject.mixedField.has(mixedValues[i])).equal(true, `The set does not have "${mixedValues[i]}"`);
      }
    });

    it("should aggregate correctly", () => {
      const realm = new Realm({ schema: [IntSetObjectSchema] });

      realm.write(() => {
        realm.create(IntSetObjectSchema.name, {
          intSet: [7, 9, 14],
        });
      });

      const myInts = realm.objects<IntSetObject>(IntSetObjectSchema.name)[0];

      expect(myInts.intSet.sum()).equals(30, "Sum of intSet should be 30");
      expect(myInts.intSet.avg()).equals(10, "Avg of intSet should be 10");
      expect(myInts.intSet.min()).equals(7, "Min of intSet should be 7");
      expect(myInts.intSet.max()).equals(14, "Max of intSet should be 14");

      // make sure that aggregation works after adding to a Set
      realm.write(() => {
        myInts.intSet.add(4).add(6);
      });

      expect(myInts.intSet.sum()).equals(40, "Sum of intSet should be 40 after adding elements");
      expect(myInts.intSet.avg()).equals(8, "Avg of intSet should be 8 after adding elements");
      expect(myInts.intSet.min()).equals(4, "Min of intSet should be 4 after adding elements");
      expect(myInts.intSet.max()).equals(14, "Max of intSet should be 14 after adding elements");

      // make sure that aggregation works after deleting from a Set
      realm.write(() => {
        myInts.intSet.delete(4);
      });

      expect(myInts.intSet.sum()).equals(36, "Sum of intSet should be 33 after deleting elements");
      expect(myInts.intSet.avg()).equals(9, "Avg of intSet should be 9 after deleting elements");
      expect(myInts.intSet.min()).equals(6, "Min of intSet should be 6 after deleting elements");
      expect(myInts.intSet.max()).equals(14, "Max of intSet should be 14 after deleting elements");
    });

    it("should iterate correctly", () => {
      const realm = new Realm({ schema: [IntSetObjectSchema] });

      const myInts = [1, 2, 3, 7, 9, 13];

      const intSetObject = realm.write(() => {
        return realm.create<IntSetObject>(IntSetObjectSchema.name, {
          intSet: myInts,
        });
      });

      const dbInts = intSetObject.intSet;
      const intArray2 = Array.from(myInts);
      let intCount = 0;
      dbInts.forEach((element) => {
        const foundIndex = intArray2.findIndex((value) => value == element);
        expect(foundIndex).not.equal(-1, element + " should have been present in dbInts");
        intArray2.splice(foundIndex, 1);

        intCount++;
      });
      expect(intCount).equals(dbInts.size, "`forEach` loop should execute on each set element");

      const intsValues = Array.from(dbInts.values());
      const sameInts = intsValues.map((value, index) => {
        return value == myInts[index];
      });
      const isSameInts = sameInts.reduce((prev, curr) => {
        return prev && curr;
      });
      expect(isSameInts).equals(true, "dbInts.values() should contain the same elements as myInts");

      const intsEntries = Array.from(dbInts.entries());
      const sameEntries = intsEntries.map((value, index) => {
        return value[0] == myInts[index] && value[1] == myInts[index];
      });
      const isCorrect = sameEntries.reduce((prev, curr) => {
        return prev && curr;
      });
      expect(isCorrect, "dbInts.entries() should contain the elements of type [myInts[x]).equals(true, myInts[x]]");

      realm.close();
    });

    it("should do the spread operation correctly", () => {
      const myInts = [1, 2, 3, 7, 9, 13];

      const intRealm = new Realm({ schema: [IntSetObjectSchema] });
      const intSetObject = intRealm.write(() => {
        return intRealm.create<IntSetObject>(IntSetObjectSchema.name, {
          intSet: myInts,
        });
      });

      const dbInts = intSetObject.intSet;
      expect([...dbInts]).deep.equals(myInts);

      intRealm.close();
    });
  });

  describe("Sets of objects", () => {
    const personSchema = {
      name: "Person",
      properties: {
        firstName: "string",
        age: "int",
      },
    };

    const personTeamSchema = {
      name: "PersonTeam",
      properties: {
        persons: "Person<>",
      },
    };

    interface Person {
      firstName: string;
      age: Realm.Types.Int;
    }

    interface Team {
      persons: Realm.Set<Person>;
    }

    let footballTeam: Team;

    openRealmBeforeEach({ schema: [personSchema, personTeamSchema] });
    beforeEach(function (this: RealmContext) {
      footballTeam = this.realm.write(() => {
        // insert two people
        return this.realm.create<Team>(personTeamSchema.name, {
          persons: [
            { firstName: "Joe", age: 4 },
            { firstName: "Sue", age: 53 },
            { firstName: "Bob", age: 99 },
          ],
        });
      });
    });

    it("should manipulate sets of objects correctly", function (this: RealmContext) {
      let teams = this.realm.objects<Team>(personTeamSchema.name);
      expect(teams.length).equals(1, "There should be one team");
      expect(teams[0].persons.size).equals(3, "Team Set size should be 3");

      // add another person
      this.realm.write(() => {
        footballTeam.persons.add({ firstName: "Bob", age: 99 });
      });
      teams = this.realm.objects(personTeamSchema.name);
      expect(teams.length).equals(1, "There should still be only one team");
      expect(teams[0].persons.size).equals(4, "Team Set size should be 4");
    });

    describe("Object filtering", () => {
      it("should work correctly", function (this: RealmContext) {
        let filteredSues = footballTeam.persons.filtered("firstName = $0", "Sue");
        expect(filteredSues.length).equals(1, "There should be only one Sue");
        expect(filteredSues[0].age).equals(53, "Sue's age should be 53");

        // add another Sue
        this.realm.write(() => {
          footballTeam.persons.add({ firstName: "Sue", age: 35 });
        });
        filteredSues = footballTeam.persons.filtered('firstName = "Sue"');
        expect(filteredSues.length).equals(2, "There should be two Sues");

        // find people older than 50
        const olderPersons = footballTeam.persons.filtered("age > 50");
        expect(olderPersons.length).equals(2, "There should be two people over 50");
      });

      it("should handle two sets containing same object correctly", function (this: RealmContext) {
        const teams = this.realm.objects<Team>(personTeamSchema.name);
        // add another person
        this.realm.write(() => {
          teams[0].persons.add({ firstName: "Bob", age: 99 });
        });

        // cross-contamination test:  create another team that also contains a Sue
        this.realm.write(() => {
          this.realm.create(personTeamSchema.name, { persons: [{ firstName: "Sue", age: 35 }] });
        });

        expect(teams.length).equals(2, "There should be two teams");

        const one = [...teams[0].persons][0];
        this.realm.write(() => {
          teams[0].persons.delete(one);
        });
        const people = this.realm.objects(personSchema.name);

        expect(people.length).equals(5, "There should be five 'Persons' entries");
        expect(teams[0].persons.size).equals(3, "Persons Set size should be three");
        expect(teams[1].persons.size).equals(1, "Second team has one member");

        this.realm.write(() => {
          const dan = this.realm.create(personSchema.name, { firstName: "Dan", age: 32 });
          this.realm.create(personTeamSchema.name, { persons: [dan] });
        });

        expect(people.length).equals(6, "There should be six 'Persons' entries");
        expect(teams.length).equals(3, "Three teams");
        expect(teams[2].persons.size).equals(1, "Third team has one member");
        expect([...teams[2].persons][0].firstName).equals("Dan");
      });
    });
  });

  describe("Set functions as part of the MDN reference", () => {
    openRealmBeforeEach({ schema: [teamSchema] });

    beforeEach(function (this: RealmContext) {
      this.realm.write(() => {
        // Create a football team
        this.realm.create(teamSchema.name, {
          names: ["Alice", "Bob", "Cecilia"],
        });
      });
    });

    it("should work with has()", function (this: RealmContext) {
      let teams = this.realm.objects<Team>(teamSchema.name);
      expect(teams.length).equals(1, "There should be only one team");
      let footballTeam = teams[0];
      expect(footballTeam.names.size).equals(3, "There should be 3 people in the football team");
      expect(footballTeam.names.has("Alice")).equals(true, "Alice should be in the football team");
      expect(footballTeam.names.has("Daniel")).equals(false, "Daniel shouldn't be in the football team");

      // add one football team member, delete another one
      this.realm.write(() => {
        footballTeam.names.add("Daniel").delete("Alice");
      });
      teams = this.realm.objects(teamSchema.name);
      expect(teams.length).equals(1, "There should be only one football team");
      footballTeam = teams[0];
      expect(footballTeam.names.size).equals(
        3,
        "There should be 3 people in the football team after adding Daniel and removing Alice",
      );
      expect(footballTeam.names.has("Alice")).equals(false, "Alice shouldn't be in the football team");

      // create another team with two people
      const handballTeam = this.realm.write(() => {
        return this.realm.create<Team>(teamSchema.name, {
          names: ["Daniel", "Felicia"],
        });
      });
      teams = this.realm.objects(teamSchema.name);
      expect(footballTeam.names.size).equals(3, "There should be 3 people in the football team. It wasn't altered");
      expect(handballTeam.names.size).equals(2, "There should be 2 people in the handball team");

      expect(handballTeam.names.has("Bob")).equals(false, "Bob shouldn't be in the handball team");
      expect(handballTeam.names.has("Daniel")).equals(true, "Daniel should be in the handball team");
    });

    it("should work with clear()", function (this: RealmContext) {
      const footballTeam = this.realm.objects<Team>(teamSchema.name)[0];
      const handballTeam = this.realm.write(() => {
        // remove everyone from the football team
        footballTeam.names.clear();
        // and create another team
        return this.realm.create<Team>(teamSchema.name, {
          names: ["Daniel", "Felicia"],
        });
      });

      const teams = this.realm.objects(teamSchema.name);
      expect(teams.length).equals(2, "There should be two teams.  Teams weren't cleared.");
      expect(footballTeam.names.size).equals(0, "There should be no people in the football team.  It was cleared");
      expect(handballTeam.names.size).equals(2, "There should be 2 people in the handball team.  It was cleared");
    });
  });

  describe("toJSON serialization", () => {
    it("should serialize sets of objects correctly", () => {
      const myInts = [1, 2, 3, 7, 9, 13];

      // test serialization of simple types
      const intRealm = new Realm({ schema: [IntSetObjectSchema] });
      const intSetObject = intRealm.write(() => {
        return intRealm.create<IntSetObject>(IntSetObjectSchema.name, {
          intSet: myInts,
        });
      });

      const dbInts = intSetObject.intSet;
      const dbString = JSON.stringify(dbInts);
      const jsString = JSON.stringify(myInts);
      expect(dbString).equals(jsString, "JSON serialization of dbInts should be the same as jsInts");

      intRealm.close();

      // test serialization of objects
      const itemSchema = {
        name: "Item",
        properties: {
          title: "string",
          priority: "int",
        },
      };
      interface Item {
        title: string;
        priority: Realm.Types.Int;
      }
      const itemSetSchema = {
        name: "ItemSetObject",
        properties: {
          itemSet: "Item<>",
        },
      };
      interface ItemSetObject {
        itemSet: Realm.Set<Item>;
      }

      const myItems: Item[] = [
        {
          title: "Item 1",
          priority: 1,
        },
        {
          title: "Item 2",
          priority: 8,
        },
        {
          title: "Item 3",
          priority: -4,
        },
      ];

      const itemRealm = new Realm({ schema: [itemSchema, itemSetSchema] });
      const itemSetObject = itemRealm.write(() => {
        return itemRealm.create<ItemSetObject>(itemSetSchema.name, {
          itemSet: myItems,
        });
      });

      const dbItems = itemSetObject.itemSet;
      const dbItemString = JSON.stringify(dbItems);
      const jsItemString = JSON.stringify(myItems);
      expect(dbItemString).equals(jsItemString, "Object serialization from Set and JS object should be the same");

      itemRealm.close();
    });
  });
});
