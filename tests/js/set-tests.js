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
                Names: "string<>"
            }
        };

        const canonical_schema = {
            name: "CanonicalSchema",
            properties: {
                Names:  {type: 'set',   objectType: 'string'}

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
        const people_schema = {
            name: "Person",
            properties: {
                Names: "string<>"
            }
        };

        const realm = new Realm({ schema: [people_schema] });
        const schema = realm.schema;

        realm.write(() => {
            // insert two people
            realm.create(people_schema.name, {
                Names: ["John", "Sue"]
            });
        });

        let people = realm.objects(people_schema.name);
        TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
        TestCase.assertEqual(2, people[0].Names.length, "Persons Set length should be 2");

        // add another three names
        realm.write(() => {
            people[0].Names.add("Dev").add("Ava").add("Harsha");
        });
        people = realm.objects(people_schema.name);
        TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
        TestCase.assertEqual(5, people[0].Names.length, "Persons Set length should be 5");

        // remove two names
        realm.write(() => {
            people[0].Names.delete("John");
            people[0].Names.delete("Sue");
        });
        people = realm.objects(people_schema.name);
        TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
        TestCase.assertEqual(3, people[0].Names.length, "Persons Set length should be 3");
        
        realm.close();
    },


    async testSetObjectAddDelete() {
        const person_schema = {
            name: "Person",
            properties: {
                FirstName: 'string',
                Age: 'int'
            }
        };

        const people_schema = {
            name: 'People',
            properties: {
                Persons: 'Person<>'
            }
        };

        const realm = new Realm({ schema: [person_schema, people_schema] });
        const schema = realm.schema;

        realm.write(() => {
            // insert two people
            realm.create(people_schema.name, {Persons: [
                {FirstName: "Joe",  Age: 4},
                {FirstName: "Sue",  Age: 53},
            ]});
        });


        let people = realm.objects(people_schema.name);
        TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
        TestCase.assertEqual(2, people[0].Persons.length, "Persons Set length should be 2");

        // add another person
        realm.write(() => {
            people[0].Persons.add({FirstName: 'bob', Age: 99});
        });

        people = realm.objects(people_schema.name);
        TestCase.assertEqual(1, people.length, "There should be one 'People' entry")
        TestCase.assertEqual(3, people[0].Persons.length, "Persons Set length should be 3");
//        console.log("Joe's name:  " + people.Persons[0].FirstName);
        let onfe = people[0].Persons.get(0);

        let filteredsues = people[0].Persons.filtered('FirstName = "Sue"');

        console.log("Sue's age:  " + filteredsues[0].Age);


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
//         TestCase.assertEqual(2, people[0].Persons.length, "Persons Set length should be 2");

        // TODO: add another 'People'
    },

    async testSetUtilityFunctions() {
        const people_schema = {
            name: "Person",
            properties: {
                Names: "string<>"
            }
        };

        const realm = new Realm({ schema: [people_schema] });
        const schema = realm.schema;

        //
        // Set.has() functionality
        //

        realm.write(() => {
            // put some names in our database
            realm.create(people_schema.name, {
                Names: ["Kenneth", "Andrew", "Steffen"]
            });
        });

        let teams = realm.objects(people_schema.name);
        TestCase.assertEqual(1, teams.length, "There should be only one JS team");
        let js_team = teams[0];
        TestCase.assertEqual(3, js_team.Names.length, "There should be 3 people in the JS team");
        TestCase.assertEqual(true, js_team.Names.has("Kenneth"), "Kenneth should be in the JS team");
        TestCase.assertEqual(false, js_team.Names.has("Jason"), "Jason shouldn't be in the JS team");

        // add one JS team member, delete another one
        realm.write(() => {
            js_team.Names.add("Kræn").delete("Kenneth");
        });
        teams = realm.objects(people_schema.name);
        TestCase.assertEqual(1, teams.length, "There should be only one JS team");
        js_team = teams[0];
        TestCase.assertEqual(3, js_team.Names.length, "There should be 3 people in the JS team");
        TestCase.assertEqual(false, js_team.Names.has("Kenneth"), "Kenneth shouldn't be in the JS team");

        // create another team with two people
        realm.write(() => {
            realm.create(people_schema.name, {
                Names: ["Christian", "Claus"]
            });
        });
        teams = realm.objects(people_schema.name);
        TestCase.assertEqual(2, teams.length, "There should be two teams");
        js_team = teams[0];
        let java_team = teams[1];
        TestCase.assertEqual(3, js_team.Names.length, "There should be 3 people in the JS team");
        TestCase.assertEqual(2, java_team.Names.length, "There should be 2 people in the Java team");

        TestCase.assertEqual(false, java_team.Names.has("Kenneth"), "Kenneth shouldn't be in the Java team");
        TestCase.assertEqual(true, java_team.Names.has("Claus"), "Claus should be in the Java team");

        //
        // Set.clear() functionality
        //

        // remove everyone from the JS team
        realm.write(() => {
            js_team.Names.clear();
        });

        teams = realm.objects(people_schema.name);
        TestCase.assertEqual(2, teams.length, "There should be two teams");
        js_team = teams[0];
        java_team = teams[1];
        TestCase.assertEqual(0, js_team.Names.length, "There should be no people in the JS team");
        TestCase.assertEqual(2, java_team.Names.length, "There should be 2 people in the Java team");

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
        TestCase.assertEqual(2, objects[0].intSet.length, "Length of Set should be 2");

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
        TestCase.assertEqual(2, objects[0].intSet.length, "Length of Set should be 2");

        realm.write(() => {
            objects[0].intSet.clear();
        });
        await realm.syncSession.uploadAllLocalChanges();
        objects = realm.objects(schema.name);
        objcount = objects.length;
        // there should still only be one object
        TestCase.assertEqual(1, objcount, "Number of objects should be 1");
        // .. but the object's Set should have two elements
        TestCase.assertEqual(0, objects[0].intSet.length, "Length of Set should be 0");


        realm.close();
    }
}
