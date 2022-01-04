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

import { expect } from "chai";
import { testContext } from "./testContext";

// let outerThis;

function beforeEachFn() {
  // if (!outerThis) outerThis = this;

  if (testContext.testCtxValue !== undefined) testContext.testCtxValue++;
  else testContext.testCtxValue = 0;

  console.log("beforeEach set testContext.testCtxValue to", testContext.testCtxValue);
}

function installBeforeEachHook(): void {
  beforeEach(beforeEachFn);
}

describe("ctx issue", function () {
  installBeforeEachHook();

  it("can modify the context", function () {
    console.log(testContext.testCtxValue);
    // expect(this).to.equal(outerThis);

    // expect(testContext.testCtxValue).to.equal(0);

    // testContext.testCtxValue++;
    // expect(testContext.testCtxValue).to.equal(1);
  });

  it("the context is reset by the beforeEach", function () {
    console.log(testContext.testCtxValue);
    // expect(testContext.testCtxValue).to.equal(2);
  });

  describe("inner suite", function () {
    it("can modify the context", function () {
      console.log(testContext.testCtxValue);
      testContext.testCtxValue = -1;

      // We are now dealing with a different "this"
      // expect(this).to.not.equal(outerThis);

      // expect(testContext.testCtxValue).to.equal(0);

      // testContext.testCtxValue++;
      // expect(testContext.testCtxValue).to.equal(1);
    });

    it("the context is reset by the beforeEach", function () {
      console.log(testContext.testCtxValue);

      // FAILS! The beforeEach hook should have reset this to 0, but it is still 1
      // expect(testContext.testCtxValue).to.equal(0);
    });
  });
});

// describe("ctx issue with beforeEach hook inside the inner suite", function () {
//   describe("inner suite", function () {
//     installBeforeEachHook();

//     it("can modify the context", function () {
//       expect(testContext.testCtxValue).to.equal(0);

//       testContext.testCtxValue++;
//       expect(testContext.testCtxValue).to.equal(1);
//     });

//     it("the context is reset by the beforeEach", function () {
//       // This now passes
//       expect(testContext.testCtxValue).to.equal(0);
//     });
//   });
// });
