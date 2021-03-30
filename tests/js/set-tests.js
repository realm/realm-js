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
    testSetObjectInsertion: function() {
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
                // TODO:  This format doesn't parse yet:
//                things:  {type: 'set',   objectType: 'int'}
                Persons: 'Person<>'
            }
        };

        const realm = new Realm({ schema: [person_schema, people_schema] });
        const schema = realm.schema;

        console.log("Write...\n");

        realm.write(() => {
            // insert two people
            let people = realm.create(people_schema.name, {Persons: [
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

        let filteredsues = people[0].Persons.filtered('FirstName = "Sue"');

        console.log("Sue's age:  " + filteredsues[0].Age);
    },
}
