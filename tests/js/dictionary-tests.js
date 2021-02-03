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

const Realm = require('realm');
let TestCase = require('./asserts');
let {Decimal128, ObjectId} = require('bson')

const SingleSchema = {
    name: 'Dictionary',
    properties: {
        a: '{}'
    }
}

module.exports = {
    testDictionaryCreate() {
        //Shouldn't throw
        let realm = new Realm({schema: [SingleSchema]})
    },

    testDictionaryAddingObject() {
        //Shouldn't throw
        let realm = new Realm({schema: [SingleSchema]})
        realm.write(()=> realm.create(SingleSchema.name, { a: {x:1, y:2, z:'hey'} } ))

        let data = realm.objects(SingleSchema.name)[0]
        TestCase.assertEqual(typeof data.a, 'object', 'Should be an object');
        TestCase.assertEqual(data.a.x, 1, 'Should be an equals to a.x = 1');
        TestCase.assertEqual(data.a.y, 2, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.a.z, 'hey', 'Should be an equals to a.z = hey');

        let o = Object.keys(data.a)
        o.forEach(k => {
            TestCase.assertNotEqual(['x', 'y', 'z'].indexOf(k), -1, 'Should contain all the keys');
        })
    },

    testDictionaryUpdating() {
        //Shouldn't throw
        let realm = new Realm({schema: [SingleSchema]})
        realm.write(() => realm.create(SingleSchema.name, {a: {x: 1, y: 2, z: 'hey'}}))

        let data = realm.objects(SingleSchema.name)[0]
        TestCase.assertEqual(typeof data.a, 'object', 'Should be an object');
        TestCase.assertEqual(data.a.x, 1, 'Should be an equals to a.x = 1');
        TestCase.assertEqual(data.a.y, 2, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.a.z, 'hey', 'Should be an equals to a.z = hey');

        realm.write(() => data.a = {x: 0, y: 0, z: -1, m: 'new-field'})

        TestCase.assertEqual(typeof data.a, 'object', 'Should be an object');
        TestCase.assertEqual(data.a.x, 0, 'Should be an equals to a.x = 1');
        TestCase.assertEqual(data.a.y, 0, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.a.z, -1, 'Should be an equals to a.z = -1');
        TestCase.assertEqual(data.a.m, 'new-field', `Should be a new field called m and it should be equals to "new-field"`);

        realm.write(() => data.a = {p: 1})
        TestCase.assertEqual(typeof data.a.x, 'undefined', 'Should be deleted.');
        TestCase.assertEqual(typeof data.a.y, 'undefined', 'Should be deleted.');
        TestCase.assertEqual(typeof data.a.z, 'undefined', 'Should be deleted.');
    },


}

 
