////////////////////////////////////////////////////////////////////////////
//
// Copyright 2018 Realm Inc.
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
const schemas = require('./schemas');

let pathSeparator = '/';
if (typeof process === 'object' && process.platform === 'win32') {
    pathSeparator = '\\';
}

const getPartialRealm = () => {
    return Realm.Sync.User
        .login('http://localhost:9080', Realm.Sync.Credentials.anonymous())
        .then(user => {
            return Realm.open(user.createConfiguration());
        });
};

module.exports = {

    testPermissions_Realm: function() {
        return getPartialRealm().then(realm => {
            TestCase.assertTrue(realm.isClosed());
        });
    },

    testPermissions_Class: function() {
        return getPartialRealm().then(realm => {
            TestCase.assertTrue(realm.isClosed());
        });
    },

    testPermissions_Class_InvalidArgument: function() {
        return getPartialRealm().then(realm => {
            TestCase.assertTrue(realm.isClosed());
        });
    },

    testPermissions_Class_Foo: function() {
        return getPartialRealm().then(realm => {
            TestCase.assertTrue(realm.isClosed());
        });
    },

};
