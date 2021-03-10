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
        let realm = new Realm({schema: [DictSchema]})
        realm.write(()=> realm.create(DictSchema.name, { a: {x:1, y:2, z:'hey'} } ))

        let data = realm.objects(DictSchema.name)[0]

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
        TestCase.assertEqual(data.a.x, 0, 'Should be an equals to a.x = 0');
        TestCase.assertEqual(data.a.y, 0, 'Should be an equals to a.y = 0');
        TestCase.assertEqual(data.a.z, -1, 'Should be an equals to a.z = -1');
        TestCase.assertEqual(data.a.m, 'new-field', `Should be a new field called m and it should be equals to "new-field"`);

        realm.write(() => {data.a.x = 1})
        TestCase.assertEqual(data.a.x, 1, 'Should be an equals to a.x = 1');

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

    testDictionaryDifferentBackend(){
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                a: '{}',
                b: '{}'
            }
        }

        //Shouldn't throw
        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {a: {x: 1, y: 2, z: 3}, b: {name: 'Caesar', second: 'August'} } ))

        let data = realm.objects(DictSchema.name)[0].a
        let person = realm.objects(DictSchema.name)[0].b

        TestCase.assertEqual(typeof data, 'object', 'Should be an object');
        TestCase.assertEqual(data.x, 1, 'Should be an equals to a.x = 1');
        TestCase.assertEqual(data.y, 2, 'Should be an equals to a.y = 2');
        TestCase.assertEqual(data.z, 3, 'Should be an equals to a.z = 3');

        TestCase.assertEqual(typeof person, 'object', 'Should be an object');
        TestCase.assertEqual(person.name, 'Caesar', 'Should be an equals to Caesar');
        TestCase.assertEqual(person.second, 'August', 'Should be an equals to August');
    },

    testDictionary_Javascript_Object_Features() {
        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {a: {x: 1, y: 2, z: 3}}))
        let point = realm.objects(DictSchema.name)[0].a

        TestCase.assertEqual(JSON.stringify(point), `{"x":1,"z":3,"y":2}`, `Should be an equals to: {"x":1,"z":3,"y":2}`)
        TestCase.assertArraysEqual(Object.values(point), [1,3,2], `Should be an equals to: [1,3,2]`)
        TestCase.assertArraysEqual(Object.keys(point), ['x','z','y'], `Should be an equals to: ['x','z','y']`)

        let {x,y,z} = point
        TestCase.assertArraysEqual([x,y,z], [1,2,3], "Should be an equals to: [1,3,2]")
    },

    testDictionaryQuery(){
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                a: '{}'
            }
        }
        let realm = new Realm({schema: [DictSchema]})
        const N = 100
        for(let i=0; i<N; i++) {
            realm.write(() => realm.create(DictSchema.name, {a: {x: i, y: 2, z: 3}}))
        }

        let data = realm.objects(DictSchema.name)
        //console.log("Fields -> " , Object.keys(data[0].a))

        let half = data.filtered("a.x >= 50")
        let seventy = data.filtered("a.x >= $0", 70)
        TestCase.assertEqual(half.length, N/2, "We expect only 50 items, matching for field x.");
        TestCase.assertEqual(seventy.length, 30, "We expect only 30 items, matching for field x >= 70.");
    },

    testDictionaryNotificationObjectFieldUpdate() {
        const UPDATES = 5;
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                fields: '{}'
            }
        }

        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {fields: {field1: 0, filed2: 2, field3: 3}}))
        let fields = realm.objects(DictSchema.name)[0].fields
        let cnt=0

        fields.addListener((obj, changeset ) => {
            TestCase.assertEqual(fields.field1, cnt,`fields.field1: ${fields.field1} should be equals to: cnt -> ${cnt}`)

            // We ignore the first as it just reflect the creation above.
            if(cnt > 0) {
                TestCase.assertEqual(changeset.modifications[0], 'field1', `The changeset should reflect an update on field1 but it shows -> ${changeset.modifications[0]}`)
            }
            cnt++
        })

        for(let i=1; i<=UPDATES; i++){
            realm.write(() => { fields.field1=i } )
        }

        TestCase.assertEqual(cnt,UPDATES,`We expect ${UPDATES} updates.`)
    },

    testDictionaryNotificationObjectFieldInsertion() {
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                fields: '{}'
            }
        }

        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {fields: {field1: 0, filed2: 2, field3: 3}}))
        let ff = realm.objects(DictSchema.name)[0]
        let cnt=0


        ff.fields.addListener((obj, changeset ) => {
            if(cnt>0){
                let keys = Object.keys(obj)
                TestCase.assertEqual(keys[0], "x2", "First field should be equal x2")
                TestCase.assertEqual(keys[1], "x1", "First field should be equal x1")
            }
            cnt++
        })

        realm.write(() => { ff.fields = {x1: 1, x2: 2} } )
    },

    testDictionaryUserShouldNotDeleteFields() {
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                fields: '{}'
            }
        }

        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {fields: {x1: 0, x2: 2}}))
        let ff = realm.objects(DictSchema.name)[0]

        delete ff.fields.x1
        delete ff.fields.x2

        TestCase.assertEqual(Object.keys(ff.fields)[0], "x2", "Should contain x2 field")
        TestCase.assertEqual(Object.keys(ff.fields)[1], "x1", "Should contain x1 field")
    },

    testDictionaryEventListenerRemoveAll() {
        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {a: {x: 1, y: 2, z: 3}}))
        let point = realm.objects(DictSchema.name)[0].a

        for(let i=0; i<10; i++) {
            point.addListener((fn, changeset) => {
                TestCase.assertEqual(0, 1, "This function should never be call")
            })
        }

        point.removeAllListeners()
        realm.write(() => point.x=10 )
    },

    testDictionaryRemoveCallback() {
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                fields: '{}'
            }
        }

        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {fields: {field1: 0, filed2: 2, field3: 3}}))
        let fields = realm.objects(DictSchema.name)[0].fields

        let a = (obj, chg) => {
            TestCase.assertTrue(false,`Function a should be unsubscribed.`)
        }
        let b = (obj, chg) => {
            TestCase.assertTrue(false,`Function b should be unsubscribed.`)
        }
        let called = false
        let c = (obj, chg) => {
            called = true
        }
        let d = (obj, chg) => {
            TestCase.assertTrue(false,`Function d should be unsubscribed.`)
        }

        fields.addListener(a)
        fields.addListener(b)
        fields.addListener(c)
        fields.addListener(d)

        fields.removeListener(a)
        fields.removeListener(b)
        fields.removeListener(d)

        realm.write(() => { fields.field1=1 } )
        TestCase.assertTrue(called,`Function c should be called`)
    },

    testDictionaryUnsubscribingOnEmptyListener() {
        const DictSchema = {
            name: 'Dictionary',
            properties: {
                fields: '{}'
            }
        }

        let realm = new Realm({schema: [DictSchema]})
        realm.write(() => realm.create(DictSchema.name, {fields: {field1: 0, filed2: 2, field3: 3}}))
        let fields = realm.objects(DictSchema.name)[0].fields

        let a = (obj, chg) => {
            TestCase.assertTrue(false,`Function a should be unsubscribed.`)
        }
        let b = (obj, chg) => {
            TestCase.assertTrue(false,`Function b should be unsubscribed.`)
        }

        /*
            We try to remove listeners that doesn't exist in order to provoke to test out-of-bounds and stability.
         */

        fields.removeListener(a)
        fields.removeListener(a)
        fields.removeListener(b)
        fields.removeListener(b)

        realm.write(() => { fields.field1=1 } )

        let correct = false;
        fields.addListener(() => {
            correct = true
        })
        realm.write(() => { fields.field1=1 } )
        TestCase.assertTrue(correct,"This is expected to work.")
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

 
