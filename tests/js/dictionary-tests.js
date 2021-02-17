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

const DictSchema = {
    name: 'Dictionary',
    properties: {
        a: '{}'
    }
}

module.exports = {
    testDictionaryCreate() {
        //Shouldn't throw
        let realm = new Realm({schema: [DictSchema]})
    },

    testDictionaryAddingObject() {
        //Shouldn't throw
        let realm = new Realm({schema: [DictSchema]})
        realm.write(()=> realm.create(DictSchema.name, { a: {x:1, y:2, z:'hey'} } ))

        let data = realm.objects(DictSchema.name)[0]
        console.log('?????')
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
        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {a: {x: 1, y: 2, z: 'hey'}}))

        let data = realm.objects(DictSchema.name)[0]
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

   testDictionaryWithTypedValues(){
       const DictIntSchema = {
           name: 'Dictionary',
           properties: {
               a: 'int{}'
           }
       }

       let realm = new Realm({schema: [DictIntSchema]})

       realm.write(() => realm.create(DictIntSchema.name, {a: {x: 1, y: 2, z: 4}}))
       let data = realm.objects(DictIntSchema.name)[0]
       TestCase.assertEqual(data.a.x, 1, 'Should be an equals to a.x = 1');
       TestCase.assertEqual(data.a.y, 2, 'Should be an equals to a.y = 2');
       TestCase.assertEqual(data.a.z, 4, 'Should be an equals to a.z = 4');

       let err = new Error('Property must be of type \'number\', got (error)')
       TestCase.assertThrowsException(() =>realm.write(() => realm.create(DictIntSchema.name, {a: { c:'error' }})), err)
       TestCase.assertThrowsException(() =>realm.write(() => data.a = 'cc'), new Error(`Dictionary.a must be of type 'number', got 'string' ('cc')`))
   },
    testDictionaryHandlingSchemaParsingError(){
        const DictWrongSchema = {
            name: 'Dictionary',
            properties: {
                a: 'wwwww{}'
            }
        }
        let err = new Error('Schema type: wwwww not supported for Dictionary.')
        let _defer = () => { let r = new Realm({schema: [DictWrongSchema]}) }
        TestCase.assertThrowsException(_defer, err)
    },

    testDictionaryMutability(){

        //Shouldn't throw
        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {a: {x: 1, y: 2, z: 3}}))

        let data = realm.objects(DictSchema.name)[0].a
        let mutable = realm.objects(DictSchema.name)[0].a

        TestCase.assertEqual(typeof data, 'object', 'Should be an object');
        TestCase.assertEqual(data.x, 1, 'Should be an equals to a.x = 1');
        TestCase.assertEqual(data.y, 2, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.z, 3, 'Should be an equals to a.z = 3');

        TestCase.assertEqual(typeof mutable, 'object', 'Should be an object');
        TestCase.assertEqual(mutable.x, 1, 'Should be an equals to mutable.x = 1');
        TestCase.assertEqual(mutable.y, 2, 'Should be an equals to mutable.y = 2');
        TestCase.assertEqual(mutable.z, 3, 'Should be an equals to mutable.z = 3');

        realm.write(() => { data.x = 3; data.y= 2; data.z= 1 })

        TestCase.assertEqual(typeof data, 'object', 'Should be an object');
        TestCase.assertEqual(data.x, 3, 'Should be an equals to a.x = 3');
        TestCase.assertEqual(data.y, 2, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.z, 1, 'Should be an equals to a.z = 1');

        TestCase.assertEqual(typeof mutable, 'object', 'Should be an object');
        TestCase.assertEqual(mutable.x, 3, 'Should be an equals to mutable.x = 3');
        TestCase.assertEqual(mutable.y, 2, 'Should be an equals to mutable.y = 2');
        TestCase.assertEqual(mutable.z, 1, 'Should be an equals to mutable.z = 1');
    },


    /*TODO Comment this until we merge Mixed->Link code.
    testDictionaryErrorHandling(){
        let realm = new Realm({schema: [DictSchema]})
        let err = new Error('Mixed conversion not possible for type: object')
        //TestCase.assertThrowsException(() => realm.write(() => realm.create(DictSchema.name, {a: {x: {} }})) , err)
        realm.write(() => realm.create(DictSchema.name, { a: { x: null } }))
        let data = realm.objects(DictSchema.name)[0].a
        TestCase.assertEqual(data.x, null, 'Should be an equals to mutable.x = null');

    } */


}

 
