////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { unwind } from "../ranges";

describe("unwind range", () => {
  it("handles an empty range set", () => {
    expect(unwind([])).deep.equals([]);
  });
  it("handles an empty single set", () => {
    expect(unwind([[0, 1]])).deep.equals([0]);
  });
  it("handles an empty multiple sets", () => {
    expect(
      unwind([
        [0, 1],
        [4, 6],
      ]),
    ).deep.equals([0, 4, 5]);
  });
});
