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
const AppConfig = require("./support/testConfig");




// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
    return require_method(module);
}

function closeAfterUpload(realm) {
    return realm.syncSession.uploadAllLocalChanges().then(() => realm.close());
}

const Realm = require('realm');
const TestCase = require('./asserts');
const schemas = require('./schemas');
const Utils = require('./test-utils');
const { Decimal128, ObjectId } = require("bson");
//const { Test } = require('tslint');

let pathSeparator = '/';
const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
const isElectronProcess = typeof process === 'object' && process.versions && process.versions.electron;

if (isNodeProcess && process.platform === 'win32') {
    pathSeparator = '\\';
}

const fs = isNodeProcess ? nodeRequire('fs-extra') : require('react-native-fs');

module.exports = {
    async testSetSchema() {
        // test that short (JS) and canonical schema types yield
        // the same results
        const shorthand_schema = {
            name: "ShorthandSchema",
            properties: {
                names: "string<>"
            }
        };

        const canonical_schema = {
            name: "CanonicalSchema",
            properties: {
                names:  {type: 'set',   objectType: 'string'}

            }
        };

        const shorthand_realm = new Realm({ schema: [shorthand_schema] });
        const sh_schema = shorthand_realm.schema;
        shorthand_realm.close();

        const canonical_realm = new Realm({ schema: [canonical_schema] });
        const can_schema = canonical_realm.schema;
        canonical_realm.close();

        TestCase.assertEqual(sh_schema.properties, can_schema.properties, 
            "Canonical and shorthand schemas should have idendical properties");
    },

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
        TestCase.assertEqual(1, teams.length, "There should be one team")
        TestCase.assertEqual(2, teams[0].names.length, "Team Set size should be 2");

        // add another three names
        realm.write(() => {
            teams[0].names.add("Pernille").add("Magrethe").add("Wilbur");
        });
        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(1, teams.length, "There should be one team.  We didn't add any")
        TestCase.assertEqual(5, teams[0].names.length, "Team Set size should be 5");

        // remove two names
        realm.write(() => {
            teams[0].names.delete("John");
            teams[0].names.delete("Sue");
        });
        teams = realm.objects(teamSchema.name);
        TestCase.assertEqual(1, teams.length, "There should still be only one team");
        TestCase.assertEqual(3, teams[0].names.length, "Team Set size should be 3");

        // TODO:  test multiple teams
        
        realm.close();
    },


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


        let people = realm.objects(teamSchema.name);
        TestCase.assertEqual(1, people.length, "There should be one team")
        TestCase.assertEqual(2, people[0].persons.length, "Team Set size should be 2");

        // add another person
        realm.write(() => {
            people[0].persons.add({firstName: 'Bob', age: 99});
        });

        people = realm.objects(teamSchema.name);
        TestCase.assertEqual(1, people.length, "There should still be only one team")
        TestCase.assertEqual(3, people[0].persons.length, "Team Set size should be 3");
