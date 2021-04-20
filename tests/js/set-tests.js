////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

'use strict';

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
    return require_method(module);
}

const Realm = require('realm');
const TestCase = require('./asserts');

const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isElectronProcess = typeof process === 'object' && process.versions && process.versions.electron;
const fs = isNodeProcess ? nodeRequire('fs-extra') : require('react-native-fs');

module.exports = {
    async testSetSchema() {
        // test that short (JS) and canonical schema types yield
        // the same results
        const shorthandSchema = {
            name: "ShorthandSchema",
            properties: {
                names: "string<>"
            }
        };

        const canonicalSchema = {
            name: "CanonicalSchema",
            properties: {
                names:  {type: 'set',   objectType: 'string'}

            }
        };

        const shorthandRealm = new Realm({ schema: [shorthandSchema] });
        const shSchema = shorthandRealm.schema;
        shorthandRealm.close();

        const canonicalRealm = new Realm({ schema: [canonicalSchema] });
        const canSchema = canonicalRealm.schema;
        canonicalRealm.close();

        TestCase.assertEqual(shSchema.properties, canSchema.properties, 
            "Canonical and shorthand schemas should have idendical properties");
    },

    //
    // test manipulation of Sets of strings
    async testSetStringAddDelete() {
        // test add/delete operations on Sets of type string
        const teamSchema = {
            name: "Team",
            properties: {
                names: "string<>"
            }
        };

        const realm = new Realm({ schema: [teamSchema] });
        const schema = realm.schema;

        realm.write(() => {
            // insert two people
            realm.create(teamSchema.name, {
                names: ["John", "Sue"]
            });
        });

        let teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should be one team")
        TestCase.assertEqual(teams[0].names.size, 2, "Team Set size should be 2");

        // add another three names
        realm.write(() => {
            teams[0].names.add("Pernille").add("Magrethe").add("Wilbur");
        });
        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should be one team.  We didn't add any")
        TestCase.assertEqual(teams[0].names.size, 5, "Team Set size should be 5");

        // remove two names
        realm.write(() => {
            teams[0].names.delete("John");
            teams[0].names.delete("Sue");
        });
        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should still be only one team");
        TestCase.assertEqual(teams[0].names.size, 3, "Team Set size should be 3");

        realm.close();
    },


    //
    // test manipulation of Sets of objects
    async testSetObjectAddDelete() {
        const personSchema = {
            name: "Person",
            properties: {
                firstName: 'string',
                age: 'int'
            }
        };

        const teamSchema = {
            name: 'Team',
            properties: {
                persons: 'Person<>'
            }
        };

        const realm = new Realm({ schema: [personSchema, teamSchema] });
        const schema = realm.schema;

        realm.write(() => {
            // insert two people
            realm.create(teamSchema.name, {persons: [
                {firstName: "Joe",  age: 4},
                {firstName: "Sue",  age: 53},
            ]});
        });

        let teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should be one team");
        TestCase.assertEqual(teams[0].persons.size, 2, "Team Set size should be 2");

        // add another person
        realm.write(() => {
            teams[0].persons.add({firstName: 'Bob', age: 99});
        });
        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should still be only one team");
        TestCase.assertEqual(teams[0].persons.size, 3, "Team Set size should be 3");

    },


    //
    // test filtering on object properties
    async testSetObjectFilter() {
        const personSchema = {
            name: "Person",
            properties: {
                firstName: 'string',
                age: 'int'
            }
        };

        const teamSchema = {
            name: 'Team',
            properties: {
                persons: 'Person<>'
            }
        };

        const realm = new Realm({ schema: [personSchema, teamSchema] });
        const schema = realm.schema;

        realm.write(() => {
            // insert two people
            realm.create(teamSchema.name, {persons: [
                {firstName: "Joe",  age: 4},
                {firstName: "Sue",  age: 53},
                {firstName: 'Bob', age: 99},
            ]});
        });


        let teams = realm.objects(teamSchema.name);
        let filteredSues = teams[0].persons.filtered('firstName = "Sue"');
        TestCase.assertEqual(filteredSues.length, 1, "There should be only one Sue");
        TestCase.assertEqual(filteredSues[0].age, 53, "Sue's age should be 53");

        // add another Sue
        teams = realm.objects(teamSchema.name);
        realm.write(() => {
            teams[0].persons.add({firstName: "Sue", age: 35});
        });
        filteredSues = teams[0].persons.filtered('firstName = "Sue"');
        TestCase.assertEqual(filteredSues.length, 2, "There should be two Sues");

        // find people older than 50
        let olderPersons = teams[0].persons.filtered('age > 50');
        TestCase.assertEqual(olderPersons.length, 2, "There should be two people over 50");


        // cross-contamination test:  create another team that also cointains a Sue
        realm.write(() => {
            realm.create(teamSchema.name, {persons: [
                {firstName: "Sue",  age: 35},
            ]});
        });

        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(teams.length, 2, "There should be two teams");

        // TODO:  The tests below are waiting for LinkedObj support in Mixed

//         let one = people[0].Persons.get(0);
//         let oij = people[0].Persons.has({FirstName: "Sue",  Age: 53});

//         realm.write(() => {
//             people = realm.objects(people_schema.name);
//             people[0].Persons.delete(one);
// //            people[0].Persons.delete({FirstName: "Sue",  Age: 53});
//         });
//         people = realm.objects(people_schema.name);

//         TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
//         TestCase.assertEqual(2, people[0].Persons.length, "Persons Set size should be 2");

        // TODO: add another 'People'
    },


    //
    // test functions that are provided by Set as part of the MDN reference
    async testSetUtilityFunctions() {
        const peopleSchema = {
            name: "Person",
            properties: {
                names: "string<>"
            }
        };

        const realm = new Realm({ schema: [peopleSchema] });
//        const schema = realm.schema;

        //
        // Set.has() functionality
        //

        realm.write(() => {
            // put some names in our database
            realm.create(peopleSchema.name, {
                names: ["Alice", "Bob", "Cecilia"]
            });
        });

        let teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should be only one team");
        let footballTeam = teams[0];
        TestCase.assertEqual(footballTeam.names.size, 3, "There should be 3 people in the football team");
        TestCase.assertEqual(true, footballTeam.names.has("Alice"), "Alice should be in the football team");
        TestCase.assertEqual(false, footballTeam.names.has("Daniel"), "Daniel shouldn't be in the football team");

        // add one football team member, delete another one
        realm.write(() => {
            footballTeam.names.add("Daniel").delete("Alice");
        });
        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(teams.length, 1, "There should be only one football team");
        footballTeam = teams[0];
        TestCase.assertEqual(footballTeam.names.size, 3, "There should be 3 people in the football team after adding Daniel and removing Alice");
        TestCase.assertEqual(false, footballTeam.names.has("Alice"), "Alice shouldn't be in the football team");

        // create another team with two people
        realm.write(() => {
            realm.create(peopleSchema.name, {
                names: ["Daniel", "Felicia"]
            });
        });
        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(teams.length, 2, "There should be two teams");
        footballTeam = teams[0];
        let handballTeam = teams[1];
        TestCase.assertEqual(footballTeam.names.size, 3, "There should be 3 people in the football team.  It wasn't altered");
        TestCase.assertEqual(handballTeam.names.size, 2, "There should be 2 people in the handball team");

        TestCase.assertFalse(handballTeam.names.has("Bob"), "Bob shouldn't be in the handball team");
        TestCase.assertTrue(handballTeam.names.has("Daniel"), "Daniel should be in the handball team");

        //
        // Set.clear() functionality
        //
        // remove everyone from the football team
        realm.write(() => {
            footballTeam.names.clear();
        });

        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(teams.length, 2, "There should be two teams.  Teams weren't cleared.");
        footballTeam = teams[0];
        handballTeam = teams[1];
        TestCase.assertEqual(footballTeam.names.size, 0, "There should be no people in the football team.  It was cleared");
        TestCase.assertEqual(handballTeam.names.size, 2, "There should be 2 people in the handball team.  It was cleared");

        realm.close();
    },


    async testSetAggregates() {
        if (!isNodeProcess) {
            // aggregate functions only work on node
            return;
        }

        const intSchema = {
            name: "SetInt",
            properties: {
                intSet: "int<>",
            }
        };

        const realm = new Realm({ schema: [intSchema] });

        realm.write(() => {
            realm.create(intSchema.name, {
                intSet: [7, 9, 14],
            });
        });

        let myInts = realm.objects(intSchema.name)[0];

        TestCase.assertEqual(myInts.intSet.sum(), 30,  "Sum of intSet should be 30");
        TestCase.assertEqual(myInts.intSet.avg(), 10,  "Avg of intSet should be 10");
        TestCase.assertEqual(myInts.intSet.min(), 7,   "Min of intSet should be 7");
        TestCase.assertEqual(myInts.intSet.max(), 14,  "Max of intSet should be 14");

        // make sure that aggregation works after adding to a Set
        realm.write(() => {
            myInts.intSet.add(4).add(6);
        });

        TestCase.assertEqual(myInts.intSet.sum(), 40,  "Sum of intSet should be 40 after adding elements");
        TestCase.assertEqual(myInts.intSet.avg(), 8,   "Avg of intSet should be 8 after adding elements");
        TestCase.assertEqual(myInts.intSet.min(), 4,   "Min of intSet should be 4 after adding elements");
        TestCase.assertEqual(myInts.intSet.max(), 14,  "Max of intSet should be 14 after adding elements");

        // make sure that aggregation works after deleting from a Set
        realm.write(() => {
            myInts.intSet.delete(4);
        });

        TestCase.assertEqual(myInts.intSet.sum(), 36, "Sum of intSet should be 33 after deleting elements");
        TestCase.assertEqual(myInts.intSet.avg(), 9,  "Avg of intSet should be 9 after deleting elements");
        TestCase.assertEqual(myInts.intSet.min(), 6,  "Min of intSet should be 6 after deleting elements");
        TestCase.assertEqual(myInts.intSet.max(), 14, "Max of intSet should be 14 after deleting elements");
    },


    // Test that iteration (`forEach`, `entries()`, `values()`) work as intended
    async testSetIteration() {
        const intSchema = {
            name: "SetInt",
            properties: {
                intSet: "int<>",
            }
        };

        const realm = new Realm({ schema: [intSchema] });

        const myInts = [1, 2, 3, 7, 9, 13];

        realm.write(() => {
            realm.create(intSchema.name, {
                intSet: myInts,
            });
        });

        let dbInts = realm.objects(intSchema.name)[0].intSet;
        let intArray2 = Array.from(myInts);
        let intCount = 0;
        dbInts.forEach((element) => {
            let foundIndex = intArray2.findIndex((value) => value == element);
            TestCase.assertNotEqual(foundIndex, -1, element + " should have been present in dbInts");
            intArray2.splice(foundIndex, 1);

            intCount++;
        });
        TestCase.assertEqual(intCount, dbInts.size, "`forEach` loop should execute on each set element")

        const intsValues = Array.from(dbInts.values());
        const sameInts = intsValues.map((value, index) => {
            return value == myInts[index];
        });
        const isSameInts = sameInts.reduce((prev, curr) => {
            return prev && curr;
        });
        TestCase.assertTrue(isSameInts, "dbInts.values() should contain the same elements as myInts");

        const intsEntries = Array.from(dbInts.entries());
        const sameEntries = intsEntries.map((value, index) => {
            return value[0] == myInts[index] && value[1] == myInts[index];
        });
        const isCorrect = sameEntries.reduce((prev, curr) => {
            return prev && curr;
        });
        TestCase.assertTrue(isCorrect, "dbInts.entries() should contain the elements of type [myInts[x], myInts[x]]");

        realm.close();
    },

    // test that Set's .toJSON works as intended
    async testSetSerialization() {
        const intSchema = {
            name: "SetInt",
            properties: {
                intSet: "int<>",
            }
        };

        const myInts = [1, 2, 3, 7, 9, 13];

        // test serialization of simple types
        const intRealm = new Realm({ schema: [intSchema] });
        intRealm.write(() => {
            intRealm.create(intSchema.name, {
                intSet: myInts,
            });
        });

        let dbInts = intRealm.objects(intSchema.name)[0].intSet;
        let dbString = JSON.stringify(dbInts);
        let jsString = JSON.stringify(myInts);
        TestCase.assertEqual(dbString, jsString, "JSON serialization of dbInts should be the same as jsInts");

        intRealm.close();

        // test serialization of objects
        const itemSchema = {
            name: "Item",
            properties: {
                title: 'string',
                priority: 'int'
            }
        };
        const listSchema = {
            name: "ItemList",
            properties: {
                itemSet: "Item<>",
            }
        };

        let myItems = [
            {
                title: 'Item 1',
                priority: 1
            },
            {
                title: 'Item 2',
                priority: 8
            },
            {
                title: 'Item 3',
                priority: -4
            },
        ];

        const itemRealm = new Realm({ schema: [itemSchema, listSchema] });
        itemRealm.write(() => {
            itemRealm.create(listSchema.name, {
                itemSet: myItems,
            });
        });

        let dbItems = itemRealm.objects(listSchema.name)[0].itemSet;
        let dbItemString = JSON.stringify(dbItems);
        let jsItemString = JSON.stringify(myItems);
        TestCase.assertEqual(dbItemString, jsItemString, "Object serialization from Set and JS object should be the same")

        itemRealm.close();
    },
}
