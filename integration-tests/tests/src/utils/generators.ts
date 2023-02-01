////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

export function generatePartition() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function randomVerifiableEmail() {
  // according to the custom register function, emails will register if they contain "realm_tests_do_autoverify"
  const uuid = new Realm.BSON.UUID().toHexString();
  return `realm_tests_do_autoverify_${uuid}_@test.com`;
}

export function randomNonVerifiableEmail() {
  // according to the custom register function, emails will not register if they don't contain "realm_tests_do_autoverify"
  const uuid = new Realm.BSON.UUID().toHexString();
  return `should-not-register-${uuid}_@test.com`;
}

export function randomPendingVerificationEmail() {
  // create an email address that should neither auto-verify or fail verification
  const uuid = new Realm.BSON.UUID().toHexString();
  return `realm_tests_do_pendverify-${uuid}_@test.com`;
}
