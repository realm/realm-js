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

import { expect } from "chai";

// We've added this test to convince ourselves that we can update the context from a hook and have it
// propagate through the tree of suites and tests as expected.
// We're using this technique in the `openRealmBefore` and `openRealmBeforeEach` hooks to ensure we
// close the Realm and clean up correctly.

describe.skip("Mocha internals", () => {
  before(function () {
    this.value = 1;
    this.update = (value: number) => {
      this.value = value;
    };
  });

  afterEach(function () {
    expect(this.value).is.oneOf([1, 3]);
  });

  describe("updating context by assigning from a test", () => {
    it("updates locally", function () {
      this.value = 2;
      expect(this.value).equals(2);
    });

    it("bleeds into other tests", function () {
      expect(this.value).equals(2);
    });

    describe("a nested suite", () => {
      it("does bleed into child suites", function () {
        expect(this.value).equals(2);
      });
    });
  });

  describe("another suite", () => {
    it("doesn't bleed out of the suite", function () {
      expect(this.value).equals(1);
    });
  });

  describe("updating context from a context captured by a hook", () => {
    it("updates locally", function () {
      this.update(3);
      expect(this.value).equals(3);
    });

    it("does bleed into another test", function () {
      expect(this.value).equals(3);
    });
  });

  describe("another suite", () => {
    it("does bleed out of the suite", function () {
      expect(this.value).equals(3);
    });
  });
});
