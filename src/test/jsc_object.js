////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

/* global assert_enumerate, assert_exception */

// eslint-disable-next-line no-undef,strict
let dict = dictionary || {};
// eslint-disable-next-line no-undef
let null_dict = null_dictionary || {};

// eslint-disable-next-line no-undef
assert_true(dict.X !== undefined && dict.doSomething !== undefined); // Testing successful object creation.

null_dict.hello(true); // Testing method call from object.
null_dict.alo(true); // Testing method call from object <again>.

dict.doSomething(28850);

/* Testing accessors. */
dict.X = 666;

// eslint-disable-next-line no-undef
test_accessor(dict, "X", 666);

assert_enumerate(JSON.stringify(dict));

/*
    Testing exception mechanism.
*/
try {
  dict.X = -1; // testing wrong value.
} catch (error) {
  assert_exception(error.message);
}
