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

/* eslint-env es6, node */
/* eslint-disable no-console */

'use strict';

const Realm = require('realm');

const userTests = require('../js/user-tests');
describe('SyncTests', () => {
    beforeEach(() => Realm.clearTestState());
    afterEach(() => Realm.clearTestState());

    for (const testName in userTests) {
        it(testName, (done) => userTests[testName]().catch((e) => fail(e)).then(done));
    }
});
