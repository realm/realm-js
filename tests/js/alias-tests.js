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
            name: { type: 'string', alias: "otherName"}
        }
    }];

    return new Realm({
        schema: schemas
    });
}

function addTestObjects(realm) {
    realm.beginTransaction();
    realm.create('ObjectA', {
        otherName: 'Foo'
    });
    realm.create('ObjectA', {
        otherName: 'Bar'
    });
    realm.commitTransaction();
}


module.exports = {

    testAliasInSchema() {
        const realm = getRealm();

        // Schema objects returned expose both name and alias
        TestCase.assertEqual(realm.schema[0].properties['name'].alias === 'otherName');
    },

    testAliasWhenCreatingObjects() {
        const realm = getRealm();
        realm.beginTransaction();

        // Creating objects most use the alias
        realm.create('ObjectA', {
            otherName: 'Foo'
        });

        // Creating uses arrays still work
        realm.create('ObjectA', ['Bar'])

        // Using the internal name instead of the alias throws an exception.
        TestCase.assertThrows(() => realm.create('ObjectA', { name: 'Boom' }));
    },

    testAliasWhenReadingProperties() {
        const realm = getRealm();
        addTestObjects(realm);

        // Internal names are not visible as properties, only aliases are.
        let obj = realm.objects("ObjectA")[0];
        TestCase.assertEqual(obj.name, undefined);
        TestCase.assertEqual(obj.otherName, 'Foo');
    },

    testAliasInQueries() {
        const realm = getRealm();
        addTestObjects(realm);

        // Queries also use aliases
        let results = realm.objects("ObjectA").filtered("otherName = 'Foo'");
        TestCase.assertEqual(results.length, 1);

        // Querying on internal names throws
        TestCase.assertThrows(() => realm.objects("ObjectA").filtered("name = 'Foo'"));
    },

};