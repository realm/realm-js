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

const Realm = require('realm');
const TestCase = require('./asserts');
const schemas = require('./schemas');

module.exports = {
    testComputeSizeExistsAndIncreases: function() {
        const realm = new Realm({schema: [
          { name: 'Something', properties: { numbers: 'int[]' } }
        ]});

        TestCase.assertEqual(typeof realm.computeSize, 'function');

        const sizeInitially = realm.computeSize();
        TestCase.assertEqual(typeof sizeInitially, 'number');
        TestCase.assertTrue(sizeInitially > 0);

        // Compact the Realm first
        realm.compact();

        const sizeCompacted = realm.computeSize();
        TestCase.assertEqual(typeof sizeCompacted, 'number');
        TestCase.assertTrue(sizeCompacted <= sizeInitially);
        TestCase.assertTrue(sizeCompacted > 0);

        // Add an object
        realm.write(() => {
          realm.create('Something', {});
        });

        const sizeAfter = realm.computeSize();
        TestCase.assertEqual(typeof sizeAfter, 'number');
        TestCase.assertTrue(sizeAfter > sizeCompacted);
    },
};
