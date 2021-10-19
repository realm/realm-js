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

import { isDevelopmentMode } from "../environment";

describe("Environment utilities", () => {
  describe("isDevelopmentMode (node environment)", () => {
    let originalEnv: string | undefined;
    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("returns true is NODE_ENV is undefined", () => {
      process.env.NODE_ENV = undefined;
      expect(isDevelopmentMode()).to.equal(true);
    });

    it("returns true is NODE_ENV is development", () => {
      process.env.NODE_ENV = "development";
      expect(isDevelopmentMode()).to.equal(true);
    });

    it("returns false is NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      expect(isDevelopmentMode()).to.equal(false);
    });
  });
});
