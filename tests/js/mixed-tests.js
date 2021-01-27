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
    name: 'Mixed',
    properties: {
        a: 'mixed',
        b: 'mixed',
        c: 'mixed'
    }
}

module.exports = {
    testMixedPrimitive() {
        let realm = new Realm({schema: [SingleSchema]})
        realm.write(()=> realm.create(SingleSchema.name, { a:'xxxxxx', b:555, c: true }  ))

        let data = realm.objects(SingleSchema.name)[0]
        TestCase.assertEqual(data.a, 'xxxxxx', 'should store xxxxxx');
        TestCase.assertEqual(data.b, 555, 'should store 555');
        TestCase.assertEqual(data.c, true, 'should store boolean (true)');
    },

    testMixedComplexTypes() {
        let realm = new Realm({schema: [SingleSchema]});
        let d128 = Decimal128.fromString('6.022e23');
        let id = new ObjectId();
        let date = new Date();

        realm.write(()=> realm.create(SingleSchema.name, { a: id, b:d128, c: date }  ))

        let data = realm.objects(SingleSchema.name)[0]
        TestCase.assertTrue(typeof data.a === typeof id , 'should be the same type ObjectId');
        TestCase.assertEqual(data.a.toString(), id.toString(), 'should have the same content');

        TestCase.assertEqual(data.b.toString(), d128.toString(), 'Should be the same Decimal128');
        TestCase.assertEqual(data.c.toString(), date.toString(), 'Should be the same Date');
    }, 
    
    testMixedMutability() {
        let realm = new Realm({schema: [SingleSchema]});
        let d128 = Decimal128.fromString('6.022e23');
        let id = new ObjectId();
        let date = new Date();

        realm.write(()=> realm.create(SingleSchema.name, { a: id }  ))
        let data = realm.objects(SingleSchema.name)[0]

        TestCase.assertTrue(typeof data.a === typeof id , 'should be the same type ObjectId');
        TestCase.assertEqual(data.a.toString(), id.toString(), 'should have the same content');

        realm.write(()=>  data.a = d128   )
        TestCase.assertEqual(data.a.toString(), d128.toString(), 'Should be the same Decimal128');

        realm.write(()=>  data.a = 12345678   )
        TestCase.assertEqual(data.a, 12345678, 'Should be the same 12345678');

        realm.write(()=>  data.a = null   )
        TestCase.assertEqual(data.a, null, 'Should be the same null');

        realm.write(()=>  data.a = undefined   )
        TestCase.assertEqual(data.a, null, 'Should be the same null');
    },

    testMixedWrongType() {
        let realm = new Realm({schema: [SingleSchema]});

        TestCase.assertThrowsException(
            () => realm.write(()=> realm.create(SingleSchema.name, { a: Object.create({}) }  ) ), 
            new Error('Mixed conversion not possible for type: Object') )
    }
}

 
