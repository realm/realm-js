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
import { createMockFunction } from "./mock-function";

describe("mock function", () => {
  it("remember calls", () => {
    const fn = createMockFunction();
    fn("hi");
    fn({ object: 123 });
    expect(fn.calls).deep.equals([{ args: ["hi"] }, { args: [{ object: 123 }] }]);
  });

  it("will resolve nextCall", async () => {
    const fn = createMockFunction();
    // Once
    const expected1 = expect(fn.nextCall).eventually.deep.equals({ args: ["hi"] });
    fn("hi");
    await expected1;
    // Twice
    const expected2 = expect(fn.nextCall).eventually.deep.equals({ args: ["there"] });
    fn("there");
    await expected2;
  });

  it("can expect calls", () => {
    const fn = createMockFunction(["hi", "there"]);
    expect(fn()).equals("hi");
    expect(fn()).equals("there");
    expect(() => {
      fn();
    }).throws("Did not expect to be called 3 times");
  });
});
