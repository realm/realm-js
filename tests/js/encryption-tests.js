////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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
var Schemas = require('./schemas');

module.exports = {
    testEncryptedInvalidKeys: function() {
        // test failure with invalid keys
        TestCase.assertThrows(function() {
            new Realm({schema: [Schemas.TestObject], encryptionKey: " ".repeat(64)});
        }, "Encryption Key must be an ArrayBuffer");

        TestCase.assertThrows(function() {
            new Realm({schema: [Schemas.TestObject], encryptionKey: new Int8Array(63)});
        }, "Encryption Key must be 64 bytes");
    },
    testEncryptionValidKey: function() {
        var key = new Int8Array(64);
        key[0] = 1;
        var realm = new Realm({schema: [Schemas.TestObject], encryptionKey: key});

        realm.write(function() {
            realm.create('TestObject', {doubleCol: 1});
            TestCase.assertEqual(realm.objects('TestObject').length, 1);
        });

        // test failure with different or missing
        realm.close();
        TestCase.assertThrows(function() {
            new Realm({schema: [Schemas.TestObject], encryptionKey: new Int8Array(64)});
        });
        TestCase.assertThrows(function() {
            new Realm({schema: [Schemas.TestObject]});
        });

        // test can reopen with original key
        realm = new Realm({schema: [Schemas.TestObject], encryptionKey: key});
        TestCase.assertEqual(realm.objects('TestObject').length, 1);
    },
    testRealmSchemaVersion: function() {
        var encryptionKey = new Int8Array(64);
        var realm = new Realm({schema: [], schemaVersion: 3, path: 'encrypted.realm', encryptionKey: encryptionKey});
        TestCase.assertEqual(realm.schemaVersion, 3);
        TestCase.assertEqual(Realm.schemaVersion('encrypted.realm', encryptionKey), 3);

        TestCase.assertThrows(function() {
            Realm.schemaVersion('encrypted.realm', encryptionKey, 'extra');
        });
        TestCase.assertThrows(function() {
            Realm.schemaVersion('encrypted.realm', 'asdf');
        });
    },
};

if (Realm.Sync) {
    module.exports.testEncryptionWithSync = function() {
        new Realm({
            encryptionKey: new Int8Array(64),
            sync: {
                user: Realm.Sync.User.adminUser('fake-token'),
                url: 'realm://fake-server'
            }
        });
    };
}
