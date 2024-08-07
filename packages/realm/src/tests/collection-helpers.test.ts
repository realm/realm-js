////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { isPOJO } from "../collection-accessors/Dictionary";

describe("Collection helpers", () => {
  describe("isPOJO()", () => {
    it("returns true for object literal", () => {
      const object = {};
      expect(object.constructor).to.equal(Object);
      expect(isPOJO(object)).to.be.true;
    });

    it("returns true for Object constructor", () => {
      const object = new Object();
      expect(object.constructor).to.equal(Object);
      expect(isPOJO(object)).to.be.true;
    });

    it("returns true for Object without prototype", () => {
      let object = Object.assign(Object.create(null), {});
      expect(object.constructor).to.be.undefined;
      expect(Object.getPrototypeOf(object)).to.be.null;
      expect(isPOJO(object)).to.be.true;

      object = Object.create(null);
      expect(object.constructor).to.be.undefined;
      expect(Object.getPrototypeOf(object)).to.be.null;
      expect(isPOJO(object)).to.be.true;
    });

    it("returns false for user-defined class", () => {
      class CustomClass {}
      const object = new CustomClass();
      expect(object.constructor).to.equal(CustomClass);
      expect(isPOJO(object)).to.be.false;
    });

    // TS2725 compile error: "Class name cannot be 'Object' when targeting ES5 with module Node16"
    // it("returns false for user-defined class called Object", () => {
    //   class Object {}
    //   const object = new Object();
    //   expect(object.constructor).to.equal(Object);
    //   expect(isPOJO(object)).to.be.false;
    // });

    it("returns false for Arrays", () => {
      expect(isPOJO([])).to.be.false;
      expect(isPOJO(new Array(1))).to.be.false;
    });

    it("returns false for null", () => {
      expect(isPOJO(null)).to.be.false;
    });
  });
});
