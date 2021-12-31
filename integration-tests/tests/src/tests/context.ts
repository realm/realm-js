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

// See https://github.com/mochajs/mocha/blob/master/test/unit/context.spec.js

import { expect } from "chai";
import { resetTestContext, testContext } from "./testContext";
import mocha from "mocha";

// const origBefore = mocha.Suite.prototype.beforeEach;
// mocha.Suite.prototype.beforeEach = (...args) => {
//   console.log("hiya");
//   origBefore.apply(this, args);
// };

// mocha.suite.beforeEach(function () {
//   console.log("sweet");
// });

// const runner = mocha.run();
// runner.on("pass", () => console.log("pass"));

// mocha.suite.

// it("testContext  top level", () => {});

// describe("testContext one level", () => {
//   it("one level", () => {});
// });

describe("testContext behaviour", function () {
  describe("native mocha 'this' context", function () {
    it("has no initial value at the start of the test suite", function () {
      expect(this.testValue).to.be.undefined;
    });

    it("can store a value on the context", function () {
      this.testValue = 123;
      expect(this.testValue).to.equal(123);
    });

    it("can access the stored value in another test in the same run", function () {
      expect(this.testValue).to.equal(123);
    });

    it("does not work with arrow functions", () => {
      // @ts-ignore
      expect(this.testValue).to.be.undefined;
    });
  });

  describe("singleton 'testContext' context", function () {
    it("xhas no initial value at the start of the test suite", function () {
      expect(testContext.testValue).to.be.undefined;
    });

    it("can store a value on the context", function () {
      testContext.testValue = 123;
      expect(testContext.testValue).to.equal(123);
    });

    it("can access the stored value in another test in the same run", function () {
      expect(testContext.testValue).to.equal(123);
    });

    it("works with arrow functions", () => {
      expect(testContext.testValue).to.equal(123);
    });
  });
});

describe("testContext behaviour in another suite", function () {
  describe("native mocha 'this' context", function () {
    it("has no initial value at the start of the test suite", function () {
      expect(this.testValue).to.be.undefined;
    });
  });

  describe("singleton 'testContext' context", function () {
    it("has no initial value at the start of the test suite", function () {
      console.log(testContext);
      expect(testContext.testValue).to.be.undefined;
    });
  });
});

describe("testContext behaviour in nested suite", function () {
  describe("native mocha 'this' context", function () {
    it("has no initial value at the start of the test suite", function () {
      expect(this.testValue).to.be.undefined;
    });

    it("can store a value on the context", function () {
      this.testValue = 123;
      expect(this.testValue).to.equal(123);
    });

    describe("testContext behaviour in nested suite", function () {
      it("has an initial value at the start of the nested test suite", function () {
        expect(this.testValue).to.equal(123);
      });
    });
  });

  describe("outside nested context where native mocha 'this' context was set", function () {
    it("has no initial value outside of the scope where its value was set", function () {
      expect(this.testValue).to.be.undefined;
    });
  });

  describe("singleton 'testContext' context", function () {
    it("has no initial value at the start of the test suite", function () {
      expect(testContext.testValue).to.be.undefined;
    });

    it("can store a value on the context", function () {
      testContext.testValue = 123;
      expect(testContext.testValue).to.equal(123);
    });

    describe("testContext behaviour in nested suite", function () {
      it("has an initial value at the start of the nested test suite", function () {
        expect(testContext.testValue).to.equal(123);
      });
    });
  });
});
