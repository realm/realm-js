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
const AppConfig = require('./support/testConfig');

const isNodeProcess = (typeof process === 'object' && process + '' === '[object process]');

module.exports = {
    testSynced: function() {
        if (!global.enableSyncTests) {
            return Promise.resolve();
        }
        const appConfig = AppConfig.integrationAppConfig;
        let app = new Realm.App(appConfig);
        let credentials = Realm.Credentials.anonymous();

        return app.logIn(credentials).then(user => {
            const config = {
                sync: {
                    user,
                    partitionValue: "LoLo"
                },
                schema: [
                    { name: 'IntegerPrimaryKey', properties: { _id: 'int?' }, primaryKey: '_id' },
                    { name: 'StringPrimaryKey', properties: { _id: 'string?' }, primaryKey: '_id' },
                ]
            }
            return Realm.open(config).then(realm => {
                var integer, nullInteger;
                var string, nullString;
                var none;
                realm.write(() => {
                    integer = realm.create('IntegerPrimaryKey', [12345]);
                    nullInteger = realm.create('IntegerPrimaryKey', [null]);
                    string = realm.create('StringPrimaryKey', ["hello, world"]);
                    nullString = realm.create('StringPrimaryKey', [null]);
                });

                let integerId = integer._objectId();
                let nullIntegerId = nullInteger._objectId();
                let stringId = string._objectId();
                let nullStringId = nullString._objectId();

                TestCase.assertTrue(integer._isSameObject(realm._objectForObjectId('IntegerPrimaryKey', integerId)));
                TestCase.assertTrue(nullInteger._isSameObject(realm._objectForObjectId('IntegerPrimaryKey', nullIntegerId)));
                TestCase.assertTrue(string._isSameObject(realm._objectForObjectId('StringPrimaryKey', stringId)));
                TestCase.assertTrue(nullString._isSameObject(realm._objectForObjectId('StringPrimaryKey', nullStringId)));
            });
        });
    }
};
