////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

console.log("Loading Realm Integration Tests");

import { flags } from "realm";

// TODO: Refactor tests to disable this
flags.ALLOW_VALUES_ARRAYS = true;
// We need this to call Realm.clearTestState()
flags.ALLOW_CLEAR_TEST_STATE = true;

import "./setup-globals";

afterEach(() => {
  // Trigger garbage collection after every test, if exposed by the environment.
  if (typeof gc === "function") {
    gc();
  }
});

import "./utils/chai-plugin.test";
import "./utils/listener-stub.test";
import "./utils/promise-handle.test";
import "./utils/sequence.test";
import "./mocha-internals.test";

import "./tests";
import "./performance-tests";
