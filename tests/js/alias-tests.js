////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* eslint-env es6, node */

'use strict';

var Realm = require('realm');
var TestCase = require('./asserts');
var schemas = require('./schemas');

function getRealm() {
    const schemas = [{
        name: 'ObjectA',
        properties: {
            name: { type: 'string', alias: "otherName"},
            age: {type: 'int', optional: true}
        }
    }];

    return new Realm({
        schema: schemas
    });
}

function addTestObjects(realm) {
    realm.beginTransaction();
    realm.create('ObjectA', {
        otherName: 'Foo',
        age: 41
    });
    realm.create('ObjectA', {
        otherName: 'Bar',
        age: 42
    });
    realm.commitTransaction();
}


module.exports = {

    testAliasInSchema() {
        const Person = {
            name: 'Person',
            properties: {
                name:     {type: 'string', alias: '_name'},
                address:  {type: 'string', indexed: true },
                age:      'double',
                married:  {type: 'bool', default: false, alias: '_married'},
                children: {type: 'list', objectType: 'Person', alias: '_children'},
                parents:  {type: 'linkingObjects', objectType: 'Person', property: 'children', alias: '_parents'},
            }
        };

        const realm = new Realm({
            schema: [Person]
        });

        // Aliases are only set if explicitly defined in the schema
        const props = realm.schema[0].properties;
        TestCase.assertEqual(props['name'].alias, '_name');
        TestCase.assertEqual(props['address'].alias, undefined);
        TestCase.assertEqual(props['age'].alias, undefined);
        TestCase.assertEqual(props['married'].alias, '_married');
        TestCase.assertEqual(props['children'].alias, '_children');
        TestCase.assertEqual(props['parents'].alias, '_parents');
    },


    testAliasWhenCreatingObjects() {
        const realm = getRealm();
        realm.beginTransaction();

        // Creating objects most use the alias
        realm.create('ObjectA', {
            otherName: 'Foo',
            age: 42
        });

        // Creating uses arrays still work
        realm.create('ObjectA', ['Bar', 42])

        // Using the internal name instead of the alias throws an exception.
        TestCase.assertThrows(() => realm.create('ObjectA', { name: 'Boom' }));
    },

    testAliasWhenUpdatingObjects() {
        const realm = getRealm();
        realm.beginTransaction();

        let obj = realm.create('ObjectA', { otherName: 'Foo' });

        // Setting properties must use alias
        obj.otherName = "Bar";
        TestCase.assertEqual(obj.otherName, "Bar");

        // If no alias is defined, the internal name still works
        obj.age = 1;
        TestCase.assertEqual(obj.age, 1);

        // If an alias is defined, it must be used when setting properties. Using the internal name
        // doesn't work.
        obj.name = "Baz";
        TestCase.assertEqual(obj.otherName, "Bar");
    },

    testAliasWhenReadingProperties() {
        const realm = getRealm();
        addTestObjects(realm);

        // Aliases must be used when reading properties
        let obj = realm.objects("ObjectA")[0];
        TestCase.assertEqual(obj.name, undefined);
        TestCase.assertEqual(obj.otherName, 'Foo');
        TestCase.assertEqual(obj.age, 41);

        // Only aliases are visible as keys
        for(var key in obj) {
            TestCase.assertFalse(key === 'name');
        } 
    },

    testAliasInQueries() {
        const realm = getRealm();
        addTestObjects(realm);

        // Queries also use aliases
        let results = realm.objects("ObjectA").filtered("otherName = 'Foo'");
        TestCase.assertEqual(results.length, 1);

        // Querying on internal names are still allowed
        results = realm.objects("ObjectA").filtered("name = 'Foo'");
        TestCase.assertEqual(results.length, 1);
    },

};