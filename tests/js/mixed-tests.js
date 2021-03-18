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
const TestCase = require('./asserts');
const AppConfig = require('./support/testConfig');

const {Decimal128, ObjectId} = Realm.BSON;

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
    },

    async testMixedSync() {
        if (!global.enableSyncTests) {
            return Promise.resolve();
        }
        const appConfig = AppConfig.integrationAppConfig;
        let app = new Realm.App(appConfig);
        let credentials = Realm.Credentials.anonymous();

        let user = await app.logIn(credentials);
        const config = {
            sync: {
                user,
                partitionValue: "LoLo",
                _sessionStopPolicy: "immediately", // Make it safe to delete files after realm.close()
            },
            schema: [{
                name: "MixedObject",
                primaryKey: "_id",
                properties: {
                    _id: "objectId?",
                    key: "string",
                    value: "mixed"
                }
            }]
        };
        let realm = await Realm.open(config);
        realm.write(() => {
            realm.deleteAll();
        });

        realm.write(() => {
            realm.create("MixedObject", { _id: new ObjectId(), key: "one", value: 1 });
            realm.create("MixedObject", { _id: new ObjectId(), key: "two", value: "2" });
            realm.create("MixedObject", { _id: new ObjectId(), key: "three", value: 3.0 });
        });

        await realm.syncSession.uploadAllLocalChanges();
        TestCase.assertEqual(realm.objects("MixedObject").length, 3);
        realm.close();

        Realm.deleteFile(config);

        let realm2 = await Realm.open(config);
        await realm2.syncSession.downloadAllServerChanges();

        let objects = realm2.objects("MixedObject");
        TestCase.assertEqual(objects.length, 3);
        TestCase.assertTrue(typeof objects[0].value, "number");
        TestCase.assertTrue(typeof objects[1].value, "string");
        TestCase.assertTrue(typeof objects[2].value, "number");

        realm2.close();
    }
}


