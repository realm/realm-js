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
};
