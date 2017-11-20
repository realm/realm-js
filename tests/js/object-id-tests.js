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

/* eslint-env es6, node */

'use strict';

const Realm = require('realm');
const TestCase = require('./asserts');

const isNodeProccess = (typeof process === 'object' && process + '' === '[object process]');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = {
    testNonSynced: function() {
        let realm = new Realm({schema: [{ name: 'Dog', properties: { name: 'string' } }]});
        var dog;
        realm.write(() => {
            dog = realm.create('Dog', ['Fido']);
        });
        TestCase.assertThrowsContaining(() => dog._objectId(), "_objectId() can only be used with objects from synced Realms");
        TestCase.assertThrowsContaining(() => realm._objectForObjectId('Dog', 'foo'), "Realm._objectForObjectId() can only be used with synced Realms");
    },

    testSynced: function() {
        if (!global.enableSyncTests) {
            return Promise.resolve();
        }
        
        return Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then(user => {
            const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' },
                             schema: [{ name: 'IntegerPrimaryKey', properties: { int: 'int?' }, primaryKey: 'int' },
                                      { name: 'StringPrimaryKey', properties: { string: 'string?' }, primaryKey: 'string' },
                                      { name: 'NoPrimaryKey', properties: { string: 'string' }},
                                     ],
                           };
            return Realm.open(config).then(realm => {
                var integer, nullInteger;
                var string, nullString;
                var none;
                realm.write(() => {
                    integer = realm.create('IntegerPrimaryKey', [12345]);
                    nullInteger = realm.create('IntegerPrimaryKey', [null]);
                    string = realm.create('StringPrimaryKey', ["hello, world"]);
                    nullString = realm.create('StringPrimaryKey', [null]);
                    none = realm.create('NoPrimaryKey', ["hello, world"]);
                });

                let integerId = integer._objectId();
                let nullIntegerId = nullInteger._objectId();
                let stringId = string._objectId();
                let nullStringId = nullString._objectId();
                let noneId = none._objectId();

                TestCase.assertTrue(integer._isSameObject(realm._objectForObjectId('IntegerPrimaryKey', integerId)));
                TestCase.assertTrue(nullInteger._isSameObject(realm._objectForObjectId('IntegerPrimaryKey', nullIntegerId)));
                TestCase.assertTrue(string._isSameObject(realm._objectForObjectId('StringPrimaryKey', stringId)));
                TestCase.assertTrue(nullString._isSameObject(realm._objectForObjectId('StringPrimaryKey', nullStringId)));
                TestCase.assertTrue(none._isSameObject(realm._objectForObjectId('NoPrimaryKey', noneId)));
            });
        });

    }
};
