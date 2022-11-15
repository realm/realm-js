////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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
const {Realm} = require("realm");

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function genPartition() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomVerifiableEmail() {
  // according to the custom register function, emails will register if they contain "realm_tests_do_autoverify"
  return `realm_tests_do_autoverify_${uuid()}_@testing.mongodb.com`;
}

async function getRegisteredEmailPassCredentials(app) {
  if (!app) {
    throw new Error("No app supplied to 'getRegisteredEmailPassCredentials'");
  }

  const email = randomVerifiableEmail();
  const password = "test1234567890";
  // Create the user (see note in 'randomVerifiableEmail')
  await app.emailPasswordAuth.registerUser({ email, password });

  return Realm.Credentials.emailPassword(email, password);
}

module.exports = {
  uuid,
  genPartition,
  randomVerifiableEmail,
  getRegisteredEmailPassCredentials,
};
