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

function beforeEachFn() {
  this.testCtxValue = "a";
  console.log("beforeEach set this.testCtxValue to", this.testCtxValue);
}

function installBeforeEachHook(): void {
  beforeEach(beforeEachFn);
}

describe("ctx issue", function () {
  installBeforeEachHook();

  it("can modify the context", function () {
    expect(this.testCtxValue).to.equal("a");

    this.testCtxValue = "b";
    expect(this.testCtxValue).to.equal("b");
  });

  it("the context is reset by the beforeEach", function () {
    expect(this.testCtxValue).to.equal("a");
  });

  describe("inner suite", function () {
    it("can modify the context", function () {
      expect(this.testCtxValue).to.equal("a");

      this.testCtxValue = "b";
      expect(this.testCtxValue).to.equal("b");
    });

    it("the context is reset by the beforeEach", function () {
      // FAILS! The beforeEach hook should have reset this to "a", but it is still "b"
      expect(this.testCtxValue).to.equal("a");
    });
  });
});

describe("ctx issue with beforeEach hook inside the inner suite", function () {
  describe("inner suite", function () {
    installBeforeEachHook();

    it("can modify the context", function () {
      expect(this.testCtxValue).to.equal("a");

      this.testCtxValue = "b";
      expect(this.testCtxValue).to.equal("b");
    });

    it("the context is reset by the beforeEach", function () {
      // This now passes
      expect(this.testCtxValue).to.equal("a");
    });
  });
});
