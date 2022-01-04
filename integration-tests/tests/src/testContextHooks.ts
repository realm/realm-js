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

import { getTestContext } from "./tests/testContext";

// Keep a reference to the suite of the last test we ran, so we can
// check whether the current test is from the same suite or not
let lastSuite;

export const mochaHooks = {
  // When we enter a new test suite, reset lastSuite to undefined so that
  // we know to also reset the current depth level
  before() {
    lastSuite = undefined;
  },

  beforeEach() {
    let currentDepth = 0;
    let suite = this.currentTest.parent;
    const isSameSuiteAsLastTest = lastSuite === suite;

    // Walk up the test's suite's parents to work out the nesting depth
    while (suite.parent) {
      currentDepth++;
      suite = suite.parent;
    }

    // Update the test context with the new depth
    getTestContext().setDepth(currentDepth - 1, !isSameSuiteAsLastTest);
    lastSuite = this.currentTest.parent;
  },
};