//        console.log("Joe's name:  " + people.Persons[0].FirstName);
        let onfe = people[0].persons.get(0);

        let filteredsues = people[0].persons.filtered('firstName = "Sue"');

        console.log("Sue's age:  " + filteredsues[0].age);

        // TODO:  filtering on several teams containing the same person


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

    async testSetUtilityFunctions() {
        const peopleSchema = {
            name: "Person",
            properties: {
                names: "string<>"
            }
        };

        const realm = new Realm({ schema: [peopleSchema] });
        const schema = realm.schema;

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
        TestCase.assertEqual(1, teams.length, "There should be only one team");
        let footballTeam = teams[0];
        TestCase.assertEqual(3, footballTeam.names.length, "There should be 3 people in the football team");
        TestCase.assertEqual(true, footballTeam.names.has("Alice"), "Alice should be in the football team");
        TestCase.assertEqual(false, footballTeam.names.has("Daniel"), "Daniel shouldn't be in the football team");

        // add one football team member, delete another one
        realm.write(() => {
            footballTeam.names.add("Daniel").delete("Alice");
        });
        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(1, teams.length, "There should be only one football team");
        footballTeam = teams[0];
        TestCase.assertEqual(3, footballTeam.names.length, "There should be 3 people in the football team after adding Daniel and removing Alice");
        TestCase.assertEqual(false, footballTeam.names.has("Alice"), "Alice shouldn't be in the football team");

        // create another team with two people
        realm.write(() => {
            realm.create(peopleSchema.name, {
                names: ["Daniel", "Felicia"]
            });
        });
        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(2, teams.length, "There should be two teams");
        footballTeam = teams[0];
        let handballTeam = teams[1];
        TestCase.assertEqual(3, footballTeam.names.length, "There should be 3 people in the football team.  It wasn't altered");
        TestCase.assertEqual(2, handballTeam.names.length, "There should be 2 people in the handball team");

        TestCase.assertEqual(false, handballTeam.names.has("Bob"), "Bob shouldn't be in the handball team");
        TestCase.assertEqual(true, handballTeam.names.has("Daniel"), "Daniel should be in the handball team");

        //
        // Set.clear() functionality
        //

        // remove everyone from the JS team
        realm.write(() => {
            footballTeam.names.clear();
        });

        teams = realm.objects(peopleSchema.name);
        TestCase.assertEqual(2, teams.length, "There should be two teams.  Teams weren't cleared.");
        footballTeam = teams[0];
        handballTeam = teams[1];
        TestCase.assertEqual(0, footballTeam.names.length, "There should be no people in the football team.  It was cleared");
        TestCase.assertEqual(2, handballTeam.names.length, "There should be 2 people in the handball team.  It was cleared");

        realm.close();
    },

    // TODO:  Move Sync tests to separate file
    async testSetSyncedNonRequired() {
        // test that we can create a synced realm with a Set
        // that isn't required
        if (!global.enableSyncTests) return;

        const schema = {
            name: "SyncedSetInt",
            primaryKey: "_id",
            properties: {
                _id: "int",
                intSet: "int<>",
            }
        }

        const appConfig = AppConfig.integrationAppConfig;
        const app = new Realm.App(appConfig);
        const credentials = Realm.Credentials.anonymous();

        const user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "_id",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [schema]
        };
        const realm = await Realm.open(config);


        realm.write(() => {
            realm.deleteAll();
        });

        let objects = realm.objects(schema.name);
        let objcount = objects.length;

        TestCase.assertEqual(0, objcount, "Table should be empty");
    },

    async testSetSyncedAddDelete() {
        // tests a synced realm while adding/deleting elements in a Set
        if (!global.enableSyncTests) return;

        const schema = {
            name: "SyncedSetInt",
            primaryKey: "_id",
            properties: {
                _id: "int",
                intSet: "int<>",
            }
        }
        
        const appConfig = AppConfig.integrationAppConfig;
        const app = new Realm.App(appConfig);
//        Realm.App.Sync.setLogLevel(app, 'all');
        const credentials = Realm.Credentials.anonymous();

        const user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "_id",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [schema]
        };
        const realm = await Realm.open(config);

        realm.write(() => {
            realm.deleteAll();
        });

        // TODO:  fix Error: mySetfrew.mandatory must be of type 'number', got 'number' (2)
        realm.write(() => {
            realm.create(schema.name, { 
                _id: 77,
                intSet: [2],
              });  
        });

        await realm.syncSession.uploadAllLocalChanges();

        let objects = realm.objects(schema.name);
        let objcount = objects.length;
        TestCase.assertEqual(1, objcount);

        // add an element to the Set
        realm.write(() => {
            let myset = objects[0].intSet.add(5);
        });
        await realm.syncSession.uploadAllLocalChanges();

        objects = realm.objects(schema.name);
        objcount = objects.length;

        // there should still only be one object
        TestCase.assertEqual(1, objcount, "Number of objects should be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(2, objects[0].intSet.length, "Size of Set should be 2");

        // add an element to the Set, then delete another one
        realm.write(() => {
            let myset = objects[0].intSet.add(6).delete(2);
        });
        await realm.syncSession.uploadAllLocalChanges();

        objects = realm.objects(schema.name);
        objcount = objects.length;

        // there should still only be one object
        TestCase.assertEqual(1, objcount, "Number of objects should be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(2, objects[0].intSet.length, "Size of Set should be 2");

        realm.write(() => {
            objects[0].intSet.clear();
        });
        await realm.syncSession.uploadAllLocalChanges();
        objects = realm.objects(schema.name);
        objcount = objects.length;
        // there should still only be one object
        TestCase.assertEqual(1, objcount, "Number of objects should still be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(0, objects[0].intSet.length, "Size of Set should be 0");


        realm.close();
    }
}
