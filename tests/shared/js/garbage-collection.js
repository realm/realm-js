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

/*
 * This test suite is trying to make a bunch of objects with properties of type "data", which will use an ArrayBuffer
 * when accessed.
 * The reason for this test suite is that we have experianced issues in the current version (v1.6.11) of Electron that
 * will crash when an v8::ArrayBuffer is garbage collected.
 * @see https://github.com/electron/electron/issues/2601#issuecomment-135258750
 */

'use strict';

const Realm = require('realm');
const TestCase = require('./asserts');

const NUMBER_OF_OBJECTS = 1000;
const BUFFER_LENGTH = 1024;
const READ_CYCLES = 10;

module.exports = {
  testPropertiesOfData: () => {

    const TestingSchema = {
      name: 'Testing',
      properties: {
        n: 'int',
        someData: 'data'
      }
    };

    // Create a new realm
    const realm = new Realm({schema: [TestingSchema]});
    // Add a bunch of objects, with "data" to it
    realm.write(() => {
      for(let i = 0; i < NUMBER_OF_OBJECTS; i++) {
        realm.create('Testing', {
          n: i,
          someData: new ArrayBuffer(BUFFER_LENGTH),
        });
      }
    });

    for (let readCycle = 0; readCycle < READ_CYCLES; readCycle++) {
      let allObjects = realm.objects('Testing');
      let totalBytes = 0;
      for (let object of allObjects) {
        let toBeFreed = object.someData;
        // Accessing the byteLength of the objects someData property
        totalBytes += toBeFreed.byteLength;
      }
      // console.log(`Read a total of ${totalBytes} bytes.`);
    }
  }
};
