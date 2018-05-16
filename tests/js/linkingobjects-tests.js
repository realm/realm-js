////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

var Realm = require('realm');
var TestCase = require('./asserts');
var schemas = require('./schemas');

function names(results) {
    return results.map(function(object) {
        return object.name;
    });
}

module.exports = {
    testBasics: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});

        var olivier, oliviersParents;
        realm.write(function() {
            olivier = realm.create('PersonObject', {name: 'Olivier', age: 0});
            realm.create('PersonObject', {name: 'Christine', age: 25, children: [olivier]});
            oliviersParents = olivier.parents;

            TestCase.assertArraysEqual(names(oliviersParents), ['Christine']);
        });

        TestCase.assertArraysEqual(names(oliviersParents), ['Christine']);

        var jp;
        realm.write(function() {
            jp = realm.create('PersonObject', {name: 'JP', age: 28, children: [olivier]});

            TestCase.assertArraysEqual(names(oliviersParents), ['Christine', 'JP']);
        });

        realm.write(function() {
            realm.delete(olivier);

            TestCase.assertEqual(oliviersParents.length, 0);
        });
    },

    testFilteredLinkingObjects: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});

        var christine, olivier, oliviersParents;
        realm.write(function() {
            olivier = realm.create('PersonObject', {name: 'Olivier', age: 0});
            christine = realm.create('PersonObject', {name: 'Christine', age: 25, children: [olivier]});
            realm.create('PersonObject', {name: 'JP', age: 28, children: [olivier]});
            oliviersParents = olivier.parents;
        });

        // Three separate queries so that accessing a property on one doesn't invalidate testing of other properties.
        var resultsA = oliviersParents.filtered('age > 25');
        var resultsB = oliviersParents.filtered('age > 25');
        var resultsC = oliviersParents.filtered('age > 25');

        realm.write(function() {
            var removed = christine.children.splice(0);
            TestCase.assertEqual(removed.length, 1);
        });

        TestCase.assertEqual(resultsA.length, 1);
        TestCase.assertEqual(resultsB.filtered("name = 'Christine'").length, 0);
        TestCase.assertArraysEqual(names(resultsC), ['JP']);
    },

    testFilteredLinkingObjectsByName: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});

        var christine, olivier;
        realm.write(function() {
            olivier = realm.create('PersonObject', {name: 'Olivier', age: 0});
            christine = realm.create('PersonObject', {name: 'Christine', age: 25, children: [olivier]});
            realm.create('PersonObject', {name: 'JP', age: 28, children: [olivier]});
        });

        let people = realm.objects('PersonObject')

        TestCase.assertEqual(people.filtered('parents.age > 25').length, 1);
        TestCase.assertEqual(people.filtered('parents.age > 25')[0].name, 'Olivier');
        TestCase.assertEqual(people.filtered('parents.@count == 2').length, 1);
        TestCase.assertEqual(people.filtered('parents.name CONTAINS[c] "chris"').length, 1);
        TestCase.assertEqual(people.filtered('parents.name.@size == 2').length, 1);
        TestCase.assertEqual(people.filtered('25 IN parents.age').length, 1);
    },

    testNamedLinkingObjectsAcrossClasses: function() {
        let realm = new Realm({schema: [schemas.Language, schemas.Country]});
        realm.write(() => {
            let english = realm.create('Language', {name: 'English'});
            let french = realm.create('Language', {name: 'French'});
            let danish = realm.create('Language', {name: 'Danish'});
            let latin = realm.create('Language', {name: 'Latin'});
            let canada = realm.create('Country', {name: 'Canada', languages: [english, french]});
            let denmark = realm.create('Country', {name: 'Denmark', languages: [danish, english]});
            let france = realm.create('Country', {name: 'France', languages: [french, english]});
        });
        let languages = realm.objects('Language');
        {
            let spokenInThreeCountries = languages.filtered('spokenIn.@count == 3');
            TestCase.assertEqual(spokenInThreeCountries.length, 1);
            TestCase.assertEqual(spokenInThreeCountries[0].name, 'English');
            let spokenInTwoCountries = languages.filtered('spokenIn.@count == 2');
            TestCase.assertEqual(spokenInTwoCountries.length, 1);
            TestCase.assertEqual(spokenInTwoCountries[0].name, 'French')
            let spokenInOneCountry = languages.filtered('spokenIn.@count == 1');
            TestCase.assertEqual(spokenInOneCountry.length, 1);
            TestCase.assertEqual(spokenInOneCountry[0].name, 'Danish')
            let languagesSpokenInCanada = languages.filtered('spokenIn.name ==[c] "canada"');
            TestCase.assertEqual(languagesSpokenInCanada.length, 2);
            TestCase.assertEqual(languagesSpokenInCanada[0].name, 'English');
            TestCase.assertEqual(languagesSpokenInCanada[1].name, 'French');
        }
        // check the same but using the unnamed relationship which is available to users
        {
            let spokenInThreeCountries = languages.filtered('@links.Country.languages.@count == 3');
            TestCase.assertEqual(spokenInThreeCountries.length, 1);
            TestCase.assertEqual(spokenInThreeCountries[0].name, 'English');
            let spokenInTwoCountries = languages.filtered('@links.Country.languages.@count == 2');
            TestCase.assertEqual(spokenInTwoCountries.length, 1);
            TestCase.assertEqual(spokenInTwoCountries[0].name, 'French')
            let spokenInOneCountry = languages.filtered('@links.Country.languages.@count == 1');
            TestCase.assertEqual(spokenInOneCountry.length, 1);
            TestCase.assertEqual(spokenInOneCountry[0].name, 'Danish')
            let languagesSpokenInCanada = languages.filtered('@links.Country.languages.name ==[c] "canada"');
            TestCase.assertEqual(languagesSpokenInCanada.length, 2);
            TestCase.assertEqual(languagesSpokenInCanada[0].name, 'English');
            TestCase.assertEqual(languagesSpokenInCanada[1].name, 'French');
        }
        let notSpokenInAnyCountry = languages.filtered('@links.@count == 0'); // no incoming links over any relationships to the object
        TestCase.assertEqual(notSpokenInAnyCountry.length, 1);
        TestCase.assertEqual(notSpokenInAnyCountry[0].name, 'Latin');
        let notSpokenMethod2 = languages.filtered('@links.Country.languages.@count == 0'); // links of a specific relationship are 0
        TestCase.assertEqual(notSpokenMethod2.length, 1);
        TestCase.assertEqual(notSpokenMethod2[0].name, 'Latin');
    },

    testMethod: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});

        var person;
        realm.write(function () {
            person = realm.create('PersonObject', { name: 'Person 1', age: 50 });
        });

        TestCase.assertThrows(() => person.linkingObjects('NoSuchSchema', 'noSuchProperty'),
            "Could not find schema for type 'NoSuchSchema'");

        TestCase.assertThrows(() => person.linkingObjects('PersonObject', 'noSuchProperty'),
            "Type 'PersonObject' does not contain property 'noSuchProperty'");

        TestCase.assertThrows(() => person.linkingObjects('PersonObject', 'name'),
            "'PersonObject.name' is not a relationship to 'PersonObject'");

        var olivier, oliviersParents;
        realm.write(function() {
            olivier = realm.create('PersonObject', {name: 'Olivier', age: 0});
            realm.create('PersonObject', {name: 'Christine', age: 25, children: [olivier]});
            oliviersParents = olivier.linkingObjects('PersonObject', 'children');

            TestCase.assertArraysEqual(names(oliviersParents), ['Christine']);
        });

        TestCase.assertArraysEqual(names(oliviersParents), ['Christine']);

        var jp;
        realm.write(function() {
            jp = realm.create('PersonObject', {name: 'JP', age: 28, children: [olivier]});

            TestCase.assertArraysEqual(names(oliviersParents), ['Christine', 'JP']);
        });

        realm.write(function() {
            realm.delete(olivier);

            TestCase.assertEqual(oliviersParents.length, 0);
        });
    },

    testLinkingObjectsCount: function() {
        var realm = new Realm({schema: [schemas.PersonObject]});

        var john;
        realm.write(function () {
            john = realm.create('PersonObject', { name: 'John', age: 50 });
        });

        TestCase.assertEqual(john.linkingObjectsCount(), 0);
        
        var olivier;
        realm.write(function() {
            olivier = realm.create('PersonObject', {name: 'Olivier', age: 0});
            realm.create('PersonObject', {name: 'Christine', age: 25, children: [olivier]});
        });
        
        TestCase.assertEqual(olivier.linkingObjectsCount(), 1);
        
        realm.write(function() {
            john.children.push(olivier);
        });

        TestCase.assertEqual(olivier.linkingObjectsCount(), 2);
    }
};
