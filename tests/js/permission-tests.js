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

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test the given requestFunc, passing it the given callback after it's been wrapped appropriately.
// This function makes sure that errors thrown in the async callback rejects the promise (making tests actually run).
function callbackTest(requestFunc, callback) {
  return new Promise((resolve, reject) => {
    function callbackWrapper() {
      try {
        callback.apply(this, Array.from(arguments));
        resolve();
      }
      catch (e) {
        reject(e);
      }
    }
    requestFunc(callbackWrapper);
  });
}

function failOnError(error) {
  if (error) {
    throw new Error(`Error ${error} was not expected`);
  }
}

module.exports = {
    testSimple() {
      var username = uuid();
      // Create user, logout the new user, then login
      return new Promise((resolve, reject) => {
        Realm.Sync.User.register('http://localhost:9080', username, 'password', (error, user) => {
          failOnError(error);
          console.log("Getting permissions.. ============================================================");
          user.getGrantedPermissions()
            .then(permissions => {
              console.log("Permissions: ", permissions);
              resolve();
            }).catch(error => {
              console.log("Error: ", error);
              reject();
            });
        });
      });
    }
}

