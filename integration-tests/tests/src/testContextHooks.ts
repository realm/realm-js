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

import { getTestContext, testContext } from "./tests/testContext";

let lastSuite;

export const mochaHooks = {
  before() {
    lastSuite = undefined;
  },

  beforeEach() {
    let currentDepth = 0;
    let suite = this.currentTest.parent;
    // console.log(suite);
    const isSameSuiteAsLastTest = lastSuite === suite;

    while (suite.parent) {
      // console.log(suite.parent.title);
      currentDepth++;
      suite = suite.parent;
    }

    // console.log(currentDepth); //this.currentTest.parent);
    // console.log("before");

    getTestContext().setDepth(currentDepth - 1, !isSameSuiteAsLastTest);
    lastSuite = this.currentTest.parent;
  },

  afterEach() {
    // console.log("after");
    // getTestContext().decrementDepth();
  },
  // This doesn't work as it cannot run after only every outer describe
  // after() {
  //   console.log("AFTER");
  //   resetTestContext();
  // },
};
